import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { addDays, getVietnamDateParts, vietnamWallTimeToInstant } from "@/lib/time";

const LOOKAHEAD_DAYS = 14;
const MIN_FUTURE_MS = 5 * 60_000;
const STEP_MINUTES = 15;
const AUTO_POSTING_LOCK_CLASS = 20260519;
const AUTO_POSTING_LOCK_KEY = 1000;
type DbClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$extends" | "$on" | "$transaction" | "$use"
>;

export async function runAutoPosting() {
  return withAutoPostingLock(async (db) => {
    const rules = await db.auto_posting_rules.findMany({
      where: { is_active: true },
      include: {
        facebook_pages: { select: { id: true, page_name: true, daily_post_limit: true } },
        caption_sheets: { select: { captions: true } },
      },
    });

    const results: Array<{ page: string; generated: number; skipped: string | null }> = [];

    for (const rule of rules) {
      const result = await generateForRule(db, rule);
      results.push(result);
    }

    return { rules: rules.length, results };
  }, { rules: 0, results: [] });
}

export async function generateForRuleId(ruleId: string) {
  return withAutoPostingLock(async (db) => {
    const rule = await db.auto_posting_rules.findUnique({
      where: { id: ruleId },
      include: {
        facebook_pages: { select: { id: true, page_name: true, daily_post_limit: true } },
        caption_sheets: { select: { captions: true } },
      },
    });
    if (!rule) return { page: "unknown", generated: 0, skipped: "Rule not found" };
    return generateForRule(db, rule);
  }, { page: "unknown", generated: 0, skipped: "Auto-posting is already running" });
}

type RuleWithPage = Awaited<ReturnType<typeof prisma.auto_posting_rules.findMany>>[number] & {
  facebook_pages: { id: string; page_name: string; daily_post_limit: number };
  caption_sheets: { captions: string[] } | null;
};

async function generateForRule(db: DbClient, rule: RuleWithPage) {
  const now = new Date();
  const windowEnd = addDays(now, LOOKAHEAD_DAYS);

  const periodDays = rule.schedule_type === "weekly" ? 7 : rule.schedule_type === "monthly" ? 30 : 1;
  const quotaStart = addDays(now, -periodDays);
  const targetCount = Math.ceil((rule.posts_count * LOOKAHEAD_DAYS) / periodDays);

  const existingJobs = await db.post_jobs.findMany({
    where: {
      page_id: rule.page_id,
      status: { in: ["pending", "processing", "posted"] },
      scheduled_at: { gte: quotaStart, lte: windowEnd },
    },
    select: { scheduled_at: true, caption: true, status: true },
  });

  const deficit = targetCount - existingJobs.length;
  if (deficit <= 0) {
    return { page: rule.facebook_pages.page_name, generated: 0, skipped: null };
  }

  if (rule.facebook_pages.daily_post_limit <= 0) {
    return { page: rule.facebook_pages.page_name, generated: 0, skipped: "Daily limit is zero" };
  }

  const existingTimes = existingJobs
    .filter((j) => j.status === "pending" || j.status === "processing")
    .map((j) => j.scheduled_at);
  const effectivePPD = Math.min(
    rule.posts_count / periodDays,
    rule.facebook_pages.daily_post_limit,
  );

  // Build a non-repeating caption rotation: unused captions first, then cycle full pool
  const captionPool = (rule.caption_sheets?.captions.length ? rule.caption_sheets.captions : rule.captions)
    .filter((c) => c.trim().length > 0);
  const usedCaptions = new Set(existingJobs.map((j) => j.caption).filter(Boolean) as string[]);
  const captionQueue = buildCaptionQueue(captionPool, usedCaptions, deficit);

  let generated = 0;

  for (let i = 0; i < deficit; i++) {
    const slot = computeNextAutoSlot(effectivePPD, existingTimes, now, windowEnd, rule.start_hour, rule.end_hour);
    if (!slot) break;

    const media = await pickMedia(db, rule.page_id, rule.tag_filter);
    if (!media) break; // No media available

    const caption = captionQueue[i] ?? null;

    await db.post_jobs.create({
      data: {
        id: randomUUID(),
        page_id: rule.page_id,
        caption,
        scheduled_at: slot,
        status: "pending",
        post_job_media: {
          create: [{ id: randomUUID(), media_asset_id: media.id, position: 0 }],
        },
      },
    });

    existingTimes.push(slot);
    generated++;
  }

  return { page: rule.facebook_pages.page_name, generated, skipped: null };
}

// ---------------------------------------------------------------------------
// Slot calculator
// ---------------------------------------------------------------------------

function computeNextAutoSlot(
  postsPerDay: number,
  existingDates: Date[],
  now: Date,
  maxDate: Date,
  startHour: number,
  endHour: number,
): Date | null {
  const windowMinutes = (endHour - startHour) * 60;
  // Gap between posts: at least 30 min, but spread proportionally across the window
  const gapMinutes = Math.max(30, Math.round(windowMinutes / Math.max(postsPerDay, 0.1)));

  // Start at the next STEP boundary in Vietnam local time.
  let parts = getVietnamDateParts(now);
  const snapMins = Math.ceil(parts.minute / STEP_MINUTES) * STEP_MINUTES + STEP_MINUTES;
  let candidate = vietnamWallTimeToInstant(parts.year, parts.month, parts.day, parts.hour, snapMins);

  for (let iter = 0; iter < 20_000; iter++) {
    if (candidate > maxDate) return null;

    parts = getVietnamDateParts(candidate);
    const h = parts.hour;

    if (h < startHour) {
      candidate = vietnamWallTimeToInstant(parts.year, parts.month, parts.day, startHour, 0);
      continue;
    }
    if (h >= endHour) {
      const tomorrow = getVietnamDateParts(addDays(candidate, 1));
      candidate = vietnamWallTimeToInstant(tomorrow.year, tomorrow.month, tomorrow.day, startHour, 0);
      continue;
    }
    if (candidate.getTime() <= now.getTime() + MIN_FUTURE_MS) {
      candidate = new Date(candidate.getTime() + STEP_MINUTES * 60_000);
      continue;
    }

    const tooClose = existingDates.some(
      (d) => Math.abs(d.getTime() - candidate.getTime()) < gapMinutes * 60_000,
    );

    if (!tooClose) return candidate;

    // Jump past the nearest future conflict
    const nearest = existingDates
      .filter((d) => d.getTime() > candidate.getTime())
      .sort((a, b) => a.getTime() - b.getTime())[0];

    candidate = new Date(
      (nearest ?? candidate).getTime() + gapMinutes * 60_000,
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Media picker
// ---------------------------------------------------------------------------

async function pickMedia(db: DbClient, pageId: string, tagFilter: string[]) {
  const tagWhere = tagFilter.length > 0 ? { tags: { hasSome: tagFilter } } : {};

  // Media already queued for this page (avoid scheduling the same image twice in pending jobs)
  const scheduled = await db.post_job_media.findMany({
    where: { post_jobs: { page_id: pageId, status: { in: ["pending", "processing"] } } },
    select: { media_asset_id: true },
  });
  const scheduledIds = scheduled.map((m) => m.media_asset_id);

  // First try: available media NOT already scheduled
  const pool = await db.media_assets.findMany({
    where: { status: "available", ...tagWhere, NOT: { id: { in: scheduledIds } } },
    select: { id: true },
  });

  if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];

  // Fallback: any available media (all are already scheduled, cycle through them)
  const fallback = await db.media_assets.findMany({
    where: { status: "available", ...tagWhere },
    select: { id: true },
  });

  return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
}

// ---------------------------------------------------------------------------
// Caption rotation — use each caption once before repeating
// ---------------------------------------------------------------------------

function buildCaptionQueue(pool: string[], alreadyUsed: Set<string>, needed: number): Array<string | null> {
  if (pool.length === 0) return Array(needed).fill(null);

  // Captions not yet in pending jobs — use these first (shuffled)
  const unused = shuffle(pool.filter((c) => !alreadyUsed.has(c)));
  // Full pool for cycling once unused are exhausted
  const full = shuffle([...pool]);

  return Array.from({ length: needed }, (_, i) => {
    if (i < unused.length) return unused[i];
    return full[(i - unused.length) % full.length];
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function withAutoPostingLock<T>(run: (db: DbClient) => Promise<T>, fallback: T): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${AUTO_POSTING_LOCK_CLASS}, ${AUTO_POSTING_LOCK_KEY}) AS locked
    `;
    if (!rows[0]?.locked) return fallback;

    return run(tx as DbClient);
  }, { maxWait: 5_000, timeout: 60_000 });
}
