"use client";

import { useRef, useState, useTransition } from "react";
import { updatePostJob } from "./actions";

type MediaAsset = { id: string; url: string; name: string; mime_type: string };

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function minSchedule() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 5);
  return d.toISOString().slice(0, 16);
}

export function EditForm({
  jobId,
  initialCaption,
  initialScheduledAt,
  initialMedia,
}: {
  jobId: string;
  initialCaption: string;
  initialScheduledAt: string;
  initialMedia: MediaAsset | null;
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [schedule, setSchedule] = useState(() => toDatetimeLocal(initialScheduledAt));

  const [savedMedia, setSavedMedia] = useState<MediaAsset | null>(initialMedia);
  const [newMedia, setNewMedia] = useState<MediaAsset | null>(null);
  const [removed, setRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const displayMedia = newMedia ?? (removed ? null : savedMedia);
  const isVideo = displayMedia?.mime_type.startsWith("video/");
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
      setNewMedia(data);
      setRemoved(false);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeMedia() {
    setNewMedia(null);
    setSavedMedia(null);
    setRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!caption.trim() && !displayMedia) { setError("Add a caption or media."); return; }

    const fd = new FormData();
    fd.append("id", jobId);
    fd.append("caption", caption);
    fd.append("schedule", schedule);
    fd.append("removeMedia", String(removed && !newMedia));
    if (newMedia) fd.append("mediaAssetId", newMedia.id);

    startTransition(async () => {
      const result = await updatePostJob(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Caption */}
      <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        <div className="border-b border-[#e4e9f2] px-5 py-3">
          <h2 className="text-sm font-semibold">Caption</h2>
        </div>
        <div className="p-5">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="Write your post content..."
            className="w-full resize-y rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
          />
          <p className="mt-1 text-right text-xs text-[#98a2b3]">{caption.length} characters</p>
        </div>
      </section>

      {/* Media */}
      <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        <div className="border-b border-[#e4e9f2] px-5 py-3">
          <h2 className="text-sm font-semibold">Media</h2>
          <p className="mt-0.5 text-xs text-[#667085]">JPG, PNG, GIF, WebP, MP4 — max 50 MB</p>
        </div>
        <div className="p-5">
          {displayMedia ? (
            <div>
              {isVideo ? (
                <video src={displayMedia.url} controls className="max-h-56 w-full rounded-md object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayMedia.url} alt={displayMedia.name} className="max-h-56 w-full rounded-md object-contain" />
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="truncate text-xs text-[#667085]">{displayMedia.name}</span>
                <div className="ml-3 flex shrink-0 gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-[#1877f2] hover:underline">
                    Replace
                  </button>
                  <button type="button" onClick={removeMedia} className="text-xs text-[#b42318] hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition ${
                dragging ? "border-[#1877f2] bg-[#f0f6ff]" : "border-[#d9dee8] hover:border-[#1877f2] hover:bg-[#f7f9ff]"
              }`}
            >
              {uploading ? (
                <div className="size-6 animate-spin rounded-full border-2 border-[#1877f2] border-t-transparent" />
              ) : (
                <>
                  <svg className="size-7 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
                  </svg>
                  <p className="text-sm font-medium text-[#344054]">
                    Drag & drop or <span className="text-[#1877f2]">browse</span>
                  </p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
          />
          {uploadError && <p className="mt-2 text-sm text-[#b42318]">{uploadError}</p>}
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        <div className="border-b border-[#e4e9f2] px-5 py-3">
          <h2 className="text-sm font-semibold">Schedule</h2>
        </div>
        <div className="p-5">
          <input
            type="datetime-local"
            value={schedule}
            min={minDt}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
          />
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-[#f3b7b7] bg-[#fff1f1] px-4 py-2 text-sm text-[#b42318]">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/posts"
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-5 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending || uploading}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#1877f2] px-5 text-sm font-medium text-white transition hover:bg-[#1668d7] disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}
