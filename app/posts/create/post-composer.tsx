"use client";

import { useRef, useState, useTransition } from "react";
import { createPostJobs } from "./actions";
import { MediaPicker } from "./media-picker";

type Page = { id: string; page_id: string; page_name: string; token_status: string };
type MediaAsset = { id: string; url: string; name: string; mime_type: string };

const VN_MS = 7 * 60 * 60 * 1000;

function vnNow() {
  return new Date(Date.now() + VN_MS);
}

function toVnLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [d.getUTCFullYear(), pad(d.getUTCMonth() + 1), pad(d.getUTCDate())].join("-") +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function todayVn(): string {
  const d = vnNow();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function defaultSchedule() {
  const d = vnNow();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(9, 0, 0, 0);
  return toVnLocal(d);
}

function minSchedule() {
  return toVnLocal(new Date(Date.now() + VN_MS + 5 * 60 * 1000));
}

function datetimeLocalToIso(value: string): string {
  return value;
}

function generateRandomDatetime(
  dateFrom: string,
  dateTo: string,
  timeFrom: string,
  timeTo: string,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [fy, fm, fd] = dateFrom.split("-").map(Number);
  const [ty, tm, td] = dateTo.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.round((toMs - fromMs) / dayMs));
  const pickedMs = fromMs + Math.floor(Math.random() * (days + 1)) * dayMs;
  const d = new Date(pickedMs);

  const [fh, fmin] = timeFrom.split(":").map(Number);
  const [th, tmin] = timeTo.split(":").map(Number);
  const fromMinutes = fh * 60 + fmin;
  const toMinutes = th * 60 + tmin;
  const range = Math.max(1, toMinutes - fromMinutes);
  const pickedMinutes = fromMinutes + Math.floor(Math.random() * range);

  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const timeStr = `${pad(Math.floor(pickedMinutes / 60))}:${pad(pickedMinutes % 60)}`;
  return `${dateStr}T${timeStr}`;
}

const MAX_MEDIA = 10;

export function PostComposer({ pages }: { pages: Page[] }) {
  const [caption, setCaption] = useState("");
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduleMode, setScheduleMode] = useState<"queue" | "shared" | "perPage" | "random">("shared");
  const [sharedSchedule, setSharedSchedule] = useState(defaultSchedule);
  const [perPageSchedules, setPerPageSchedules] = useState<Record<string, string>>({});
  const [randomDateFrom, setRandomDateFrom] = useState(() => todayVn());
  const [randomDateTo, setRandomDateTo] = useState(() => todayVn());
  const [randomTimeFrom, setRandomTimeFrom] = useState("08:00");
  const [randomTimeTo, setRandomTimeTo] = useState("22:00");
  const [randomSchedules, setRandomSchedules] = useState<Record<string, string>>({});

  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const minDt = minSchedule();

  function addToList(asset: MediaAsset) {
    setMediaList((prev) => {
      if (prev.some((m) => m.id === asset.id)) return prev;
      return [...prev, asset].slice(0, MAX_MEDIA);
    });
  }

  function removeFromList(id: string) {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFile(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      addToList({ id: data.id, url: data.url, name: data.name, mime_type: data.mime_type });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function generateRandom(ids: Set<string>) {
    const schedules: Record<string, string> = {};
    ids.forEach((id) => {
      schedules[id] = generateRandomDatetime(randomDateFrom, randomDateTo, randomTimeFrom, randomTimeTo);
    });
    setRandomSchedules(schedules);
  }

  function togglePage(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const sched = { ...perPageSchedules };
        delete sched[id];
        setPerPageSchedules(sched);
        setRandomSchedules((s) => { const r = { ...s }; delete r[id]; return r; });
      } else {
        next.add(id);
        if (scheduleMode === "perPage") setPerPageSchedules((s) => ({ ...s, [id]: sharedSchedule }));
      }
      return next;
    });
  }

  function selectAll() {
    const ids = new Set(pages.map((p) => p.id));
    setSelectedIds(ids);
    if (scheduleMode === "perPage") {
      const schedules: Record<string, string> = {};
      pages.forEach((p) => { schedules[p.id] = sharedSchedule; });
      setPerPageSchedules(schedules);
    }
  }

  function switchMode(mode: "queue" | "shared" | "perPage" | "random") {
    setScheduleMode(mode);
    if (mode === "perPage") {
      const schedules: Record<string, string> = {};
      selectedIds.forEach((id) => { schedules[id] = sharedSchedule; });
      setPerPageSchedules(schedules);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedIds.size === 0) { setError("Select at least one page."); return; }
    if (!caption.trim() && mediaList.length === 0) { setError("Add a caption or media."); return; }
    if (scheduleMode === "shared" && !sharedSchedule) { setError("Set a schedule time."); return; }
    if (scheduleMode === "perPage") {
      for (const id of selectedIds) {
        if (!perPageSchedules[id]) { setError("Set a schedule for every selected page."); return; }
      }
    }
    if (scheduleMode === "random") {
      for (const id of selectedIds) {
        if (!randomSchedules[id]) { setError("Click \"Randomize\" to generate times first."); return; }
      }
    }

    const formData = new FormData();
    formData.append("caption", caption);
    mediaList.forEach((m) => formData.append("mediaAssetIds", m.id));
    selectedIds.forEach((id) => formData.append("pageIds", id));
    formData.append("timezoneOffset", String(new Date().getTimezoneOffset()));

    if (scheduleMode === "random") {
      formData.append("scheduleMode", "perPage");
      Object.entries(randomSchedules).forEach(([id, sched]) => {
        formData.append(`schedule_${id}`, datetimeLocalToIso(sched));
      });
    } else {
      formData.append("scheduleMode", scheduleMode);
      if (scheduleMode !== "queue") {
        formData.append("sharedSchedule", datetimeLocalToIso(sharedSchedule));
      }
      if (scheduleMode === "perPage") {
        Object.entries(perPageSchedules).forEach(([id, sched]) => {
          formData.append(`schedule_${id}`, datetimeLocalToIso(sched));
        });
      }
    }

    startTransition(async () => {
      const result = await createPostJobs(formData);
      if (result?.error) setError(result.error);
    });
  }

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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Media</h2>
                  <p className="mt-0.5 text-xs text-[#667085]">
                    Up to {MAX_MEDIA} images/videos · JPG, PNG, GIF, WebP, MP4
                  </p>
                </div>
                {mediaList.length < MAX_MEDIA && (
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd6e3] px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                  >
                    <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    From Library
                  </button>
                )}
              </div>
            </div>
            <div className="p-5">
              {mediaList.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {mediaList.map((m) => (
                    <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[#e4e9f2]">
                      {m.mime_type.startsWith("video/") ? (
                        <video src={m.url} className="h-full w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromList(m.id)}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                      >
                        <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {mediaList.length < MAX_MEDIA && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#d9dee8] text-[#98a2b3] hover:border-[#1877f2] hover:text-[#1877f2]"
                    >
                      {uploading ? (
                        <div className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              )}
              {mediaList.length === 0 && (
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
                      <p className="text-xs text-[#98a2b3]">Up to {MAX_MEDIA} files</p>
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

          {showPicker && (
            <MediaPicker
              currentIds={mediaList.map((m) => m.id)}
              multiSelect
              onSelect={(assets) => {
                assets.forEach((a) =>
                  addToList({ id: a.id, url: a.file_url, name: a.file_name, mime_type: a.mime_type }),
                );
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          )}
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
              <div className="mb-4 grid grid-cols-4 rounded-md border border-[#cfd6e3] p-0.5">
                {(["queue", "shared", "perPage", "random"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => switchMode(mode)}
                    className={`rounded-[5px] py-1.5 text-xs font-medium transition ${
                      scheduleMode === mode ? "bg-[#1877f2] text-white shadow-sm" : "text-[#667085] hover:text-[#344054]"
                    }`}
                  >
                    {mode === "queue" ? "Auto" : mode === "shared" ? "Shared" : mode === "perPage" ? "Per page" : "Random"}
                  </button>
                ))}
              </div>

              {scheduleMode === "queue" ? (
                <div className="rounded-lg border border-[#e4e9f2] bg-[#f8faff] px-4 py-4 text-sm text-[#344054]">
                  <p className="font-medium">Posts will be added to each page&apos;s queue automatically.</p>
                  <p className="mt-1 text-xs text-[#667085]">
                    Slots are spread evenly from 08:00 – 22:00 based on each page&apos;s daily limit. The next open slot is picked automatically.
                  </p>
                </div>
              ) : scheduleMode === "shared" ? (
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
              ) : scheduleMode === "random" ? (
                <div className="flex flex-col gap-4">
                  {/* Range config */}
                  <div className="rounded-lg border border-[#e4e9f2] bg-[#f8faff] p-4">
                    <p className="mb-3 text-xs font-semibold text-[#344054]">Date & time range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#667085]">From date</label>
                        <input
                          type="date"
                          value={randomDateFrom}
                          min={todayVn()}
                          onChange={(e) => setRandomDateFrom(e.target.value)}
                          className="w-full rounded-md border border-[#cfd6e3] px-2 py-1.5 text-xs outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#667085]">To date</label>
                        <input
                          type="date"
                          value={randomDateTo}
                          min={randomDateFrom}
                          onChange={(e) => setRandomDateTo(e.target.value)}
                          className="w-full rounded-md border border-[#cfd6e3] px-2 py-1.5 text-xs outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#667085]">Start time</label>
                        <input
                          type="time"
                          value={randomTimeFrom}
                          onChange={(e) => setRandomTimeFrom(e.target.value)}
                          className="w-full rounded-md border border-[#cfd6e3] px-2 py-1.5 text-xs outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#667085]">End time</label>
                        <input
                          type="time"
                          value={randomTimeTo}
                          onChange={(e) => setRandomTimeTo(e.target.value)}
                          className="w-full rounded-md border border-[#cfd6e3] px-2 py-1.5 text-xs outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={selectedIds.size === 0}
                      onClick={() => generateRandom(selectedIds)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#cfd6e3] bg-white py-2 text-xs font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Randomize all
                    </button>
                  </div>

                  {/* Per-page generated times */}
                  {selectedIds.size === 0 ? (
                    <p className="text-center text-sm text-[#98a2b3]">Select at least one page to generate times.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pages.filter((p) => selectedIds.has(p.id)).map((page) => (
                        <div key={page.id}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="truncate text-xs font-medium text-[#344054]">{page.page_name}</label>
                            <button
                              type="button"
                              title="Randomize this page"
                              onClick={() => {
                                const t = generateRandomDatetime(randomDateFrom, randomDateTo, randomTimeFrom, randomTimeTo);
                                setRandomSchedules((s) => ({ ...s, [page.id]: t }));
                              }}
                              className="shrink-0 rounded p-0.5 text-[#98a2b3] hover:text-[#1877f2]"
                            >
                              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                            </button>
                          </div>
                          <input
                            type="datetime-local"
                            value={randomSchedules[page.id] ?? ""}
                            min={minDt}
                            onChange={(e) => setRandomSchedules((s) => ({ ...s, [page.id]: e.target.value }))}
                            className="w-full rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
