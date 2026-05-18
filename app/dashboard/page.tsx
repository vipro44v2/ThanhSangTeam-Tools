import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { StatsRow } from "./stats-row";
import { PagesPanel } from "./pages-panel";
import { UploadPanel } from "./upload-panel";
import { MediaPanel } from "./media-panel";
import { ScheduledPanel } from "./scheduled-panel";
import { LogsPanel } from "./logs-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdminAccess();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  const [
    totalPages,
    activeTokens,
    mediaCount,
    postedToday,
    failedPosts,
    pages,
    upcomingPosts,
    recentLogs,
    recentMedia,
  ] = await Promise.all([
    prisma.facebook_pages.count(),
    prisma.facebook_pages.count({ where: { token_status: "active", is_active: true } }),
    prisma.media_assets.count({ where: { status: "available" } }),
    prisma.post_jobs.count({ where: { status: "posted", posted_at: { gte: today } } }),
    prisma.post_jobs.count({ where: { status: "failed" } }),

    prisma.facebook_pages.findMany({
      orderBy: { page_name: "asc" },
      take: 8,
      select: {
        id: true,
        page_id: true,
        page_name: true,
        is_active: true,
        token_status: true,
        daily_post_limit: true,
        post_jobs: {
          take: 1,
          orderBy: { posted_at: "desc" },
          where: { status: "posted" },
          select: { posted_at: true },
        },
        _count: {
          select: {
            post_jobs: { where: { status: "posted", posted_at: { gte: today } } },
          },
        },
      },
    }),

    prisma.post_jobs.findMany({
      where: { status: "pending", scheduled_at: { gte: now } },
      orderBy: { scheduled_at: "asc" },
      take: 6,
      select: {
        id: true,
        scheduled_at: true,
        caption: true,
        facebook_pages: { select: { page_name: true, page_id: true } },
        media_assets: { select: { file_url: true, mime_type: true, tags: true } },
      },
    }),

    prisma.post_jobs.findMany({
      where: { status: { in: ["posted", "failed", "skipped"] } },
      orderBy: { created_at: "desc" },
      take: 6,
      select: {
        id: true,
        status: true,
        error_message: true,
        posted_at: true,
        created_at: true,
        facebook_pages: { select: { page_name: true } },
        media_assets: { select: { file_url: true } },
      },
    }),

    prisma.media_assets.findMany({
      where: { status: "available" },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        file_url: true,
        file_name: true,
        mime_type: true,
        tags: true,
        created_at: true,
        expires_at: true,
        _count: { select: { page_media_usage: true } },
      },
    }),
  ]);

  const pageItems = pages.map((p) => ({
    id: p.id,
    page_id: p.page_id,
    page_name: p.page_name,
    is_active: p.is_active,
    token_status: p.token_status,
    daily_post_limit: p.daily_post_limit,
    last_post: p.post_jobs[0]?.posted_at?.toISOString() ?? null,
    posts_today: p._count.post_jobs,
  }));

  const mediaItems = recentMedia.map((m) => ({
    id: m.id,
    file_url: m.file_url,
    file_name: m.file_name,
    mime_type: m.mime_type,
    tags: m.tags,
    created_at: m.created_at.toISOString(),
    expires_at: m.expires_at.toISOString(),
    used_count: m._count.page_media_usage,
  }));

  const logItems = recentLogs.map((l) => ({
    id: l.id,
    status: l.status,
    error_message: l.error_message,
    time: (l.posted_at ?? l.created_at).toISOString(),
    page_name: l.facebook_pages?.page_name ?? null,
    media_url: l.media_assets?.file_url ?? null,
  }));

  const scheduleItems = upcomingPosts.map((p) => ({
    id: p.id,
    scheduled_at: p.scheduled_at.toISOString(),
    caption: p.caption,
    page_name: p.facebook_pages?.page_name ?? null,
    page_id: p.facebook_pages?.page_id ?? null,
    media_url: p.media_assets?.file_url ?? null,
    tags: p.media_assets?.tags ?? [],
  }));

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-[#eaecf0] bg-white px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#101828]">Facebook Page Manager</h1>
            <p className="mt-0.5 text-sm text-[#667085]">
              Manage pages, media library, and auto posting schedules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/facebook-pages"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-3.5 text-sm font-medium text-[#344054] shadow-sm hover:bg-[#f9fafb]"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Facebook Page
            </Link>
            <Link
              href="/posts?tab=create"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-3.5 text-sm font-medium text-[#344054] shadow-sm hover:bg-[#f9fafb]"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Media
            </Link>
            <Link
              href="/posts?tab=create"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1877f2] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1668d7]"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Create Schedule
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Stats */}
        <StatsRow
          totalPages={totalPages}
          activeTokens={activeTokens}
          mediaCount={mediaCount}
          postedToday={postedToday}
          failedPosts={failedPosts}
        />

        {/* Main 3-column grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr_320px]">
          {/* Left — Facebook Pages */}
          <PagesPanel pages={pageItems} />

          {/* Center — Upload + Media Library */}
          <div className="flex flex-col gap-6">
            <UploadPanel />
            <MediaPanel media={mediaItems} />
          </div>

          {/* Right — Scheduled + Logs */}
          <div className="flex flex-col gap-6">
            <ScheduledPanel posts={scheduleItems} />
            <LogsPanel logs={logItems} />
          </div>
        </div>
      </div>
    </div>
  );
}
