"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { generateForRuleId } from "@/lib/auto-posting/generator";

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function intBetween(v: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number(str(v));
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export async function upsertAutoPostingRule(formData: FormData) {
  await requireAdminAccess();

  const pageId = str(formData.get("pageId"));
  if (!pageId) return { error: "Missing page." };

  const scheduleType = str(formData.get("scheduleType"));
  if (!["daily", "weekly", "monthly"].includes(scheduleType)) return { error: "Invalid schedule type." };

  const postsCount = intBetween(formData.get("postsCount"), 1, 30, 1);
  const startHour = intBetween(formData.get("startHour"), 0, 23, 8);
  const endHour = intBetween(formData.get("endHour"), 1, 24, 22);

  if (endHour <= startHour) return { error: "End hour must be after start hour." };

  const tagFilter = str(formData.get("tagFilter"))
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const captions = str(formData.get("captions"))
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  const captionSheetId = str(formData.get("captionSheetId")) || null;

  const now = new Date();

  const existing = await prisma.auto_posting_rules.findUnique({ where: { page_id: pageId } });

  if (existing) {
    await prisma.auto_posting_rules.update({
      where: { page_id: pageId },
      data: { schedule_type: scheduleType, posts_count: postsCount, start_hour: startHour, end_hour: endHour, tag_filter: tagFilter, captions, caption_sheet_id: captionSheetId, updated_at: now },
    });
  } else {
    await prisma.auto_posting_rules.create({
      data: { id: randomUUID(), page_id: pageId, is_active: true, schedule_type: scheduleType, posts_count: postsCount, start_hour: startHour, end_hour: endHour, tag_filter: tagFilter, captions, caption_sheet_id: captionSheetId, updated_at: now },
    });
  }

  revalidatePath("/auto-posting");
  return { error: null };
}

export async function toggleAutoPostingRule(formData: FormData) {
  await requireAdminAccess();

  const pageId = str(formData.get("pageId"));
  const isActive = str(formData.get("isActive")) === "true";

  await prisma.auto_posting_rules.update({
    where: { page_id: pageId },
    data: { is_active: isActive, updated_at: new Date() },
  });

  revalidatePath("/auto-posting");
}

export async function deleteAutoPostingRule(formData: FormData) {
  await requireAdminAccess();

  const pageId = str(formData.get("pageId"));
  await prisma.auto_posting_rules.deleteMany({ where: { page_id: pageId } });

  revalidatePath("/auto-posting");
}


export async function bulkAssignPageCategory(formData: FormData) {
  await requireAdminAccess();

  const raw = str(formData.get("pageIds"));
  const categoryId = str(formData.get("categoryId")) || null;
  if (!raw) return;

  const pageIds: string[] = JSON.parse(raw);
  await prisma.facebook_pages.updateMany({
    where: { id: { in: pageIds } },
    data: { category_id: categoryId },
  });

  revalidatePath("/auto-posting");
}

export async function bulkUpsertAutoPostingRules(formData: FormData) {
  await requireAdminAccess();

  const raw = str(formData.get("pageIds"));
  if (!raw) return { error: "No pages selected." };
  const pageIds: string[] = JSON.parse(raw);
  if (!pageIds.length) return { error: "No pages selected." };

  const scheduleType = str(formData.get("scheduleType"));
  if (!["daily", "weekly", "monthly"].includes(scheduleType)) return { error: "Invalid schedule type." };

  const postsCount = intBetween(formData.get("postsCount"), 1, 30, 1);
  const startHour = intBetween(formData.get("startHour"), 0, 23, 8);
  const endHour = intBetween(formData.get("endHour"), 1, 24, 22);
  if (endHour <= startHour) return { error: "End hour must be after start hour." };

  const tagFilter = str(formData.get("tagFilter")).split(",").map((t) => t.trim()).filter(Boolean);
  const captions = str(formData.get("captions")).split("\n").map((c) => c.trim()).filter(Boolean);
  const captionSheetId = str(formData.get("captionSheetId")) || null;
  const now = new Date();

  for (const pageId of pageIds) {
    const existing = await prisma.auto_posting_rules.findUnique({ where: { page_id: pageId } });
    if (existing) {
      await prisma.auto_posting_rules.update({
        where: { page_id: pageId },
        data: { schedule_type: scheduleType, posts_count: postsCount, start_hour: startHour, end_hour: endHour, tag_filter: tagFilter, captions, caption_sheet_id: captionSheetId, updated_at: now },
      });
    } else {
      await prisma.auto_posting_rules.create({
        data: { id: randomUUID(), page_id: pageId, is_active: true, schedule_type: scheduleType, posts_count: postsCount, start_hour: startHour, end_hour: endHour, tag_filter: tagFilter, captions, caption_sheet_id: captionSheetId, updated_at: now },
      });
    }
  }

  revalidatePath("/auto-posting");
  return { error: null, count: pageIds.length };
}

export async function deleteCaptionSheet(formData: FormData) {
  await requireAdminAccess();

  const id = str(formData.get("id"));
  await prisma.caption_sheets.deleteMany({ where: { id } });
  revalidatePath("/auto-posting");
}

export async function linkCaptionSheet(formData: FormData) {
  await requireAdminAccess();

  const pageId = str(formData.get("pageId"));
  const sheetId = str(formData.get("sheetId")) || null;

  await prisma.auto_posting_rules.updateMany({
    where: { page_id: pageId },
    data: { caption_sheet_id: sheetId, updated_at: new Date() },
  });

  revalidatePath("/auto-posting");
}

export async function generateNow(formData: FormData) {
  await requireAdminAccess();

  const ruleId = str(formData.get("ruleId"));
  if (!ruleId) return { error: "Missing rule ID." };

  const result = await generateForRuleId(ruleId);
  revalidatePath("/posts");
  revalidatePath("/auto-posting");
  return { error: null, generated: result.generated };
}
