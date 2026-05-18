"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

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

type MediaStats = {
  total: number;
  available: number;
  used: number;
  expiringSoon: number;
  deleted: number;
};

type SelectedFilePreview = {
  file: File;
  previewUrl: string;
};

const STATUS_OPTIONS = ["all", "available", "used", "expired", "deleted"] as const;
const EDITABLE_STATUS_OPTIONS = ["available", "used", "expired", "deleted"] as const;
const PAGE_SIZE = 24;

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [pagination, setPagination] = useState<MediaPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<SelectedFilePreview[]>([]);
  const selectedPreviewsRef = useRef<SelectedFilePreview[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [fileExpiresInDays, setFileExpiresInDays] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [stats, setStats] = useState<MediaStats>({
    total: 0,
    available: 0,
    used: 0,
    expiringSoon: 0,
    deleted: 0,
  });

  const loadStats = useCallback(async () => {
    const response = await fetch("/api/media/stats");
    const data = await response.json();
    if (response.ok) setStats(data.stats);
  }, []);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (tagFilter.trim()) params.set("tag", tagFilter.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
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
    await loadStats();
  }, [loadStats, page, search, tagFilter, statusFilter]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);
  useEffect(() => { void loadTags(); }, []);
  useEffect(() => { selectedPreviewsRef.current = selectedPreviews; }, [selectedPreviews]);
  useEffect(() => { return () => revokePreviewUrls(selectedPreviewsRef.current); }, []);

  const activePreview = activePreviewIndex === null ? null : selectedPreviews[activePreviewIndex] ?? null;

  useEffect(() => {
    if (!activePreview) return;
    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePreviewIndex(null);
    }
    document.addEventListener("keydown", handlePreviewKeyDown);
    return () => document.removeEventListener("keydown", handlePreviewKeyDown);
  }, [activePreview]);

  function resetToFirstPage() { setPage(1); }

  async function loadTags() {
    const response = await fetch("/api/media/tags");
    const data = await response.json();
    if (response.ok) setKnownTags(data.tags);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    revokePreviewUrls(selectedPreviewsRef.current);
    setSelectedFiles(files);
    setSelectedPreviews(files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    setActivePreviewIndex(null);
    setFileTags(files.map(() => ""));
    setFileExpiresInDays(files.map(() => ""));
    setMessage("");
    setErrors([]);
  }

  function updateFileTags(index: number, value: string) {
    setFileTags((cur) => cur.map((v, i) => (i === index ? value : v)));
  }

  function applyTagsToAllFiles() {
    setFileTags(selectedFiles.map(() => tags));
    setFileExpiresInDays(selectedFiles.map(() => expiresInDays));
  }

  function updateFileExpiresInDays(index: number, value: string) {
    setFileExpiresInDays((cur) => cur.map((v, i) => (i === index ? value : v)));
  }

  function removeSelectedFile(index: number) {
    const preview = selectedPreviews[index];
    if (preview) URL.revokeObjectURL(preview.previewUrl);
    setSelectedFiles((cur) => cur.filter((_, i) => i !== index));
    setSelectedPreviews((cur) => cur.filter((_, i) => i !== index));
    setFileTags((cur) => cur.filter((_, i) => i !== index));
    setFileExpiresInDays((cur) => cur.filter((_, i) => i !== index));
    setActivePreviewIndex((cur) => {
      if (cur === null) return null;
      if (cur === index) return null;
      if (cur > index) return cur - 1;
      return cur;
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedFiles.length === 0) { setMessage("Choose at least one image to upload."); return; }
    setIsUploading(true);
    setMessage("");
    setErrors([]);

    const formData = new FormData();
    formData.set("tags", tags);
    formData.set("expiresInDays", expiresInDays);
    formData.set("fileTags", JSON.stringify(fileTags));
    formData.set("fileExpiresInDays", JSON.stringify(fileExpiresInDays));
    for (const file of selectedFiles) formData.append("files", file);

    const response = await fetch("/api/media/upload", { method: "POST", body: formData });
    const data = await response.json();
    setIsUploading(false);

    if (!response.ok && !data.created?.length) {
      setMessage(data.error ?? "Upload failed.");
      setErrors(data.errors ?? []);
      return;
    }
    setMessage(`Uploaded ${data.created.length} image${data.created.length === 1 ? "" : "s"}.`);
    setErrors(data.errors ?? []);
    revokePreviewUrls(selectedPreviewsRef.current);
    setSelectedFiles([]);
    setSelectedPreviews([]);
    setActivePreviewIndex(null);
    setFileTags([]);
    setFileExpiresInDays([]);
    await loadTags();
    await loadAssets();
  }

  async function handleDelete(asset: MediaAsset) {
    const response = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Delete failed."); return; }
    setMessage(`Deleted ${asset.file_name}.`);
    await loadAssets();
  }

  async function handleUpdate(
    asset: MediaAsset,
    updates: { expires_at: string; tags: string; status: MediaAsset["status"] },
  ) {
    const response = await fetch(`/api/media/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Update failed."); return; }
    setMessage(`Updated ${asset.file_name}.`);
    await loadTags();
    await loadAssets();
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
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Available" value={stats.available} />
            <StatCard label="Used" value={stats.used} />
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
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Tags for all images
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="nurse meme, night shift, nursing student"
                value={tags}
                list="media-tag-suggestions"
                onChange={(e) => setTags(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Expiry days for all images
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                min="1" placeholder="Default 7 days" step="1" type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </label>

            {selectedPreviews.length > 0 && (
              <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedPreviews.length} image{selectedPreviews.length === 1 ? "" : "s"} selected
                  </p>
                  <button type="button" onClick={applyTagsToAllFiles}
                    className="rounded-md border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50">
                    Apply to all
                  </button>
                </div>
                <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                  {selectedPreviews.map((preview, index) => (
                    <div key={`${preview.file.name}-${preview.file.size}-${index}`}
                      className="grid grid-cols-[64px_1fr] gap-3 rounded-md border border-slate-200 bg-white p-2">
                      <button type="button" onClick={() => setActivePreviewIndex(index)}
                        className="size-16 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 transition hover:ring-2 hover:ring-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.previewUrl} alt={preview.file.name} className="h-full w-full object-cover" />
                      </button>
                      <div className="grid min-w-0 gap-2">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">{preview.file.name}</p>
                            <p className="text-xs text-slate-500">{formatBytes(preview.file.size)}</p>
                          </div>
                          <button type="button" onClick={() => removeSelectedFile(index)}
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-200 text-sm leading-none text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            aria-label={`Remove ${preview.file.name}`}>×</button>
                        </div>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Tags
                          <input className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            placeholder="Leave blank to use tags for all images" value={fileTags[index] ?? ""}
                            list="media-tag-suggestions" onChange={(e) => updateFileTags(index, e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-slate-600">
                          Expiry days
                          <input className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            min="1" placeholder="Default 7 days" step="1" type="number"
                            value={fileExpiresInDays[index] ?? ""} onChange={(e) => updateFileExpiresInDays(index, e.target.value)} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={isUploading}
              className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {isUploading ? "Uploading..." : "Upload to Library"}
            </button>

            {message && <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}

            {errors.length > 0 && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <p className="font-semibold">Some files failed</p>
                <ul className="mt-2 space-y-1">
                  {errors.map((error) => <li key={error.fileName}>{error.fileName}: {error.error}</li>)}
                </ul>
              </div>
            )}
          </form>

          <section className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_160px] md:items-end">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Search file name
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="quote.png" value={search}
                  onChange={(e) => { setSearch(e.target.value); resetToFirstPage(); }} />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700">
                Filter by tag
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="night shift" value={tagFilter} list="media-tag-suggestions"
                  onChange={(e) => { setTagFilter(e.target.value); resetToFirstPage(); }} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Status
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); resetToFirstPage(); }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            {knownTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {knownTags.slice(0, 16).map((tag) => (
                  <button key={tag} type="button" onClick={() => { setTagFilter(tag); resetToFirstPage(); }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-50">
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading media assets...</div>
            ) : assets.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No media assets match the current filters.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <MediaCard key={asset.id} asset={asset} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            )}

            <PaginationControls
              pagination={pagination}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            />
          </section>
        </section>
      </div>

      <datalist id="media-tag-suggestions">
        {knownTags.map((tag) => <option key={tag} value={tag} />)}
      </datalist>

      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog" aria-modal="true" aria-label={`Preview ${activePreview.file.name}`}
          onClick={() => setActivePreviewIndex(null)}>
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activePreview.file.name}</p>
                <p className="text-xs text-slate-200">{formatBytes(activePreview.file.size)}</p>
              </div>
              <button type="button" onClick={() => setActivePreviewIndex(null)}
                className="grid size-10 place-items-center rounded-full bg-white/10 text-2xl leading-none text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Close preview">×</button>
            </div>
            <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activePreview.previewUrl} alt={activePreview.file.name}
                className="max-h-[82vh] w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
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

function MediaCard({ asset, onDelete, onUpdate }: {
  asset: MediaAsset;
  onDelete: (asset: MediaAsset) => void;
  onUpdate: (asset: MediaAsset, updates: { expires_at: string; tags: string; status: MediaAsset["status"] }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftExpiresAt, setDraftExpiresAt] = useState(formatDateInputValue(asset.expires_at));
  const [draftTags, setDraftTags] = useState(asset.tags.join(", "));
  const [draftStatus, setDraftStatus] = useState<MediaAsset["status"]>(asset.status);

  function cancelEdit() {
    setDraftExpiresAt(formatDateInputValue(asset.expires_at));
    setDraftTags(asset.tags.join(", "));
    setDraftStatus(asset.status);
    setIsEditing(false);
  }

  async function saveEdit() {
    await onUpdate(asset, { expires_at: draftExpiresAt, tags: draftTags, status: draftStatus });
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
              {formatBytes(asset.size_bytes)}{asset.width && asset.height ? ` | ${asset.width}×${asset.height}` : ""}
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
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftTags} onChange={(e) => setDraftTags(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Expires
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                type="date" required value={draftExpiresAt} onChange={(e) => setDraftExpiresAt(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Status
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as MediaAsset["status"])}>
                {EDITABLE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {asset.tags.length > 0
              ? asset.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">{tag}</span>
                ))
              : <span className="text-xs text-slate-500">No tags</span>}
          </div>
        )}

        <div className="grid gap-1 text-xs text-slate-500">
          <span>Created: {formatDate(asset.created_at)}</span>
          <span>Expires: {formatDate(asset.expires_at)}</span>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={saveEdit}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800">Save</button>
            <button type="button" onClick={cancelEdit}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setIsEditing(true)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800">Edit</button>
            <button type="button" disabled={asset.status === "deleted"} onClick={() => onDelete(asset)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

function PaginationControls({ pagination, onPrevious, onNext }: {
  pagination: MediaPagination; onPrevious: () => void; onNext: () => void;
}) {
  if (pagination.total === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span>Page {pagination.page} of {pagination.totalPages} | {pagination.total} asset{pagination.total === 1 ? "" : "s"}</span>
      <div className="grid grid-cols-2 gap-2 sm:w-56">
        <button type="button" disabled={pagination.page <= 1} onClick={onPrevious}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
        <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={onNext}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function revokePreviewUrls(previews: SelectedFilePreview[]) {
  for (const preview of previews) URL.revokeObjectURL(preview.previewUrl);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

function formatDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function statusClassName(status: MediaAsset["status"]) {
  switch (status) {
    case "available": return "bg-emerald-50 text-emerald-700";
    case "used": return "bg-sky-50 text-sky-700";
    case "expired": return "bg-amber-50 text-amber-700";
    case "deleted": return "bg-slate-100 text-slate-500";
  }
}
