"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeleteModal } from "./delete-modal";

type JobItem = {
  id: string;
  caption: string | null;
  scheduled_at: string;
  status: string;
  error_message: string | null;
  fb_post_id: string | null;
  posted_at: string | null;
  page: { page_name: string; page_id: string } | null;
  media: { file_url: string; mime_type: string; file_name: string } | null;
};

type StatusFilter = "all" | "pending" | "posted" | "failed" | "processing" | "skipped";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  posted: "Posted",
  failed: "Failed",
  skipped: "Skipped",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#e8f1ff] text-[#175cd3]",
  processing: "bg-[#fff4e5] text-[#b54708]",
  posted: "bg-[#ecfdf3] text-[#067647]",
  failed: "bg-[#fff1f1] text-[#b42318]",
  skipped: "bg-[#f2f4f7] text-[#475467]",
};

const STATUS_TABS: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Posted", value: "posted" },
  { label: "Failed", value: "failed" },
  { label: "Skipped", value: "skipped" },
];

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PostsList({
  jobs,
  onCreatePost,
}: {
  jobs: JobItem[];
  onCreatePost?: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<JobItem | null>(null);

  const uniquePages = useMemo(() => {
    const seen = new Map<string, string>();
    jobs.forEach((j) => { if (j.page) seen.set(j.page.page_id, j.page.page_name); });
    return Array.from(seen.entries()).map(([page_id, page_name]) => ({ page_id, page_name }));
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (pageFilter !== "all" && j.page?.page_id !== pageFilter) return false;
      if (q && !(j.caption ?? "").toLowerCase().includes(q) && !(j.page?.page_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, statusFilter, pageFilter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length };
    jobs.forEach((j) => { c[j.status] = (c[j.status] ?? 0) + 1; });
    return c;
  }, [jobs]);

  const canDelete = (s: string) => s === "pending" || s === "failed" || s === "skipped";

  return (
    <>
      <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-[#e4e9f2] px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={
                    statusFilter === tab.value
                      ? "rounded-md bg-[#e8f1ff] px-3 py-1.5 text-sm font-medium text-[#175cd3]"
                      : "rounded-md px-3 py-1.5 text-sm font-medium text-[#667085] hover:bg-[#f2f4f7]"
                  }
                >
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-xs">
                    {counts[tab.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="h-9 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              >
                <option value="all">All pages</option>
                {uniquePages.map((p) => (
                  <option key={p.page_id} value={p.page_id}>{p.page_name}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search caption or page…"
                className="h-9 min-w-0 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-base font-medium text-[#101828]">No posts found</p>
            <p className="mt-1 text-sm text-[#667085]">
              {jobs.length === 0
                ? "Create your first scheduled post to get started."
                : "Try adjusting the filters."}
            </p>
            {jobs.length === 0 && onCreatePost && (
              <button
                type="button"
                onClick={onCreatePost}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-[#1877f2] px-4 text-sm font-medium text-white hover:bg-[#1668d7]"
              >
                Create Post
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Media</th>
                  <th className="px-5 py-3 font-semibold">Page</th>
                  <th className="px-5 py-3 font-semibold">Caption</th>
                  <th className="px-5 py-3 font-semibold">Scheduled</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id}>
                    <td className="border-t border-[#edf1f7] px-5 py-3">
                      {job.media ? (
                        job.media.mime_type.startsWith("video/") ? (
                          <div className="flex size-12 items-center justify-center rounded-md bg-[#f2f4f7] text-[#667085]">
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={job.media.file_url} alt={job.media.file_name} className="size-12 rounded-md object-cover" />
                        )
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-md bg-[#f2f4f7] text-[#d0d5dd]">
                          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v11.25A2.25 2.25 0 006.75 21z" />
                          </svg>
                        </div>
                      )}
                    </td>

                    <td className="border-t border-[#edf1f7] px-5 py-3">
                      {job.page ? (
                        <div>
                          <p className="font-medium text-[#101828]">{job.page.page_name}</p>
                          <p className="font-mono text-xs text-[#98a2b3]">{job.page.page_id}</p>
                        </div>
                      ) : (
                        <span className="text-[#98a2b3]">—</span>
                      )}
                    </td>

                    <td className="max-w-xs border-t border-[#edf1f7] px-5 py-3">
                      {job.caption ? (
                        <p className="line-clamp-2 text-[#344054]">{job.caption}</p>
                      ) : (
                        <span className="text-xs italic text-[#98a2b3]">No caption</span>
                      )}
                      {job.status === "failed" && job.error_message && (
                        <p className="mt-1 text-xs text-[#b42318]">{job.error_message}</p>
                      )}
                      {job.status === "posted" && job.fb_post_id && (
                        <p className="mt-1 font-mono text-xs text-[#98a2b3]">ID: {job.fb_post_id}</p>
                      )}
                    </td>

                    <td className="whitespace-nowrap border-t border-[#edf1f7] px-5 py-3 text-[#475467]">
                      {formatDatetime(job.scheduled_at)}
                      {job.posted_at && (
                        <p className="mt-0.5 text-xs text-[#98a2b3]">
                          Published {formatDatetime(job.posted_at)}
                        </p>
                      )}
                    </td>

                    <td className="border-t border-[#edf1f7] px-5 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLE[job.status] ?? "bg-[#f2f4f7] text-[#475467]"}`}>
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </td>

                    <td className="border-t border-[#edf1f7] px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {job.status === "pending" && (
                          <Link
                            href={`/posts/${job.id}/edit`}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-[#cfd6e3] px-3 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                          >
                            Edit
                          </Link>
                        )}
                        {canDelete(job.status) && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(job)}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-[#f0b6b6] px-3 text-xs font-medium text-[#b42318] hover:bg-[#fff1f1]"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-[#edf1f7] px-5 py-3 text-right text-xs text-[#98a2b3]">
            Showing {filtered.length} of {jobs.length} posts
          </div>
        )}
      </section>

      {deleteTarget && (
        <DeleteModal
          jobId={deleteTarget.id}
          pageName={deleteTarget.page?.page_name ?? "Unknown page"}
          caption={deleteTarget.caption}
          scheduledAt={deleteTarget.scheduled_at}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
