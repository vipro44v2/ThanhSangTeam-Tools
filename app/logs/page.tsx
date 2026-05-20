import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { LogsList } from "./logs-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const VALID_STATUSES = ["posted", "failed", "skipped", "processing"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    pageId?: string;
    page?: string;
  }>;
};

export default async function LogsPage({ searchParams }: PageProps) {
  await requireAdminAccess();

  const params = await searchParams;
  const statusParam = params?.status ?? "all";
  const pageIdParam = params?.pageId ?? "";
  const currentPage = Math.max(1, Number(params?.page ?? 1));

  const statusFilter: ValidStatus | null = VALID_STATUSES.includes(statusParam as ValidStatus)
    ? (statusParam as ValidStatus)
    : null;

  const where = {
    status: statusFilter ? ({ equals: statusFilter } as const) : ({ in: [...VALID_STATUSES] } as const),
    ...(pageIdParam ? { page_id: pageIdParam } : {}),
  };

  const [logs, total, fbPages] = await Promise.all([
    prisma.post_jobs.findMany({
      where,
      orderBy: { scheduled_at: "desc" },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      select: {
        id: true,
        status: true,
        caption: true,
        scheduled_at: true,
        posted_at: true,
        error_message: true,
        fb_post_id: true,
        facebook_pages: { select: { id: true, page_name: true } },
        post_job_media: {
          select: { media_assets: { select: { file_url: true } } },
          orderBy: { position: "asc" as const },
          take: 1,
        },
      },
    }),
    prisma.post_jobs.count({ where }),
    prisma.facebook_pages.findMany({
      orderBy: { page_name: "asc" },
      select: { id: true, page_name: true },
    }),
  ]);

  const logItems = logs.map((l) => ({
    id: l.id,
    status: l.status as string,
    caption: l.caption,
    scheduled_at: l.scheduled_at.toISOString(),
    posted_at: l.posted_at?.toISOString() ?? null,
    error_message: l.error_message,
    fb_post_id: l.fb_post_id,
    page_name: l.facebook_pages?.page_name ?? null,
    media_url: l.post_job_media[0]?.media_assets?.file_url ?? null,
  }));

  const pageItems = fbPages.map((p) => ({ id: p.id, page_name: p.page_name }));

  return (
    <div className="min-h-full">
      <div className="border-b border-[#eaecf0] bg-white px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="text-lg font-bold text-[#101828] sm:text-xl">Posting Logs</h1>
        <p className="mt-0.5 text-sm text-[#667085]">
          History of all post attempts across your Facebook pages
        </p>
      </div>
      <div className="px-4 py-4 sm:px-8 sm:py-6">
        <Suspense>
          <LogsList
            logs={logItems}
            pages={pageItems}
            total={total}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            selectedStatus={statusParam}
            selectedPageId={pageIdParam}
          />
        </Suspense>
      </div>
    </div>
  );
}
