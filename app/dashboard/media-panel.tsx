"use client";

import { useMemo, useState } from "react";

type MediaItem = {
  id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  tags: string[];
  created_at: string;
  expires_at: string;
  used_count: number;
};

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function MediaPanel({ media }: { media: MediaItem[] }) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "most-used">("newest");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    media.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [media]);

  const filtered = useMemo(() => {
    let items = [...media];
    if (tagFilter !== "all") items = items.filter((m) => m.tags.includes(tagFilter));
    if (query) items = items.filter((m) => m.file_name.toLowerCase().includes(query.toLowerCase()) || m.tags.some((t) => t.includes(query.toLowerCase())));
    if (sort === "oldest") items.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "most-used") items.sort((a, b) => b.used_count - a.used_count);
    return items;
  }, [media, tagFilter, query, sort]);

  return (
    <div className="rounded-xl border border-[#eaecf0] bg-white shadow-sm">
      <div className="border-b border-[#eaecf0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#101828]">Media Library</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#f2f4f7] px-4 py-3">
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="h-8 rounded-lg border border-[#d0d5dd] px-2 text-xs outline-none focus:border-[#1877f2]"
        >
          <option value="all">All Tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-8 rounded-lg border border-[#d0d5dd] px-2 text-xs outline-none focus:border-[#1877f2]"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-used">Most used</option>
        </select>
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#d0d5dd] px-2.5 py-1">
          <svg className="size-3.5 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media…"
            className="w-32 text-xs outline-none placeholder:text-[#98a2b3]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[#98a2b3]">No media found</div>
      ) : (
        <div className="grid grid-cols-5 gap-0 p-4">
          {filtered.map((item) => {
            const days = daysUntil(item.expires_at);
            const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.created_at));
            return (
              <div key={item.id} className="group relative flex flex-col border border-[#f2f4f7]">
                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden bg-[#f9fafb]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.file_url}
                    alt={item.file_name}
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay actions */}
                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/40 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <input type="checkbox" className="size-3.5 accent-[#1877f2]" />
                    <button className="text-white hover:text-[#93c5fd]">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button className="text-white hover:text-red-300">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="px-1.5 py-1.5">
                  {item.tags[0] && (
                    <span className="inline-block rounded-full bg-[#eff4ff] px-1.5 py-0.5 text-[10px] font-medium text-[#6172f3]">
                      {item.tags[0]}
                    </span>
                  )}
                  <p className="mt-0.5 text-[10px] text-[#667085]">{date}</p>
                  <p className="text-[10px] text-[#98a2b3]">Used: {item.used_count}×</p>
                  {days > 0 ? (
                    <p className="text-[10px] text-[#98a2b3]">Expires: {days}d</p>
                  ) : (
                    <p className="text-[10px] text-[#b42318]">Expired</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
