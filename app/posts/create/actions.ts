"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { parseScheduleDate } from "@/lib/posts/schedule";
import { computeNextQueueSlot } from "@/lib/posts/queue";

export async function createPostJobs(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  await requireAdminAccess();

  const caption = (formData.get("caption") as string)?.trim() || null;
  const mediaAssetIds = formData.getAll("mediaAssetIds") as string[];
  const pageIds = formData.getAll("pageIds") as string[];
  const scheduleMode = formData.get("scheduleMode") as string;
  const sharedSchedule = formData.get("sharedSchedule") as string;
  const timezoneOffset = formData.get("timezoneOffset")?.toString() ?? null;

  if (!pageIds.length) return { error: "Select at least one page." };
  if (!caption && !mediaAssetIds.length) return { error: "Add a caption or media." };

  const now = new Date();
  const jobs: Array<{ pageId: string; scheduledAt: Date }> = [];

  if (scheduleMode === "queue") {
    const [pagesData, existingJobs] = await Promise.all([
      prisma.facebook_pages.findMany({
        where: { id: { in: pageIds } },
        select: { id: true, daily_post_limit: true },
      }),
      prisma.post_jobs.findMany({
        where: {
          page_id: { in: pageIds },
          status: { in: ["pending", "processing"] },
          scheduled_at: { gt: now },
        },
        select: { page_id: true, scheduled_at: true },
      }),
    ]);

    const pageMap = new Map(pagesData.map((p) => [p.id, p]));
    const jobsByPage = new Map<string, Date[]>();
    existingJobs.forEach((j) => {
      const list = jobsByPage.get(j.page_id) ?? [];
      list.push(j.scheduled_at);
      jobsByPage.set(j.page_id, list);
    });

    for (const pageId of pageIds) {
      const page = pageMap.get(pageId);
      if (!page) return { error: "Page not found." };
      try {
        const scheduledAt = computeNextQueueSlot(
          page.daily_post_limit,
          jobsByPage.get(pageId) ?? [],
          now,
        );
        jobs.push({ pageId, scheduledAt });
      } catch {
        return { error: "No available slot for one or more pages. Try increasing the daily limit." };
      }
    }
  } else {
    const perPageMode = scheduleMode === "perPage";
    for (const pageId of pageIds) {
      const raw = perPageMode
        ? (formData.get(`schedule_${pageId}`) as string)
        : sharedSchedule;
      if (!raw) return { error: "Missing schedule for one or more pages." };
      const scheduledAt = parseScheduleDate(raw, timezoneOffset);
      if (!scheduledAt) return { error: "Invalid date/time." };
      if (scheduledAt <= now) return { error: "Schedule time must be in the future." };
      jobs.push({ pageId, scheduledAt });
    }
  }

  await Promise.all(
    jobs.map(async ({ pageId, scheduledAt }) => {
      const jobId = randomUUID();
      await prisma.post_jobs.create({
        data: {
          id: jobId,
          page_id: pageId,
          caption,
          scheduled_at: scheduledAt,
          status: "pending",
          post_job_media: mediaAssetIds.length
            ? {
                create: mediaAssetIds.map((assetId, position) => ({
                  id: randomUUID(),
                  media_asset_id: assetId,
                  position,
                })),
              }
            : undefined,
        },
      });
    }),
  );

  redirect(`/posts?created=${pageIds.length}`);
}
