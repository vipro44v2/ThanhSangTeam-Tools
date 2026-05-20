"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteModal } from "./delete-modal";
import { PostNowModal } from "./post-now-modal";
import { bulkDeletePostJobs, bulkPublishPostJobs } from "./actions";

type JobItem = {
  id: string;
  caption: string | null;
  scheduled_at: string;
  status: string;
  error_message: string | null;
  fb_post_id: string | null;
  posted_at: string | null;
  page: { page_name: string; page_id: string } | null;
  media: { file_url: string; mime_type: string; file_name: string }[];
};

type StatusFilter = "all" | "pending" | "processing";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#e8f1ff] text-[#175cd3]",
  processing: "bg-[#fff4e5] text-[#b54708]",
};

const STATUS_TABS: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
];

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function PostsList({
  jobs,
  onCreatePost,
}: {
  jobs: JobItem[];
  onCreatePost?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<JobItem | null>(null);
  const [postNowTarget, setPostNowTarget] = useState<JobItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState("");

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

  const canDelete = (s: string) => s === "pending";

  const allFilteredSelected = filtered.length > 0 && filtered.every((j) => selectedIds.has(j.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((j) => next.delete(j.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((j) => next.add(j.id));
        return next;
      });
    }
    setBulkMessage("");
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setBulkMessage("");
  }

  const selectedInView = filtered.filter((j) => selectedIds.has(j.id));
  const canBulkPublish = selectedInView.every((j) => j.status === "pending");
  const canBulkDelete = selectedInView.every((j) => canDelete(j.status));

  function handleBulkDelete() {
    const ids = [...selectedIds].filter((id) => {
      const job = jobs.find((j) => j.id === id);
      return job && canDelete(job.status);
    });
    if (!ids.length) return;
    const fd = new FormData();
    fd.set("ids", JSON.stringify(ids));
    startTransition(async () => {
      await bulkDeletePostJobs(fd);
      setSelectedIds(new Set());
      setBulkMessage(`Deleted ${ids.length} schedule${ids.length === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  function handleBulkPublish() {
    const ids = [...selectedIds].filter((id) => {
      const job = jobs.find((j) => j.id === id);
      return job?.status === "pending";
    });
    if (!ids.length) return;
    const fd = new FormData();
    fd.set("ids", JSON.stringify(ids));
    startTransition(async () => {
      const result = await bulkPublishPostJobs(fd);
      setSelectedIds(new Set());
      if (result) {
        setBulkMessage(`Published ${result.published} · Failed ${result.failed}`);
      }
      router.refresh();
    });
  }

  return (
    <>
      <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-[#e4e9f2] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={
                    statusFilter === tab.value
                      ? "rounded-md bg-[#e8f1ff] px-2.5 py-1.5 text-xs font-medium text-[#175cd3] sm:px-3 sm:text-sm"
                      : "rounded-md px-2.5 py-1.5 text-xs font-medium text-[#667085] hover:bg-[#f2f4f7] sm:px-3 sm:text-sm"
                  }
                >
                  {tab.label}
                  <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-xs">
                    {counts[tab.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-[#cfd6e3] bg-white px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 sm:flex-none sm:px-3"
              >
                <option value="all">All pages</option>
                {uniquePages.map((p) => (
                  <option key={p.page_id} value={p.page_id}>{p.page_name}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 min-w-0 flex-1 rounded-md border border-[#cfd6e3] px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 sm:px-3"
              />
            </div>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e4e9f2] bg-[#f5f9ff] px-4 py-2.5 sm:px-5">
            <span className="text-sm font-medium text-[#175cd3]">
              {selectedIds.size} selected
            </span>
            <div className="flex flex-wrap gap-2">
              {canBulkPublish && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkPublish}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-3 text-xs font-semibold text-[#067647] hover:bg-[#d1fae5] disabled:opacity-50"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {isPending ? "Publishing..." : `Publish ${selectedIds.size}`}
                </button>
              )}
              {canBulkDelete && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleBulkDelete}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#f0b6b6] bg-white px-3 text-xs font-semibold text-[#b42318] hover:bg-[#fff1f1] disabled:opacity-50"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isPending ? "Deleting..." : `Delete ${selectedIds.size}`}
                </button>
              )}
              {!canBulkPublish && !canBulkDelete && (
                <span className="text-xs text-[#667085]">Select items with the same status for bulk actions</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setBulkMessage(""); }}
              className="ml-auto text-xs text-[#667085] hover:text-[#344054]"
            >
              Deselect
            </button>
          </div>
        )}

        {bulkMessage && (
          <div className="border-b border-[#e4e9f2] bg-[#ecfdf3] px-4 py-2 text-sm text-[#067647] sm:px-5">
            {bulkMessage}
          </div>
        )}

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
          <>
            {/* Mobile card view */}
            <div className="flex flex-col divide-y divide-[#edf1f7] sm:hidden">
              {filtered.map((job) => (
                <div key={job.id} className={`flex gap-3 p-4 ${selectedIds.has(job.id) ? "bg-[#f5f9ff]" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(job.id)}
                    onChange={() => toggleOne(job.id)}
                    className="mt-1 size-4 shrink-0 rounded border-[#cfd6e3] accent-[#1877f2]"
                  />
                  {/* Thumbnail */}
                  <div className="shrink-0">
                    {job.media.length > 0 ? (
                      job.media[0].mime_type.startsWith("video/") ? (
                        <div className="flex size-14 items-center justify-center rounded-md bg-[#f2f4f7] text-[#667085]">
                          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={job.media[0].file_url} alt={job.media[0].file_name} className="size-14 rounded-md object-cover" />
                      )
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-md bg-[#f2f4f7] text-[#d0d5dd]">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v11.25A2.25 2.25 0 006.75 21z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#101828]">
                          {job.page?.page_name ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#667085]">{formatDatetime(job.scheduled_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[job.status] ?? "bg-[#f2f4f7] text-[#475467]"}`}>
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>

                    {job.caption ? (
                      <p className="mt-1.5 line-clamp-2 text-xs text-[#344054]">{job.caption}</p>
                    ) : (
                      <p className="mt-1.5 text-xs italic text-[#98a2b3]">No caption</p>
                    )}
                    {job.status === "failed" && job.error_message && (
                      <p className="mt-1 text-xs text-[#b42318]">{job.error_message}</p>
                    )}

                    {/* Actions */}
                    <div className="mt-2.5 flex gap-2">
                      {job.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPostNowTarget(job)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-2.5 text-xs font-medium text-[#067647]"
                          >
                            <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                            Publish
                          </button>
                          <Link
                            href={`/posts/${job.id}/edit`}
                            className="inline-flex h-7 items-center rounded-md border border-[#cfd6e3] px-2.5 text-xs font-medium text-[#344054]"
                          >
                            Edit
                          </Link>
                        </>
                      )}
                      {canDelete(job.status) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(job)}
                          className="inline-flex h-7 items-center rounded-md border border-[#f0b6b6] px-2.5 text-xs font-medium text-[#b42318]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-[#f8fafc] text-xs uppercase text-[#667085]">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="size-4 rounded border-[#cfd6e3] accent-[#1877f2]"
                      />
                    </th>
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
                    <tr key={job.id} className={selectedIds.has(job.id) ? "bg-[#f5f9ff]" : ""}>
                      <td className="border-t border-[#edf1f7] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(job.id)}
                          onChange={() => toggleOne(job.id)}
                          className="size-4 rounded border-[#cfd6e3] accent-[#1877f2]"
                        />
                      </td>
                      <td className="border-t border-[#edf1f7] px-5 py-3">
                        {job.media.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {job.media.slice(0, 3).map((m, i) => (
                              m.mime_type.startsWith("video/") ? (
                                <div key={i} className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#f2f4f7] text-[#667085]">
                                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                  </svg>
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={m.file_url} alt={m.file_name} className="size-12 shrink-0 rounded-md object-cover" />
                              )
                            ))}
                            {job.media.length > 3 && (
                              <span className="ml-1 text-xs font-medium text-[#667085]">+{job.media.length - 3}</span>
                            )}
                          </div>
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
                            <>
                              <button
                                type="button"
                                onClick={() => setPostNowTarget(job)}
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-3 text-xs font-medium text-[#067647] hover:bg-[#d1fae5]"
                              >
                                <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                </svg>
                                Publish
                              </button>
                              <Link
                                href={`/posts/${job.id}/edit`}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-[#cfd6e3] px-3 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                              >
                                Edit
                              </Link>
                            </>
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
          </>
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

      {postNowTarget && (
        <PostNowModal
          jobId={postNowTarget.id}
          pageName={postNowTarget.page?.page_name ?? "Unknown page"}
          caption={postNowTarget.caption}
          mediaUrl={postNowTarget.media[0]?.file_url ?? null}
          onClose={() => setPostNowTarget(null)}
        />
      )}
    </>
  );
}
