"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AUTO_DELETE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "Never", value: 0 },
];

export function UploadPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [autoDelete, setAutoDelete] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(0);

  function addTag(value: string) {
    const t = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function onFilesSelected(selected: FileList | null) {
    if (!selected) return;
    const allowed = Array.from(selected).filter((f) =>
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)
    );
    setFiles((prev) => [...prev, ...allowed]);
  }

  async function handleUpload() {
    if (!files.length) { setError("Select at least one image."); return; }
    setError("");
    setUploading(true);
    let uploaded = 0;

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tags", JSON.stringify(tags));
      fd.append("autoDeleteDays", String(autoDelete));
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) uploaded++;
      } catch { /* ignore individual failures */ }
    }

    setUploading(false);
    setSuccess(uploaded);
    setFiles([]);
    setTags([]);
    router.refresh();
    setTimeout(() => setSuccess(0), 3000);
  }

  return (
    <div className="rounded-xl border border-[#eaecf0] bg-white shadow-sm">
      <div className="border-b border-[#eaecf0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#101828]">Upload Images</h2>
      </div>
      <div className="p-5">
        <div className="flex gap-5">
          {/* Drop zone */}
          <div
            className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition ${
              dragging ? "border-[#1877f2] bg-[#f0f6ff]" : "border-[#d0d5dd] hover:border-[#1877f2]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); onFilesSelected(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
          >
            <svg className="size-9 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 1.657A4.502 4.502 0 0118 19.5H6.75z" />
            </svg>
            {files.length > 0 ? (
              <p className="text-sm font-medium text-[#344054]">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
            ) : (
              <>
                <p className="text-sm font-medium text-[#344054]">
                  Drag & drop images here
                  <br />
                  or{" "}
                  <span className="text-[#1877f2]">browse files</span>
                </p>
                <p className="text-xs text-[#98a2b3]">Support: JPG, PNG, WebP (Max 50 MB / image)</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />

          {/* Tags + auto delete */}
          <div className="flex w-44 flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#344054]">Tags</p>
              <div className="min-h-[80px] rounded-lg border border-[#d0d5dd] p-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-[#eff4ff] px-2 py-0.5 text-xs font-medium text-[#6172f3]">
                      {tag}
                      <button type="button" onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="leading-none text-[#98a2b3] hover:text-[#475467]">×</button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={() => tagInput && addTag(tagInput)}
                    placeholder={tags.length === 0 ? "Add tags…" : ""}
                    className="min-w-0 flex-1 text-xs outline-none placeholder:text-[#98a2b3]"
                  />
                </div>
              </div>
              <p className="mt-1 text-[10px] text-[#98a2b3]">Press Enter or comma to add</p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#344054]">Auto delete after</p>
              <select
                value={autoDelete}
                onChange={(e) => setAutoDelete(Number(e.target.value))}
                className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm outline-none focus:border-[#1877f2]"
              >
                {AUTO_DELETE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="mt-auto inline-flex h-9 items-center justify-center rounded-lg bg-[#1877f2] text-sm font-semibold text-white transition hover:bg-[#1668d7] disabled:opacity-50"
            >
              {uploading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Upload Images"
              )}
            </button>
          </div>
        </div>

        {success > 0 && (
          <p className="mt-3 text-sm font-medium text-[#067647]">
            ✓ {success} image{success > 1 ? "s" : ""} uploaded successfully.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
      </div>
    </div>
  );
}
