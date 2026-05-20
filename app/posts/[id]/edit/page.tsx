import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAccess();

  const { id } = await params;

  const job = await prisma.post_jobs.findUnique({
    where: { id },
    select: {
      id: true,
      caption: true,
      scheduled_at: true,
      status: true,
      facebook_pages: { select: { page_name: true, page_id: true } },
      post_job_media: {
        select: { media_assets: { select: { id: true, file_url: true, mime_type: true, file_name: true } } },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });

  if (!job) notFound();
  if (job.status !== "pending") redirect("/posts");

  const firstMedia = job.post_job_media[0]?.media_assets ?? null;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#111827]">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between rounded-lg border border-[#d9dee8] bg-white px-5 py-4 shadow-sm">
          <div>
            <div className="text-sm font-medium text-[#667085]">
              {job.facebook_pages?.page_name ?? "Unknown page"}
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Edit Scheduled Post</h1>
          </div>
          <Link
            href="/posts"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
          >
            ← Back
          </Link>
        </header>

        <EditForm
          jobId={job.id}
          initialCaption={job.caption ?? ""}
          initialScheduledAt={job.scheduled_at.toISOString()}
          initialMedia={
            firstMedia
              ? { id: firstMedia.id, url: firstMedia.file_url, name: firstMedia.file_name, mime_type: firstMedia.mime_type }
              : null
          }
        />
      </div>
    </main>
  );
}
