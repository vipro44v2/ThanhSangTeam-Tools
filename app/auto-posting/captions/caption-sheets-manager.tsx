"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCaptionSheet } from "../actions";

type SheetItem = {
  id: string;
  name: string;
  caption_count: number;
  preview: string[];
  created_at: string;
  updated_at: string;
  rules_count: number;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function CaptionSheetsManager({ sheets }: { sheets: SheetItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingSheet, setEditingSheet] = useState<SheetItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    const name = nameRef.current?.value.trim();
    if (!file) { setError("Please select a file."); return; }
    if (!name) { setError("Sheet name is required."); return; }

    setUploading(true);
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.set("file", file);
    fd.set("name", name);
    if (editingSheet) fd.set("sheetId", editingSheet.id);

    try {
      const res = await fetch("/api/captions/import", { method: "POST", body: fd });
      const data = await res.json() as { error?: string; count?: number; name?: string };
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      setSuccess(`Saved "${data.name}" with ${data.count} captions.`);
      setEditingSheet(null);
      if (fileRef.current) fileRef.current.value = "";
      if (nameRef.current) nameRef.current.value = "";
      router.refresh();
    } catch {
      setError("Connection error.");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(sheet: SheetItem) {
    const fd = new FormData();
    fd.set("id", sheet.id);
    startTransition(async () => {
      await deleteCaptionSheet(fd);
      router.refresh();
    });
  }

  function startEdit(sheet: SheetItem) {
    setEditingSheet(sheet);
    setError("");
    setSuccess("");
    setTimeout(() => {
      if (nameRef.current) nameRef.current.value = sheet.name;
    }, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload form */}
      <div className="rounded-lg border border-[#d9dee8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#101828]">
          {editingSheet ? `Update sheet: ${editingSheet.name}` : "Upload new sheet"}
        </h2>
        <p className="mt-1 text-xs text-[#667085]">
          First column of each row = one caption. Supports .txt, .csv, .xlsx, .xls
        </p>

        <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[#344054]">
              Sheet name
              <input
                ref={nameRef}
                placeholder="e.g. June Captions"
                defaultValue={editingSheet?.name ?? ""}
                className="h-9 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-[#344054]">
              File (.txt / .csv / .xlsx / .xls)
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="h-9 rounded-md border border-[#cfd6e3] px-3 text-sm text-[#667085] file:mr-3 file:rounded file:border-0 file:bg-[#f2f4f7] file:px-2 file:py-1 file:text-xs file:font-medium file:text-[#344054] outline-none focus:border-[#1877f2]"
              />
            </label>
          </div>

          {error && <p className="rounded-md bg-[#fff1f1] px-3 py-2 text-sm text-[#b42318]">{error}</p>}
          {success && <p className="rounded-md bg-[#ecfdf3] px-3 py-2 text-sm text-[#067647]">{success}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-md bg-[#1877f2] px-4 text-sm font-semibold text-white hover:bg-[#1668d7] disabled:opacity-50"
            >
              {uploading ? "Processing..." : editingSheet ? "Update" : "Upload & Save"}
            </button>
            {editingSheet && (
              <button
                type="button"
                onClick={() => { setEditingSheet(null); setError(""); }}
                className="inline-flex h-9 items-center rounded-md border border-[#cfd6e3] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Sheet list */}
      {sheets.length === 0 ? (
        <div className="rounded-lg border border-[#d9dee8] bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-[#101828]">No sheets yet</p>
          <p className="mt-1 text-sm text-[#667085]">Upload your first caption file above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="rounded-lg border border-[#d9dee8] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <svg className="size-4 shrink-0 text-[#1877f2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                    <p className="font-semibold text-[#101828]">{sheet.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#667085]">
                    {sheet.caption_count} captions · updated {formatDate(sheet.updated_at)}
                    {sheet.rules_count > 0 && (
                      <span className="ml-2 rounded-full bg-[#eff6ff] px-2 py-0.5 font-medium text-[#175cd3]">
                        Used by {sheet.rules_count} rule{sheet.rules_count === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                  {sheet.preview.length > 0 && (
                    <div className="mt-2 flex flex-col gap-0.5">
                      {sheet.preview.map((c, i) => (
                        <p key={i} className="truncate text-xs text-[#475467]">
                          · {c}
                        </p>
                      ))}
                      {sheet.caption_count > 3 && (
                        <p className="text-xs text-[#98a2b3]">and {sheet.caption_count - 3} more...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(sheet)}
                    className="inline-flex h-8 items-center rounded-md border border-[#cfd6e3] px-3 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                  >
                    Replace file
                  </button>
                  <button
                    type="button"
                    disabled={isPending || sheet.rules_count > 0}
                    onClick={() => handleDelete(sheet)}
                    title={sheet.rules_count > 0 ? "In use by a rule — cannot delete" : "Delete sheet"}
                    className="inline-flex h-8 items-center rounded-md border border-[#f0b6b6] px-3 text-xs font-medium text-[#b42318] hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
