"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";

export async function updatePostJob(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  await requireAdminAccess();

  const id = formData.get("id") as string;
  const caption = formData.get("caption")?.toString().trim() || null;
  const newMediaAssetId = formData.get("mediaAssetId")?.toString() || null;
  const removeMedia = formData.get("removeMedia") === "true";
  const schedule = formData.get("schedule") as string;

  if (!caption && !newMediaAssetId && removeMedia) {
    return { error: "Add a caption or media." };
  }

  const scheduledAt = new Date(schedule);
  if (isNaN(scheduledAt.getTime())) return { error: "Invalid date/time." };
  if (scheduledAt <= new Date()) return { error: "Schedule time must be in the future." };

  const job = await prisma.post_jobs.findUnique({
    where: { id },
    select: { status: true, media_asset_id: true },
  });
  if (!job) return { error: "Post not found." };
  if (job.status !== "pending") return { error: "Only pending posts can be edited." };

  const mediaUpdate = removeMedia
    ? { media_asset_id: null }
    : newMediaAssetId
      ? { media_asset_id: newMediaAssetId }
      : {};

  await prisma.post_jobs.update({
    where: { id },
    data: { caption, scheduled_at: scheduledAt, ...mediaUpdate },
  });

  redirect("/posts?updated=true");
}
