import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { AutoPostingManager } from "./auto-posting-manager";

export const dynamic = "force-dynamic";

export default async function AutoPostingPage() {
  await requireAdminAccess();

  const pages = await prisma.facebook_pages.findMany({
    where: { is_active: true },
    orderBy: { page_name: "asc" },
    select: {
      id: true,
      page_name: true,
      daily_post_limit: true,
      token_status: true,
      category_id: true,
      auto_posting_rules: {
        select: {
          id: true,
          is_active: true,
          schedule_type: true,
          posts_count: true,
          start_hour: true,
          end_hour: true,
          tag_filter: true,
          captions: true,
          caption_sheet_id: true,
        },
      },
    },
  });

  const categories = await prisma.page_categories.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  const captionSheets = await prisma.caption_sheets.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, captions: true },
  });

  const sheetOptions = captionSheets.map((s) => ({ id: s.id, name: s.name, count: s.captions.length }));

  const knownTags = await prisma.media_assets
    .findMany({ where: { status: "available" }, select: { tags: true } })
    .then((assets) => [...new Set(assets.flatMap((a) => a.tags))].sort());

  const mediaCount = await prisma.media_assets.count({ where: { status: "available" } });

  const pageItems = pages.map((p) => ({
    id: p.id,
    page_name: p.page_name,
    daily_post_limit: p.daily_post_limit,
    token_status: p.token_status as string,
    category_id: p.category_id,
    rule: p.auto_posting_rules
      ? {
          id: p.auto_posting_rules.id,
          is_active: p.auto_posting_rules.is_active,
          schedule_type: p.auto_posting_rules.schedule_type,
          posts_count: p.auto_posting_rules.posts_count,
          start_hour: p.auto_posting_rules.start_hour,
          end_hour: p.auto_posting_rules.end_hour,
          tag_filter: p.auto_posting_rules.tag_filter,
          captions: p.auto_posting_rules.captions,
          caption_sheet_id: p.auto_posting_rules.caption_sheet_id,
        }
      : null,
  }));

  const activeRules = pageItems.filter((p) => p.rule?.is_active).length;

  return (
    <div className="min-h-full">
      <div className="border-b border-[#eaecf0] bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-start">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#101828] sm:text-xl">Auto Posting</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-[#667085]">
              Configure automatic post schedules per page — the system picks media and captions for you.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            <Link
              href="/auto-posting/captions"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc] sm:w-auto"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              Caption Sheets ({sheetOptions.length})
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-[#667085] sm:flex lg:justify-end">
            <div className="rounded-md border border-[#eaecf0] bg-white px-3 py-2 text-center sm:min-w-24">
              <p className="text-lg font-bold text-[#101828]">{activeRules}</p>
              <p className="text-xs">Active rules</p>
            </div>
            <div className="rounded-md border border-[#eaecf0] bg-white px-3 py-2 text-center sm:min-w-24">
              <p className="text-lg font-bold text-[#101828]">{mediaCount}</p>
              <p className="text-xs">Available media</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {pages.length === 0 ? (
          <div className="rounded-lg border border-[#d9dee8] bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-base font-medium text-[#101828]">No active pages</p>
            <p className="mt-1 text-sm text-[#667085]">
              Connect a Facebook page first to set up auto posting.
            </p>
          </div>
        ) : (
          <AutoPostingManager pages={pageItems} knownTags={knownTags} sheetOptions={sheetOptions} categories={categories} />
        )}
      </div>
    </div>
  );
}
