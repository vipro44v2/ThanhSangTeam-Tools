"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { publishPostJob } from "@/lib/posts/publisher";

export async function bulkDeletePostJobs(formData: FormData) {
  await requireAdminAccess();

  const raw = formData.get("ids") as string;
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);

  await prisma.post_jobs.deleteMany({
    where: { id: { in: ids }, status: { in: ["pending", "failed", "skipped"] } },
  });

  revalidatePath("/posts");
}

export async function bulkPublishPostJobs(
  formData: FormData,
): Promise<{ published: number; failed: number } | undefined> {
  await requireAdminAccess();

  const raw = formData.get("ids") as string;
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);

  let published = 0;
  let failed = 0;

  for (const id of ids) {
    const result = await publishPostJob(id);
    if (result.status === "posted") published++;
    else if (result.status === "failed") failed++;
  }

  revalidatePath("/posts");
  return { published, failed };
}

export async function deletePostJob(formData: FormData) {
  await requireAdminAccess();

  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.post_jobs.delete({ where: { id } });
  revalidatePath("/posts");
}

export async function postJobNow(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  await requireAdminAccess();

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing job ID." };

  const job = await prisma.post_jobs.findUnique({
    where: { id },
    select: {
      id: true,
      caption: true,
      status: true,
      facebook_pages: {
        select: {
          page_id: true,
          page_access_token_encrypted: true,
        },
      },
      post_job_media: { select: { media_assets: { select: { file_url: true } } } },
    },
  });

  if (!job) return { error: "Post not found." };
  if (job.status !== "pending") return { error: "Only pending posts can be published." };
  if (!job.facebook_pages) return { error: "Page not found." };

  const result = await publishPostJob(id);

  revalidatePath("/posts");

  if (result.status === "failed") {
    return { error: result.error };
  }

  if (result.status === "skipped") {
    return { error: result.reason };
  }
}
