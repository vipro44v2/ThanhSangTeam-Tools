"use client";

import { useState } from "react";
import Link from "next/link";

type PageItem = {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  token_status: string;
  daily_post_limit: number;
  last_post: string | null;
  posts_today: number;
};

function statusBadge(item: PageItem) {
  if (!item.is_active) return { label: "Inactive", cls: "bg-[#f2f4f7] text-[#475467]" };
  if (item.token_status === "active") return { label: "Active", cls: "bg-[#ecfdf3] text-[#067647]" };
  if (item.token_status === "expired") return { label: "Expired", cls: "bg-[#fff1f1] text-[#b42318]" };
  return { label: "Token Error", cls: "bg-[#fff4e5] text-[#b54708]" };
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function PageAvatar({ name }: { name: string }) {
  const colors = [
    "bg-[#eff4ff] text-[#6172f3]",
    "bg-[#ecfdf3] text-[#067647]",
    "bg-[#fff6ed] text-[#ec4a0a]",
    "bg-[#f4f3ff] text-[#7a5af8]",
    "bg-[#fef0c7] text-[#b45309]",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function PagesPanel({ pages }: { pages: PageItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = pages.filter(
    (p) =>
      !query ||
      p.page_name.toLowerCase().includes(query.toLowerCase()) ||
      p.page_id.includes(query),
  );

  return (
    <div className="flex flex-col rounded-xl border border-[#eaecf0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eaecf0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#101828]">Facebook Pages</h2>
        <span className="rounded-full bg-[#eff4ff] px-2 py-0.5 text-xs font-semibold text-[#6172f3]">
          {pages.length}
        </span>
      </div>

      {/* Search */}
      <div className="border-b border-[#f2f4f7] px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#d0d5dd] bg-white px-3 py-1.5">
          <svg className="size-4 shrink-0 text-[#98a2b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#98a2b3]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-[#f9fafb] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#98a2b3]">No pages found</p>
        ) : (
          filtered.map((page) => {
            const badge = statusBadge(page);
            return (
              <div key={page.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#fafafa]">
                <PageAvatar name={page.page_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#101828]">{page.page_name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-[#98a2b3]">
                    ID: {page.page_id.slice(0, 15)}…
                  </p>
                  {page.last_post && (
                    <p className="mt-0.5 text-xs text-[#667085]">
                      Last post: {formatRelative(page.last_post)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[#667085]">
                    Posts today:{" "}
                    <span className="font-medium text-[#344054]">
                      {page.posts_today} / {page.daily_post_limit}
                    </span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-[#eaecf0] px-4 py-3 text-center">
        <Link
          href="/facebook-pages"
          className="text-sm font-medium text-[#1877f2] hover:underline"
        >
          View All Pages →
        </Link>
      </div>
    </div>
  );
}
