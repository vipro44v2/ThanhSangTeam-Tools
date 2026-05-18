"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";

export async function createPostJobs(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  await requireAdminAccess();

  const caption = (formData.get("caption") as string)?.trim() || null;
  const mediaAssetId = (formData.get("mediaAssetId") as string) || null;
  const pageIds = formData.getAll("pageIds") as string[];
  const perPageMode = formData.get("perPageMode") === "true";
  const sharedSchedule = formData.get("sharedSchedule") as string;

  if (!pageIds.length) return { error: "Select at least one page." };
  if (!caption && !mediaAssetId) return { error: "Add a caption or media." };

  const now = new Date();
  const jobs: Array<{ pageId: string; scheduledAt: Date }> = [];

  for (const pageId of pageIds) {
    const raw = perPageMode
      ? (formData.get(`schedule_${pageId}`) as string)
      : sharedSchedule;

    if (!raw) return { error: "Missing schedule for one or more pages." };

    const scheduledAt = new Date(raw);
    if (isNaN(scheduledAt.getTime())) return { error: "Invalid date/time." };
    if (scheduledAt <= now) return { error: "Schedule time must be in the future." };

    jobs.push({ pageId, scheduledAt });
  }

  await Promise.all(
    jobs.map(({ pageId, scheduledAt }) =>
      prisma.post_jobs.create({
        data: {
          id: randomUUID(),
          page_id: pageId,
          media_asset_id: mediaAssetId,
          caption,
          scheduled_at: scheduledAt,
          status: "pending",
        },
      }),
    ),
  );

  redirect(`/posts?created=${pageIds.length}`);
}
