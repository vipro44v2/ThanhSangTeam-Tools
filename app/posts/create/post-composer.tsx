"use client";

import { useRef, useState, useTransition } from "react";
import { createPostJobs } from "./actions";

type Page = { id: string; page_id: string; page_name: string; token_status: string };
type MediaAsset = { id: string; url: string; name: string; mime_type: string };

function defaultSchedule() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function minSchedule() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 5);
  return d.toISOString().slice(0, 16);
}

export function PostComposer({ pages }: { pages: Page[] }) {
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPageMode, setPerPageMode] = useState(false);
  const [sharedSchedule, setSharedSchedule] = useState(defaultSchedule);
  const [perPageSchedules, setPerPageSchedules] = useState<Record<string, string>>({});

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const minDt = minSchedule();

  async function uploadFile(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setMedia(data);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function togglePage(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const sched = { ...perPageSchedules };
        delete sched[id];
        setPerPageSchedules(sched);
      } else {
        next.add(id);
        if (perPageMode) setPerPageSchedules((s) => ({ ...s, [id]: sharedSchedule }));
      }
      return next;
    });
  }

  function selectAll() {
    const ids = new Set(pages.map((p) => p.id));
    setSelectedIds(ids);
    if (perPageMode) {
      const schedules: Record<string, string> = {};
      pages.forEach((p) => { schedules[p.id] = sharedSchedule; });
      setPerPageSchedules(schedules);
    }
  }

  function switchToPerPage(enabled: boolean) {
    setPerPageMode(enabled);
    if (enabled) {
      const schedules: Record<string, string> = {};
      selectedIds.forEach((id) => { schedules[id] = sharedSchedule; });
      setPerPageSchedules(schedules);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedIds.size === 0) { setError("Select at least one page."); return; }
    if (!caption.trim() && !media) { setError("Add a caption or media."); return; }
    if (!perPageMode && !sharedSchedule) { setError("Set a schedule time."); return; }
    if (perPageMode) {
      for (const id of selectedIds) {
        if (!perPageSchedules[id]) { setError("Set a schedule for every selected page."); return; }
      }
    }

    const formData = new FormData();
    formData.append("caption", caption);
    if (media) formData.append("mediaAssetId", media.id);
    selectedIds.forEach((id) => formData.append("pageIds", id));
    formData.append("perPageMode", String(perPageMode));
    formData.append("sharedSchedule", sharedSchedule);
    if (perPageMode) {
      Object.entries(perPageSchedules).forEach(([id, sched]) => formData.append(`schedule_${id}`, sched));
    }

    startTransition(async () => {
      const result = await createPostJobs(formData);
      if (result?.error) setError(result.error);
    });
  }

  const isVideo = media?.mime_type.startsWith("video/");

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* LEFT — Caption + Media */}
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
            <div className="border-b border-[#e4e9f2] px-5 py-3">
              <h2 className="text-sm font-semibold">Caption</h2>
            </div>
            <div className="p-5">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your post content..."
                rows={6}
                className="w-full resize-y rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              />
              <p className="mt-1 text-right text-xs text-[#98a2b3]">{caption.length} characters</p>
            </div>
          </section>

          <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
            <div className="border-b border-[#e4e9f2] px-5 py-3">
              <h2 className="text-sm font-semibold">Media</h2>
              <p className="mt-0.5 text-xs text-[#667085]">Image (JPG, PNG, GIF, WebP) or video (MP4) — max 50 MB</p>
            </div>
            <div className="p-5">
              {media ? (
                <div>
                  {isVideo ? (
                    <video src={media.url} controls className="max-h-64 w-full rounded-md object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media.url} alt={media.name} className="max-h-64 w-full rounded-md object-contain" />
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="truncate text-xs text-[#667085]">{media.name}</span>
                    <button
                      type="button"
                      onClick={() => { setMedia(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="ml-3 shrink-0 text-xs text-[#b42318] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-12 text-center transition ${
                    dragging ? "border-[#1877f2] bg-[#f0f6ff]" : "border-[#d9dee8] hover:border-[#1877f2] hover:bg-[#f7f9ff]"
                  }`}
                >
                  {uploading ? (
                    <div className="size-6 animate-spin rounded-full border-2 border-[#1877f2] border-t-transparent" />
                  ) : (
                    <>
                      <svg className="size-8 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
                      </svg>
                      <p className="text-sm font-medium text-[#344054]">
                        Drag & drop or <span className="text-[#1877f2]">browse</span>
                      </p>
                      <p className="text-xs text-[#98a2b3]">JPG, PNG, GIF, WebP, MP4 — max 50 MB</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              />
              {uploadError && <p className="mt-2 text-sm text-[#b42318]">{uploadError}</p>}
            </div>
          </section>
        </div>

        {/* RIGHT — Pages + Schedule */}
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
            <div className="border-b border-[#e4e9f2] px-5 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Pages{" "}
                  <span className="ml-1 rounded-full bg-[#e8f1ff] px-2 py-0.5 text-xs font-medium text-[#175cd3]">
                    {selectedIds.size}/{pages.length}
                  </span>
                </h2>
                <div className="flex gap-2 text-xs text-[#1877f2]">
                  <button type="button" onClick={selectAll} className="hover:underline">Select all</button>
                  <span className="text-[#d9dee8]">|</span>
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="hover:underline">Clear</button>
                </div>
              </div>
            </div>
            <div className="max-h-72 divide-y divide-[#f2f4f7] overflow-y-auto">
              {pages.map((page) => {
                const checked = selectedIds.has(page.id);
                return (
                  <label
                    key={page.id}
                    className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-[#f8fafc] ${checked ? "bg-[#f7f9ff]" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePage(page.id)}
                      className="size-4 rounded border-[#cfd6e3] accent-[#1877f2]"
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e8f1ff] text-xs font-bold text-[#175cd3]">
                        {page.page_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#101828]">{page.page_name}</p>
                        <p className="font-mono text-xs text-[#98a2b3]">{page.page_id}</p>
                      </div>
                    </div>
                    {page.token_status !== "active" && (
                      <span className="shrink-0 rounded-md bg-[#fff4e5] px-1.5 py-0.5 text-xs font-medium text-[#b54708]">
                        Token error
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
            <div className="border-b border-[#e4e9f2] px-5 py-3">
              <h2 className="text-sm font-semibold">Schedule</h2>
            </div>
            <div className="p-5">
              <div className="mb-4 flex rounded-md border border-[#cfd6e3] p-0.5">
                {[{ label: "Shared time", value: false }, { label: "Per page", value: true }].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => switchToPerPage(value)}
                    className={`flex-1 rounded-[5px] py-1.5 text-xs font-medium transition ${
                      perPageMode === value ? "bg-[#1877f2] text-white shadow-sm" : "text-[#667085] hover:text-[#344054]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!perPageMode ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#344054]">Publish time</label>
                  <input
                    type="datetime-local"
                    value={sharedSchedule}
                    min={minDt}
                    onChange={(e) => setSharedSchedule(e.target.value)}
                    className="w-full rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                  />
                </div>
              ) : selectedIds.size === 0 ? (
                <p className="text-center text-sm text-[#98a2b3]">Select at least one page to set schedules.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {pages.filter((p) => selectedIds.has(p.id)).map((page) => (
                    <div key={page.id}>
                      <label className="mb-1 block truncate text-xs font-medium text-[#344054]">{page.page_name}</label>
                      <input
                        type="datetime-local"
                        value={perPageSchedules[page.id] ?? ""}
                        min={minDt}
                        onChange={(e) => setPerPageSchedules((s) => ({ ...s, [page.id]: e.target.value }))}
                        className="w-full rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-end gap-3">
        {error && (
          <p className="w-full rounded-md border border-[#f3b7b7] bg-[#fff1f1] px-4 py-2 text-sm text-[#b42318]">{error}</p>
        )}
        <button
          type="submit"
          disabled={isPending || uploading}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#1877f2] px-6 text-sm font-medium text-white transition hover:bg-[#1668d7] disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Scheduling…
            </>
          ) : (
            `Schedule${selectedIds.size > 0 ? ` for ${selectedIds.size} page${selectedIds.size === 1 ? "" : "s"}` : ""}`
          )}
        </button>
      </div>
    </form>
  );
}
