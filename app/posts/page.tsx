import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { PostsDashboard } from "./posts-dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string; created?: string; updated?: string }>;
};

export default async function PostsPage({ searchParams }: PageProps) {
  await requireAdminAccess();

  const params = await searchParams;

  const [pages, jobs] = await Promise.all([
    prisma.facebook_pages.findMany({
      where: { is_active: true },
      orderBy: { page_name: "asc" },
      select: { id: true, page_id: true, page_name: true, token_status: true },
    }),
    prisma.post_jobs.findMany({
      orderBy: { scheduled_at: "desc" },
      take: 300,
      select: {
        id: true,
        caption: true,
        scheduled_at: true,
        status: true,
        error_message: true,
        fb_post_id: true,
        posted_at: true,
        facebook_pages: { select: { page_name: true, page_id: true } },
        media_assets: { select: { file_url: true, mime_type: true, file_name: true } },
      },
    }),
  ]);

  const jobItems = jobs.map((j) => ({
    id: j.id,
    caption: j.caption,
    scheduled_at: j.scheduled_at.toISOString(),
    status: j.status,
    error_message: j.error_message,
    fb_post_id: j.fb_post_id,
    posted_at: j.posted_at?.toISOString() ?? null,
    page: j.facebook_pages,
    media: j.media_assets
      ? { file_url: j.media_assets.file_url, mime_type: j.media_assets.mime_type, file_name: j.media_assets.file_name }
      : null,
  }));

  const initialTab = params?.tab === "create" ? "create" : "schedule";
  const createdCount = Number(params?.created ?? 0);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#111827]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-lg border border-[#d9dee8] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#667085]">Thanh Sang Tools</div>
              <h1 className="mt-1 text-2xl font-semibold">Posts</h1>
            </div>
            <Link
              href="/facebook-pages"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
            >
              Facebook Pages
            </Link>
          </div>
        </header>

        {createdCount > 0 && (
          <div className="mb-5 rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-4 py-3 text-sm text-[#067647]">
            Scheduled {createdCount} post{createdCount === 1 ? "" : "s"} successfully.
          </div>
        )}
        {params?.updated && (
          <div className="mb-5 rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-4 py-3 text-sm text-[#067647]">
            Post updated successfully.
          </div>
        )}

        <PostsDashboard pages={pages} jobs={jobItems} initialTab={initialTab} />
      </div>
    </main>
  );
}
