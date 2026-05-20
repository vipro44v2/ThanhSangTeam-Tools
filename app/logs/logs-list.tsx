"use client";

import { useRouter, useSearchParams } from "next/navigation";

type LogItem = {
  id: string;
  status: string;
  caption: string | null;
  scheduled_at: string;
  posted_at: string | null;
  error_message: string | null;
  fb_post_id: string | null;
  page_name: string | null;
  media_url: string | null;
};

type PageItem = {
  id: string;
  page_name: string;
};

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Posted", value: "posted" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
  { label: "Processing", value: "processing" },
] as const;

function statusBadge(status: string) {
  switch (status) {
    case "posted":
      return "bg-[#ecfdf3] text-[#067647]";
    case "failed":
      return "bg-[#fff1f1] text-[#b42318]";
    case "skipped":
      return "bg-[#f2f4f7] text-[#475467]";
    case "processing":
      return "bg-[#eff6ff] text-[#175cd3]";
    default:
      return "bg-[#f2f4f7] text-[#475467]";
  }
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function LogsList({
  logs,
  pages,
  total,
  currentPage,
  pageSize,
  selectedStatus,
  selectedPageId,
}: {
  logs: LogItem[];
  pages: PageItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  selectedStatus: string;
  selectedPageId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val && val !== "all" && val !== "") next.set(key, val);
      else next.delete(key);
    }
    router.push(`/logs?${next.toString()}`);
  }

  function setStatus(value: string) {
    navigate({ status: value, page: "" });
  }

  function setPageFilter(value: string) {
    navigate({ pageId: value, page: "" });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#d9dee8] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => {
            const active = selectedStatus === tab.value || (tab.value === "all" && !STATUS_TABS.slice(1).map((t) => t.value).includes(selectedStatus as never));
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={
                  active
                    ? "rounded-md bg-[#e8f1ff] px-3 py-1.5 text-sm font-medium text-[#175cd3]"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-[#667085] hover:bg-[#f2f4f7]"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <select
          value={selectedPageId}
          onChange={(e) => setPageFilter(e.target.value)}
          className="h-9 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 sm:w-52"
        >
          <option value="">All pages</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.page_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        {logs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-[#101828]">No logs found</p>
            <p className="mt-1 text-sm text-[#667085]">
              Posts will appear here once they have been processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Media</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Page</th>
                  <th className="px-4 py-3 font-semibold">Caption</th>
                  <th className="px-4 py-3 font-semibold">Scheduled</th>
                  <th className="px-4 py-3 font-semibold">Published</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="group">
                    <td className="border-t border-[#edf1f7] px-4 py-3">
                      {log.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={log.media_url}
                          alt=""
                          className="size-10 rounded-md object-cover ring-1 ring-[#edf1f7]"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-[#f2f4f7] text-[#98a2b3]">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v11.25A2.25 2.25 0 006.75 21z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3">
                      <span className="font-medium text-[#101828]">
                        {log.page_name ?? <span className="text-[#98a2b3]">Deleted</span>}
                      </span>
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3">
                      {log.caption ? (
                        <span className="line-clamp-2 max-w-[200px] text-xs text-[#344054]">
                          {log.caption}
                        </span>
                      ) : (
                        <span className="text-xs text-[#98a2b3]">No caption</span>
                      )}
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3 text-xs text-[#667085]">
                      {formatDatetime(log.scheduled_at)}
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3 text-xs text-[#667085]">
                      {log.posted_at ? formatDatetime(log.posted_at) : <span className="text-[#c0c8d2]">—</span>}
                    </td>
                    <td className="border-t border-[#edf1f7] px-4 py-3">
                      {log.status === "failed" && log.error_message ? (
                        <span className="line-clamp-2 max-w-[220px] text-xs text-[#b42318]">
                          {log.error_message}
                        </span>
                      ) : log.status === "posted" && log.fb_post_id ? (
                        <span className="font-mono text-xs text-[#667085]">
                          {log.fb_post_id}
                        </span>
                      ) : (
                        <span className="text-xs text-[#c0c8d2]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[#d9dee8] bg-white px-5 py-3 text-sm text-[#667085] shadow-sm">
          <span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of {total} entries
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => navigate({ page: String(currentPage - 1) })}
              className="rounded-md border border-[#cfd6e3] px-3 py-1.5 text-sm font-medium text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => navigate({ page: String(currentPage + 1) })}
              className="rounded-md border border-[#cfd6e3] px-3 py-1.5 text-sm font-medium text-[#344054] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
