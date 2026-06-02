"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/app/components/confirm-modal";
import { getMediaCardActions, type MediaCardAction } from "@/lib/media/card-action";
import { getExpiryDateBounds, MEDIA_MAX_EXPIRY_DAYS } from "@/lib/media/validation";

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

const STATUS_OPTIONS = ["all", "available", "used", "expiring", "expired", "deleted"] as const;
const EDITABLE_STATUS_OPTIONS = ["available", "used", "expired", "deleted"] as const;
const BULK_STATUS_OPTIONS = ["", ...EDITABLE_STATUS_OPTIONS] as const;
const PAGE_SIZE = 24;
const EXPIRY_DATE_BOUNDS = getExpiryDateBounds();
type BulkConfirmAction = "delete" | "restore" | "permanentDelete";
type BulkTagsMode = "add" | "replace";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedTagFilter, setDebouncedTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<MediaAsset | null>(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<BulkConfirmAction | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<(typeof BULK_STATUS_OPTIONS)[number]>("");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkTagsMode, setBulkTagsMode] = useState<BulkTagsMode>("add");
  const [bulkExpiresAt, setBulkExpiresAt] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
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
    if (debouncedTagFilter.trim()) params.set("tag", debouncedTagFilter.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    const [response] = await Promise.all([
      fetch(`/api/media?${params.toString()}`),
      loadStats(),
    ]);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not load media assets.");
      setIsLoading(false);
      return;
    }
    setAssets(data.assets);
    setSelectedAssetIds((current) => {
      const visibleIds = new Set<string>(data.assets.map((asset: MediaAsset) => asset.id));
      return current.filter((id) => visibleIds.has(id));
    });
    setPagination(data.pagination);
    setIsLoading(false);
  }, [loadStats, page, debouncedSearch, debouncedTagFilter, statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadAssets(); }, [loadAssets]);
  useEffect(() => { void loadTags(); }, []);
  useEffect(() => { selectedPreviewsRef.current = selectedPreviews; }, [selectedPreviews]);
  useEffect(() => { return () => revokePreviewUrls(selectedPreviewsRef.current); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedTagFilter(tagFilter); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [tagFilter]);

  const activePreview = activePreviewIndex === null ? null : selectedPreviews[activePreviewIndex] ?? null;
  const selectedDeletedAssetIds = assets
    .filter((asset) => asset.status === "deleted" && selectedAssetIds.includes(asset.id))
    .map((asset) => asset.id);

  useEffect(() => {
    if (!activePreview) return;
    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePreviewIndex(null);
    }
    document.addEventListener("keydown", handlePreviewKeyDown);
    return () => document.removeEventListener("keydown", handlePreviewKeyDown);
  }, [activePreview]);

  function resetToFirstPage() { setPage(1); }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  }

  function selectVisibleAssets() {
    setSelectedAssetIds(assets.map((asset) => asset.id));
  }

  function clearSelectedAssets() {
    setSelectedAssetIds([]);
  }

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
    const prevAssets = assets;
    const prevStats = stats;
    const prevPagination = pagination;

    setAssets((cur) => cur.filter((a) => a.id !== asset.id));
    setPagination((cur) => ({
      ...cur,
      total: Math.max(0, cur.total - 1),
      totalPages: Math.max(1, Math.ceil((cur.total - 1) / PAGE_SIZE)),
    }));
    setStats((cur) => {
      const next = { ...cur, total: Math.max(0, cur.total - 1) };
      if (asset.status === "available") next.available = Math.max(0, next.available - 1);
      else if (asset.status === "used") next.used = Math.max(0, next.used - 1);
      else if (asset.status === "deleted") next.deleted = Math.max(0, next.deleted - 1);
      return next;
    });

    const response = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setAssets(prevAssets);
      setPagination(prevPagination);
      setStats(prevStats);
      setMessage(data.error ?? "Delete failed.");
      return;
    }
    setMessage(`Deleted ${asset.file_name}.`);
  }

  async function handlePermanentDelete(asset: MediaAsset) {
    const prevAssets = assets;
    const prevStats = stats;
    const prevPagination = pagination;

    setAssets((cur) => cur.filter((a) => a.id !== asset.id));
    setPagination((cur) => ({
      ...cur,
      total: Math.max(0, cur.total - 1),
      totalPages: Math.max(1, Math.ceil((cur.total - 1) / PAGE_SIZE)),
    }));
    setStats((cur) => ({
      ...cur,
      deleted: Math.max(0, cur.deleted - 1),
    }));

    const response = await fetch(`/api/media/${asset.id}?permanent=true`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setAssets(prevAssets);
      setPagination(prevPagination);
      setStats(prevStats);
      setMessage(data.error ?? "Permanent delete failed.");
      return;
    }
    setMessage(`Permanently deleted ${asset.file_name}.`);
  }

  async function handleRestore(asset: MediaAsset) {
    await handleUpdate(asset, {
      file_name: asset.file_name,
      expires_at: formatDateInputValue(asset.expires_at),
      tags: asset.tags.join(", "),
      status: "available",
    });
    setMessage(`Restored ${asset.file_name}.`);
  }

  async function runBulkUpdate(
    updates: { status?: MediaAsset["status"]; tags?: string; tagsMode?: BulkTagsMode; expires_at?: string },
    successMessage: string,
  ) {
    if (selectedAssetIds.length === 0) {
      setMessage("Select at least one media asset.");
      return false;
    }

    setIsBulkPending(true);
    const response = await fetch("/api/media/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: selectedAssetIds,
        updates,
      }),
    });
    const data = await response.json();
    setIsBulkPending(false);

    if (!response.ok) {
      setMessage(data.error ?? "Bulk update failed.");
      return false;
    }

    setMessage(successMessage.replace("{count}", String(data.count ?? selectedAssetIds.length)));
    clearSelectedAssets();
    await loadTags();
    await loadAssets();
    return true;
  }

  async function handleBulkConfirm() {
    if (!bulkConfirmAction) return;

    const action = bulkConfirmAction;
    if (action === "permanentDelete") {
      const success = await runBulkPermanentDelete();
      if (success) {
        setBulkConfirmAction(null);
      }
      return;
    }

    const success = await runBulkUpdate(
      { status: action === "delete" ? "deleted" : "available" },
      action === "delete" ? "Deleted {count} media assets." : "Restored {count} media assets.",
    );

    if (success) {
      setBulkConfirmAction(null);
    }
  }

  async function runBulkPermanentDelete() {
    if (selectedDeletedAssetIds.length === 0) {
      setMessage("Select at least one deleted media asset.");
      return false;
    }

    setIsBulkPending(true);
    const response = await fetch("/api/media/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: selectedDeletedAssetIds,
      }),
    });
    const data = await response.json();
    setIsBulkPending(false);

    if (!response.ok) {
      setMessage(data.error ?? "Permanent delete failed.");
      return false;
    }

    setMessage(`Permanently deleted ${data.count ?? selectedDeletedAssetIds.length} media assets.`);
    clearSelectedAssets();
    await loadTags();
    await loadAssets();
    return true;
  }

  async function handleBulkEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const updates: { status?: MediaAsset["status"]; tags?: string; tagsMode?: BulkTagsMode; expires_at?: string } = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkTags.trim()) {
      updates.tags = bulkTags;
      updates.tagsMode = bulkTagsMode;
    }
    if (bulkExpiresAt) updates.expires_at = bulkExpiresAt;

    if (!updates.status && !updates.tags && !updates.expires_at) {
      setMessage("Choose at least one field to bulk edit.");
      return;
    }

    const success = await runBulkUpdate(updates, "Updated {count} media assets.");
    if (success) {
      setIsBulkEditOpen(false);
      setBulkStatus("");
      setBulkTags("");
      setBulkTagsMode("add");
      setBulkExpiresAt("");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await handleDelete(deleteTarget);
    setDeleteTarget(null);
    setIsDeleting(false);
  }

  async function handlePermanentDeleteConfirm() {
    if (!permanentDeleteTarget) return;
    setIsDeleting(true);
    await handlePermanentDelete(permanentDeleteTarget);
    setPermanentDeleteTarget(null);
    setIsDeleting(false);
  }

  async function handleUpdate(
    asset: MediaAsset,
    updates: { file_name: string; expires_at: string; tags: string; status: MediaAsset["status"] },
  ) {
    const prevAssets = assets;
    const prevStats = stats;
    const updatedTags = updates.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const updatedFileName = updates.file_name.trim();

    setAssets((cur) =>
      cur.map((a) =>
        a.id === asset.id
          ? {
              ...a,
              file_name: updatedFileName || a.file_name,
              tags: updatedTags,
              expires_at: new Date(updates.expires_at).toISOString(),
              status: updates.status,
            }
          : a,
      ),
    );
    const newTags = updatedTags.filter((t) => !knownTags.includes(t));
    if (newTags.length > 0) setKnownTags((cur) => [...new Set([...cur, ...newTags])]);
    if (updates.status !== asset.status) {
      setStats((cur) => {
        const next = { ...cur };
        if (asset.status === "available") next.available = Math.max(0, next.available - 1);
        else if (asset.status === "used") next.used = Math.max(0, next.used - 1);
        else if (asset.status === "deleted") next.deleted = Math.max(0, next.deleted - 1);
        if (updates.status === "available") next.available++;
        else if (updates.status === "used") next.used++;
        else if (updates.status === "deleted") next.deleted++;
        return next;
      });
    }

    const response = await fetch(`/api/media/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) {
      setAssets(prevAssets);
      setStats(prevStats);
      setMessage(data.error ?? "Update failed.");
      return;
    }
    setMessage(`Updated ${asset.file_name}.`);
    void loadStats();
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
                max={MEDIA_MAX_EXPIRY_DAYS} min="1" placeholder="Default 7 days" step="1" type="number"
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
                            max={MEDIA_MAX_EXPIRY_DAYS} min="1" placeholder="Default 7 days" step="1" type="number"
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
                  onChange={(e) => setSearch(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-700">
                Filter by tag
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="night shift" value={tagFilter} list="media-tag-suggestions"
                  onChange={(e) => setTagFilter(e.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Status
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); resetToFirstPage(); }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatusFilterLabel(s)}</option>)}
                </select>
              </label>
            </div>

            {knownTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {knownTags.slice(0, 16).map((tag) => (
                  <button key={tag} type="button" onClick={() => { setTagFilter(tag); setDebouncedTagFilter(tag); setPage(1); }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-50">
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {assets.length > 0 && (
              <BulkActionsBar
                selectedCount={selectedAssetIds.length}
                selectedDeletedCount={selectedDeletedAssetIds.length}
                visibleCount={assets.length}
                isPending={isBulkPending}
                onSelectVisible={selectVisibleAssets}
                onClear={clearSelectedAssets}
                onEdit={() => setIsBulkEditOpen(true)}
                onDelete={() => setBulkConfirmAction("delete")}
                onRestore={() => setBulkConfirmAction("restore")}
                onPermanentDelete={() => setBulkConfirmAction("permanentDelete")}
              />
            )}

            {isLoading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading media assets...</div>
            ) : assets.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No media assets match the current filters.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <MediaCard
                    key={asset.id}
                    asset={asset}
                    isSelected={selectedAssetIds.includes(asset.id)}
                    onDelete={(a) => setDeleteTarget(a)}
                    onPermanentDelete={(a) => setPermanentDeleteTarget(a)}
                    onRestore={handleRestore}
                    onToggleSelection={toggleAssetSelection}
                    onUpdate={handleUpdate}
                  />
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

      {deleteTarget && (
        <ConfirmModal
          title="Delete media asset?"
          description={
            <>
              <span className="font-medium text-[#344054]">{deleteTarget.file_name}</span> will be marked deleted and can be restored later.
            </>
          }
          isPending={isDeleting}
          pendingLabel="Deleting..."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {permanentDeleteTarget && (
        <ConfirmModal
          title="Permanently delete media asset?"
          description={
            <>
              <span className="font-medium text-[#344054]">{permanentDeleteTarget.file_name}</span> will be removed from storage and cannot be restored.
            </>
          }
          confirmLabel="Delete Forever"
          isPending={isDeleting}
          pendingLabel="Deleting..."
          onConfirm={handlePermanentDeleteConfirm}
          onClose={() => setPermanentDeleteTarget(null)}
        />
      )}

      {bulkConfirmAction && (
        <ConfirmModal
          title={getBulkConfirmTitle(bulkConfirmAction)}
          description={getBulkConfirmDescription(bulkConfirmAction, selectedAssetIds.length, selectedDeletedAssetIds.length)}
          confirmLabel={getBulkConfirmLabel(bulkConfirmAction)}
          pendingLabel={bulkConfirmAction === "restore" ? "Restoring..." : "Deleting..."}
          isPending={isBulkPending}
          onConfirm={handleBulkConfirm}
          onClose={() => setBulkConfirmAction(null)}
        />
      )}

      {isBulkEditOpen && (
        <BulkEditModal
          status={bulkStatus}
          tags={bulkTags}
          tagsMode={bulkTagsMode}
          expiresAt={bulkExpiresAt}
          selectedCount={selectedAssetIds.length}
          isPending={isBulkPending}
          onStatusChange={setBulkStatus}
          onTagsChange={setBulkTags}
          onTagsModeChange={setBulkTagsMode}
          onExpiresAtChange={setBulkExpiresAt}
          onSubmit={handleBulkEditSubmit}
          onClose={() => setIsBulkEditOpen(false)}
        />
      )}
    </main>
  );
}

function BulkActionsBar({
  selectedCount,
  selectedDeletedCount,
  visibleCount,
  isPending,
  onSelectVisible,
  onClear,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  selectedCount: number;
  selectedDeletedCount: number;
  visibleCount: number;
  isPending: boolean;
  onSelectVisible: () => void;
  onClear: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const hasSelection = selectedCount > 0;
  const hasDeletedSelection = selectedDeletedCount > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectVisible}
          disabled={isPending || visibleCount === 0}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Select All
        </button>
        <span className="text-slate-600">
          {selectedCount} selected
        </span>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            disabled={isPending}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:w-[460px] sm:grid-cols-4">
        <button
          type="button"
          onClick={onEdit}
          disabled={!hasSelection || isPending}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!hasSelection || isPending}
          className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={!hasSelection || isPending}
          className="rounded-md border border-emerald-200 px-3 py-2 font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={onPermanentDelete}
          disabled={!hasDeletedSelection || isPending}
          className="rounded-md border border-rose-200 px-3 py-2 font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete Forever
        </button>
      </div>
    </div>
  );
}

function BulkEditModal({
  status,
  tags,
  tagsMode,
  expiresAt,
  selectedCount,
  isPending,
  onStatusChange,
  onTagsChange,
  onTagsModeChange,
  onExpiresAtChange,
  onSubmit,
  onClose,
}: {
  status: (typeof BULK_STATUS_OPTIONS)[number];
  tags: string;
  tagsMode: BulkTagsMode;
  expiresAt: string;
  selectedCount: number;
  isPending: boolean;
  onStatusChange: (value: (typeof BULK_STATUS_OPTIONS)[number]) => void;
  onTagsChange: (value: string) => void;
  onTagsModeChange: (value: BulkTagsMode) => void;
  onExpiresAtChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close bulk edit"
        onClick={!isPending ? onClose : undefined}
      />
      <form onSubmit={onSubmit} className="relative w-full max-w-md rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-[#101828]">Bulk edit media</h2>
        <p className="mt-1 text-sm text-[#667085]">
          {selectedCount} selected media asset{selectedCount === 1 ? "" : "s"}. Empty fields stay unchanged.
        </p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as (typeof BULK_STATUS_OPTIONS)[number])}
            >
              <option value="">No change</option>
              {EDITABLE_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tags
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="night shift, test2"
              value={tags}
              onChange={(event) => onTagsChange(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTagsModeChange("add")}
              className={tagsMode === "add"
                ? "rounded-md border border-teal-500 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"}
            >
              Add tags
            </button>
            <button
              type="button"
              onClick={() => onTagsModeChange("replace")}
              className={tagsMode === "replace"
                ? "rounded-md border border-teal-500 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"}
            >
              Replace tags
            </button>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Expiry date
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              type="date"
              min={EXPIRY_DATE_BOUNDS.min}
              max={EXPIRY_DATE_BOUNDS.max}
              value={expiresAt}
              onChange={(event) => onExpiresAtChange(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-[#d0d5dd] py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f2f4f7] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
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

function MediaCard({ asset, isSelected, onDelete, onPermanentDelete, onRestore, onToggleSelection, onUpdate }: {
  asset: MediaAsset;
  isSelected: boolean;
  onDelete: (asset: MediaAsset) => void;
  onPermanentDelete: (asset: MediaAsset) => void;
  onRestore: (asset: MediaAsset) => void;
  onToggleSelection: (assetId: string) => void;
  onUpdate: (
    asset: MediaAsset,
    updates: { file_name: string; expires_at: string; tags: string; status: MediaAsset["status"] },
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftFileName, setDraftFileName] = useState(asset.file_name);
  const [draftExpiresAt, setDraftExpiresAt] = useState(formatDateInputValue(asset.expires_at));
  const [draftTags, setDraftTags] = useState(asset.tags.join(", "));
  const [draftStatus, setDraftStatus] = useState<MediaAsset["status"]>(asset.status);

  function cancelEdit() {
    setDraftFileName(asset.file_name);
    setDraftExpiresAt(formatDateInputValue(asset.expires_at));
    setDraftTags(asset.tags.join(", "));
    setDraftStatus(asset.status);
    setIsEditing(false);
  }

  async function saveEdit() {
    await onUpdate(asset, {
      file_name: draftFileName,
      expires_at: draftExpiresAt,
      tags: draftTags,
      status: draftStatus,
    });
    setIsEditing(false);
  }

  const actions = getMediaCardActions(asset.status);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <label className="absolute left-2 top-2 z-10 grid size-8 place-items-center rounded-md bg-white/90 shadow-sm ring-1 ring-slate-200">
          <span className="sr-only">Select {asset.file_name}</span>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(asset.id)}
            className="size-4 accent-teal-700"
          />
        </label>
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
              File name
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftFileName} onChange={(e) => setDraftFileName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Tags
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={draftTags} onChange={(e) => setDraftTags(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Expires
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                type="date" required min={EXPIRY_DATE_BOUNDS.min} max={EXPIRY_DATE_BOUNDS.max}
                value={draftExpiresAt} onChange={(e) => setDraftExpiresAt(e.target.value)} />
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
            {actions.map((action) => (
              <button
                key={action.intent}
                type="button"
                onClick={() => handleCardAction(action, asset, onDelete, onRestore, onPermanentDelete)}
                className={getMediaActionButtonClassName(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function handleCardAction(
  action: MediaCardAction,
  asset: MediaAsset,
  onDelete: (asset: MediaAsset) => void,
  onRestore: (asset: MediaAsset) => void,
  onPermanentDelete: (asset: MediaAsset) => void,
) {
  if (action.intent === "restore") {
    onRestore(asset);
    return;
  }

  if (action.intent === "permanentDelete") {
    onPermanentDelete(asset);
    return;
  }

  onDelete(asset);
}

function getMediaActionButtonClassName(action: MediaCardAction) {
  if (action.intent === "restore") {
    return "rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50";
  }

  if (action.intent === "permanentDelete") {
    return "col-span-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50";
  }

  return "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700";
}

function getBulkConfirmTitle(action: BulkConfirmAction) {
  if (action === "restore") return "Restore selected media?";
  if (action === "permanentDelete") return "Permanently delete selected media?";
  return "Delete selected media?";
}

function getBulkConfirmLabel(action: BulkConfirmAction) {
  if (action === "restore") return "Restore";
  if (action === "permanentDelete") return "Delete Forever";
  return "Delete";
}

function getBulkConfirmDescription(action: BulkConfirmAction, selectedCount: number, selectedDeletedCount: number) {
  if (action === "permanentDelete") {
    return `${selectedDeletedCount} deleted media asset${selectedDeletedCount === 1 ? "" : "s"} will be removed from storage and cannot be restored.`;
  }

  return `${selectedCount} selected media asset${selectedCount === 1 ? "" : "s"} will be ${action === "delete" ? "marked deleted" : "restored to available"}.`;
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

function formatStatusFilterLabel(status: (typeof STATUS_OPTIONS)[number]) {
  if (status === "expiring") return "expiring soon";
  return status;
}

function statusClassName(status: MediaAsset["status"]) {
  switch (status) {
    case "available": return "bg-emerald-50 text-emerald-700";
    case "used": return "bg-sky-50 text-sky-700";
    case "expired": return "bg-amber-50 text-amber-700";
    case "deleted": return "bg-slate-100 text-slate-500";
  }
}
