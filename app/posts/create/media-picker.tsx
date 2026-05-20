"use client";

import { useEffect, useMemo, useState } from "react";

type LibraryAsset = {
  id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  tags: string[];
};

type MediaPickerProps = {
  currentIds?: string[];
  onSelect: (assets: LibraryAsset[]) => void;
  onClose: () => void;
  multiSelect?: boolean;
};

export function MediaPicker({ currentIds = [], onSelect, onClose, multiSelect = false }: MediaPickerProps) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentIds));

  useEffect(() => {
    fetch("/api/media?status=available&limit=120")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (tagFilter !== "all" && !a.tags.includes(tagFilter)) return false;
      if (q && !a.file_name.toLowerCase().includes(q) && !a.tags.some((t) => t.includes(q))) return false;
      return true;
    });
  }, [assets, query, tagFilter]);

  const selectedAssets = assets.filter((a) => selectedIds.has(a.id));

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiSelect) next.clear();
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirm() {
    if (selectedAssets.length > 0) onSelect(selectedAssets);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="animate-backdrop-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-modal-in relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eaecf0] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#101828]">Media Library</h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              {assets.length} available image{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#f2f4f7] px-6 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#d0d5dd] px-3 py-1.5">
            <svg className="size-4 shrink-0 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename or tag…"
              className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#98a2b3]"
              autoFocus
            />
          </div>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-9 rounded-lg border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#1877f2]"
          >
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-2 border-[#1877f2] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-[#98a2b3]">
              No images match your search.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {filtered.map((asset) => {
                const isSelected = selectedIds.has(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                      isSelected
                        ? "border-[#1877f2] shadow-md shadow-[#1877f2]/20"
                        : "border-transparent hover:border-[#d0d5dd]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.file_url}
                      alt={asset.file_name}
                      className="h-full w-full object-cover"
                    />
                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1877f2]/20">
                        <div className="flex size-7 items-center justify-center rounded-full bg-[#1877f2] shadow-lg">
                          <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Tag chip */}
                    {asset.tags[0] && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                        <p className="truncate text-[10px] text-white">{asset.tags[0]}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#eaecf0] px-6 py-4">
          <div className="text-sm text-[#667085]">
            {selectedAssets.length > 0 ? (
              <span className="font-medium text-[#344054]">
                {selectedAssets.length === 1
                  ? selectedAssets[0].file_name
                  : `${selectedAssets.length} images selected`}
              </span>
            ) : (
              "No image selected"
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#d0d5dd] px-4 py-2 text-sm font-semibold text-[#344054] hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedAssets.length === 0}
              className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1668d7] disabled:opacity-40"
            >
              {selectedAssets.length > 1 ? `Add ${selectedAssets.length} images` : "Use this image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
