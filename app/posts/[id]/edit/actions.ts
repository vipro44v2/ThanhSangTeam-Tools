"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { parseScheduleDate } from "@/lib/posts/schedule";

export async function updatePostJob(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  await requireAdminAccess();

  const id = formData.get("id") as string;
  const caption = formData.get("caption")?.toString().trim() || null;
  const newMediaAssetId = formData.get("mediaAssetId")?.toString() || null;
  const removeMedia = formData.get("removeMedia") === "true";
  const schedule = formData.get("schedule") as string;
  const timezoneOffset = formData.get("timezoneOffset")?.toString() ?? null;

  if (!caption && !newMediaAssetId && removeMedia) {
    return { error: "Add a caption or media." };
  }

  const scheduledAt = parseScheduleDate(schedule, timezoneOffset);
  if (!scheduledAt) return { error: "Invalid date/time." };
  if (scheduledAt <= new Date()) return { error: "Schedule time must be in the future." };

  const job = await prisma.post_jobs.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!job) return { error: "Post not found." };
  if (job.status !== "pending") return { error: "Only pending posts can be edited." };

  await prisma.post_jobs.update({
    where: { id },
    data: { caption, scheduled_at: scheduledAt },
  });

  if (removeMedia && !newMediaAssetId) {
    await prisma.post_job_media.deleteMany({ where: { post_job_id: id } });
  } else if (newMediaAssetId) {
    await prisma.post_job_media.deleteMany({ where: { post_job_id: id } });
    await prisma.post_job_media.create({
      data: { id: randomUUID(), post_job_id: id, media_asset_id: newMediaAssetId, position: 0 },
    });
  }

  redirect("/posts?updated=true");
}
