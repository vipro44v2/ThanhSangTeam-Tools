import { prisma } from "@/lib/prisma";
import { decryptFacebookToken, postToFacebookPage } from "@/lib/facebook";

type PublishPostJobResult =
  | { status: "posted"; id: string; fbPostId: string }
  | { status: "failed"; id: string; error: string }
  | { status: "skipped"; id: string; reason: string };

export async function publishPostJob(id: string): Promise<PublishPostJobResult> {
  const claimed = await prisma.post_jobs.updateMany({
    where: {
      id,
      status: "pending",
    },
    data: {
      status: "processing",
      error_message: null,
    },
  });

  if (claimed.count === 0) {
    return { status: "skipped", id, reason: "Post is no longer pending." };
  }

  const job = await prisma.post_jobs.findUnique({
    where: { id },
    select: {
      id: true,
      caption: true,
      facebook_pages: {
        select: {
          page_id: true,
          page_access_token_encrypted: true,
        },
      },
      post_job_media: {
        select: {
          position: true,
          media_assets: { select: { file_url: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!job?.facebook_pages) {
    const error = "Page not found.";
    await markPostJobFailed(id, error);
    return { status: "failed", id, error };
  }

  try {
    const accessToken = decryptFacebookToken(
      job.facebook_pages.page_access_token_encrypted,
    );
    const photoUrls = job.post_job_media
      .map((m) => resolvePublicMediaUrl(m.media_assets.file_url))
      .filter((u): u is string => u !== undefined);
    const fbPostId = await postToFacebookPage({
      pageId: job.facebook_pages.page_id,
      accessToken,
      message: job.caption ?? undefined,
      photoUrls,
    });

    await prisma.post_jobs.update({
      where: { id },
      data: {
        status: "posted",
        fb_post_id: fbPostId,
        posted_at: new Date(),
      },
    });

    return { status: "posted", id, fbPostId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publishing failed.";
    await markPostJobFailed(id, message);
    return { status: "failed", id, error: message };
  }
}

export async function publishDuePostJobs(limit = 10) {
  const now = new Date();
  const dueJobs = await prisma.post_jobs.findMany({
    where: {
      status: "pending",
      scheduled_at: {
        lte: now,
      },
    },
    orderBy: {
      scheduled_at: "asc",
    },
    select: {
      id: true,
      scheduled_at: true,
    },
    take: limit,
  });

  const results: PublishPostJobResult[] = [];

  for (const job of dueJobs) {
    results.push(await publishPostJob(job.id));
  }

  return {
    checkedAt: new Date().toISOString(),
    due: dueJobs.length,
    results,
  };
}

function resolvePublicMediaUrl(fileUrl: string | null | undefined): string | undefined {
  if (!fileUrl) {
    return undefined;
  }

  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return new URL(fileUrl, `${base}/`).toString();
}

async function markPostJobFailed(id: string, errorMessage: string) {
  await prisma.post_jobs.update({
    where: { id },
    data: {
      status: "failed",
      error_message: errorMessage,
    },
  });
}
