"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type MediaAsset = {
  id: string;
  file_url: string;
  storage_key: string;
  file_name: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  tags: string[];
  status: "available" | "used" | "expired" | "deleted";
  expires_at: string;
  created_at: string;
};

type UploadError = {
  fileName: string;
  error: string;
};

type MediaPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const STATUS_OPTIONS = ["all", "available", "used", "expired", "deleted"] as const;
const EDITABLE_STATUS_OPTIONS = ["available", "used", "expired", "deleted"] as const;
const PAGE_SIZE = 24;

export default function Home() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [pagination, setPagination] = useState<MediaPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tags, setTags] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [currentTime] = useState(() => Date.now());
  const [deletedCount, setDeletedCount] = useState(0);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      available: assets.filter((asset) => asset.status === "available").length,
      deleted: deletedCount,
      expiringSoon: assets.filter((asset) => {
        const expiresAt = new Date(asset.expires_at).getTime();
        const inTwoDays = currentTime + 2 * 24 * 60 * 60 * 1000;
        return asset.status !== "deleted" && expiresAt <= inTwoDays;
      }).length,
    };
  }, [assets, currentTime, deletedCount]);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);

    const params = new URLSearchParams();

    if (tagFilter.trim()) {
      params.set("tag", tagFilter.trim());
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    const response = await fetch(`/api/media?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not load media assets.");
      setIsLoading(false);
      return;
    }

    setAssets(data.assets);
    setPagination(data.pagination);
    setIsLoading(false);

    // Load deleted count whenever assets are loaded
    const deletedResponse = await fetch("/api/media?status=deleted&limit=1");
    const deletedData = await deletedResponse.json();

    if (deletedResponse.ok) {
      setDeletedCount(deletedData.pagination.total);
    }
  }, [page, search, tagFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    void loadTags();
    void loadDeletedCount();
  }, []);

  function resetToFirstPage() {
    setPage(1);
  }

  async function loadTags() {
    const response = await fetch("/api/media/tags");
    const data = await response.json();

    if (response.ok) {
      setKnownTags(data.tags);
    }
  }

  async function loadDeletedCount() {
    const response = await fetch("/api/media?status=deleted&limit=1");
    const data = await response.json();

    if (response.ok) {
      setDeletedCount(data.pagination.total);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
    setMessage("");
    setErrors([]);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setMessage("Choose at least one image to upload.");
      return;
    }

    setIsUploading(true);
    setMessage("");
    setErrors([]);

    const formData = new FormData();
    formData.set("tags", tags);

    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    setIsUploading(false);

    if (!response.ok && !data.created?.length) {
      setMessage(data.error ?? "Upload failed.");
      setErrors(data.errors ?? []);
      return;
    }

    setMessage(`Uploaded ${data.created.length} image${data.created.length === 1 ? "" : "s"}.`);
    setErrors(data.errors ?? []);
    setSelectedFiles([]);
    await loadTags();
    await loadAssets();
    await loadDeletedCount();
  }

  async function handleDelete(asset: MediaAsset) {
    const response = await fetch(`/api/media/${asset.id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Delete failed.");
      return;
    }

    setMessage(`Deleted ${asset.file_name}.`);
    await loadAssets();
    await loadDeletedCount();
  }

  async function handleUpdate(asset: MediaAsset, updates: { tags: string; status: MediaAsset["status"] }) {
    const response = await fetch(`/api/media/${asset.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Update failed.");
      return;
    }

    setMessage(`Updated ${asset.file_name}.`);
    await loadTags();
    await loadAssets();
    await loadDeletedCount();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Nurse auto poster</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Media Library</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Upload AI-generated nurse images, tag them by topic, and keep the asset pool ready for scheduling.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Available" value={stats.available} />
            <StatCard label="Expiring" value={stats.expiringSoon} />
            <StatCard label="Deleted" value={stats.deleted} />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={handleUpload} className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Upload Images</h2>
              <p className="mt-1 text-sm text-slate-600">JPEG, PNG, or WebP. Tags are applied to every file in the batch.</p>
            </div>

            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 hover:bg-teal-50">
              <span className="text-sm font-medium text-slate-800">Choose images</span>
              <span className="mt-1 text-xs text-slate-500">Multiple files supported</span>
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
              />
            </label>

            {selectedFiles.length > 0 ? (
              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">{selectedFiles.length} file(s) selected</p>
                <ul className="mt-2 space-y-1">
                  {selectedFiles.slice(0, 5).map((file) => (
                    <li key={`${file.name}-${file.size}`} className="truncate">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Tags
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="nurse meme, night shift, nursing student"
                value={tags}
                list="media-tag-suggestions"
                onChange={(event) => setTags(event.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={isUploading}
              className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isUploading ? "Uploading..." : "Upload to Library"}
            </button>

            {message ? <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p> : null}

            {errors.length > 0 ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <p className="font-semibold">Some files failed</p>
                <ul className="mt-2 space-y-1">
                  {errors.map((error) => (
                    <li key={error.fileName}>
                      {error.fileName}: {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_160px] md:items-end">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Search file name
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="quote.png"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetToFirstPage();
                  }}
                />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700">
                Filter by tag
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="night shift"
                  value={tagFilter}
                  list="media-tag-suggestions"
                  onChange={(event) => {
                    setTagFilter(event.target.value);
                    resetToFirstPage();
                  }}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as typeof statusFilter);
                    resetToFirstPage();
                  }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {knownTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {knownTags.slice(0, 16).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setTagFilter(tag);
                      resetToFirstPage();
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-50"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Loading media assets...
              </div>
            ) : assets.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No media assets match the current filters.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <MediaCard key={asset.id} asset={asset} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            )}

            <PaginationControls
              pagination={pagination}
              onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              onNext={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
            />
          </section>
        </section>
      </div>
      <datalist id="media-tag-suggestions">
        {knownTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MediaCard({
  asset,
  onDelete,
  onUpdate,
}: {
  asset: MediaAsset;
  onDelete: (asset: MediaAsset) => void;
  onUpdate: (asset: MediaAsset, updates: { tags: string; status: MediaAsset["status"] }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTags, setDraftTags] = useState(asset.tags.join(", "));
  const [draftStatus, setDraftStatus] = useState<MediaAsset["status"]>(asset.status);

  function cancelEdit() {
    setDraftTags(asset.tags.join(", "));
    setDraftStatus(asset.status);
    setIsEditing(false);
  }

  async function saveEdit() {
    await onUpdate(asset, {
      tags: draftTags,
      status: draftStatus,
    });
    setIsEditing(false);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.file_url} alt={asset.file_name} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{asset.file_name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {formatBytes(asset.size_bytes)}
              {asset.width && asset.height ? ` | ${asset.width}x${asset.height}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassName(asset.status)}`}>
            {asset.status}
          </span>
        </div>

        {isEditing ? (
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Tags
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Status
              <select
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value as MediaAsset["status"])}
              >
                {EDITABLE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {asset.tags.length > 0 ? (
              asset.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">No tags</span>
            )}
          </div>
        )}

        <div className="grid gap-1 text-xs text-slate-500">
          <span>Created: {formatDate(asset.created_at)}</span>
          <span>Expires: {formatDate(asset.expires_at)}</span>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={asset.status === "deleted"}
              onClick={() => onDelete(asset)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function PaginationControls({
  pagination,
  onPrevious,
  onNext,
}: {
  pagination: MediaPagination;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pagination.total === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {pagination.page} of {pagination.totalPages} | {pagination.total} asset
        {pagination.total === 1 ? "" : "s"}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:w-56">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={onPrevious}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={onNext}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function statusClassName(status: MediaAsset["status"]) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700";
    case "used":
      return "bg-sky-50 text-sky-700";
    case "expired":
      return "bg-amber-50 text-amber-700";
    case "deleted":
      return "bg-slate-100 text-slate-500";
  }
}
