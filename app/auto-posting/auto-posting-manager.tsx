"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import {
  bulkUpsertAutoPostingRules,
  toggleAutoPostingRule,
  deleteAutoPostingRule,
  generateNow,
  bulkAssignPageCategory,
} from "./actions";

type Category = { id: string; name: string; color: string };
type SheetOption = { id: string; name: string; count: number };

type Rule = {
  id: string;
  is_active: boolean;
  schedule_type: string;
  posts_count: number;
  start_hour: number;
  end_hour: number;
  tag_filter: string[];
  captions: string[];
  caption_sheet_id: string | null;
};

type PageItem = {
  id: string;
  page_name: string;
  daily_post_limit: number;
  token_status: string;
  category_id: string | null;
  rule: Rule | null;
};

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "day" },
  { value: "weekly", label: "week" },
  { value: "monthly", label: "month" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ruleLabel(rule: Rule) {
  const period = SCHEDULE_OPTIONS.find((o) => o.value === rule.schedule_type)?.label ?? rule.schedule_type;
  return `${rule.posts_count}/${period} · ${pad(rule.start_hour)}:00–${pad(rule.end_hour)}:00`;
}

export function AutoPostingManager({
  pages,
  knownTags,
  sheetOptions,
  categories,
}: {
  pages: PageItem[];
  knownTags: string[];
  sheetOptions: SheetOption[];
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryFilter, setCategoryFilter] = useState<"all" | "uncategorized" | string>("all");

  // Page selection & bulk config
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  // Bulk form
  const [scheduleType, setScheduleType] = useState("daily");
  const [postsCount, setPostsCount] = useState(1);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [tagFilter, setTagFilter] = useState("");
  const [captions, setCaptions] = useState("");
  const [selectedSheetId, setSelectedSheetId] = useState("");


  const filteredPages = useMemo(() => {
    if (categoryFilter === "all") return pages;
    if (categoryFilter === "uncategorized") return pages.filter((p) => !p.category_id);
    return pages.filter((p) => p.category_id === categoryFilter);
  }, [pages, categoryFilter]);

  const grouped = useMemo(() => {
    if (categoryFilter !== "all") return null; // flat when filtered
    const map = new Map<string, PageItem[]>();
    map.set("__uncategorized__", []);
    for (const cat of categories) map.set(cat.id, []);
    for (const page of pages) {
      const key = page.category_id ?? "__uncategorized__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(page);
    }
    return map;
  }, [pages, categories, categoryFilter]);

  const allFilteredSelected =
    filteredPages.length > 0 && filteredPages.every((p) => selectedIds.has(p.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); filteredPages.forEach((p) => n.delete(p.id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); filteredPages.forEach((p) => n.add(p.id)); return n; });
      const first = filteredPages.find((p) => p.rule);
      if (first?.rule) prefillForm(first.rule);
    }
    setMessage("");
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else {
        if (n.size === 0) { const p = pages.find((x) => x.id === id); if (p?.rule) prefillForm(p.rule); }
        n.add(id);
      }
      return n;
    });
    setMessage("");
  }

  function prefillForm(rule: Rule) {
    setScheduleType(rule.schedule_type);
    setPostsCount(rule.posts_count);
    setStartHour(rule.start_hour);
    setEndHour(rule.end_hour);
    setTagFilter(rule.tag_filter.join(", "));
    setCaptions(rule.captions.join("\n"));
    setSelectedSheetId(rule.caption_sheet_id ?? "");
  }

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const fd = new FormData();
    fd.set("pageIds", JSON.stringify([...selectedIds]));
    fd.set("scheduleType", scheduleType);
    fd.set("postsCount", String(postsCount));
    fd.set("startHour", String(startHour));
    fd.set("endHour", String(endHour));
    fd.set("tagFilter", tagFilter);
    fd.set("captions", captions);
    fd.set("captionSheetId", selectedSheetId);
    startTransition(async () => {
      const result = await bulkUpsertAutoPostingRules(fd);
      if (result.error) { setMessage(result.error); return; }
      setMessage(`Applied to ${result.count} page${result.count === 1 ? "" : "s"}.`);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleBulkMoveCategory(categoryId: string | null) {
    if (selectedIds.size === 0) return;
    const fd = new FormData();
    fd.set("pageIds", JSON.stringify([...selectedIds]));
    fd.set("categoryId", categoryId ?? "");
    startTransition(async () => {
      await bulkAssignPageCategory(fd);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleToggle(page: PageItem) {
    if (!page.rule) return;
    const fd = new FormData();
    fd.set("pageId", page.id);
    fd.set("isActive", String(!page.rule.is_active));
    startTransition(async () => { await toggleAutoPostingRule(fd); router.refresh(); });
  }

  function handleDelete(page: PageItem) {
    const fd = new FormData();
    fd.set("pageId", page.id);
    startTransition(async () => { await deleteAutoPostingRule(fd); router.refresh(); });
  }

  function handleGenerateNow(page: PageItem) {
    if (!page.rule) return;
    const fd = new FormData();
    fd.set("ruleId", page.rule.id);
    startTransition(async () => {
      const result = await generateNow(fd);
      setMessage(result.error ? result.error
        : result.generated === 0 ? `${page.page_name}: Queue is full for the next 14 days.`
        : `${page.page_name}: Generated ${result.generated} new post${result.generated === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  const maxPosts = scheduleType === "daily" ? 10 : scheduleType === "weekly" ? 30 : 60;

  const pagesToRender: Array<{ groupLabel: string | null; groupColor: string | null; items: PageItem[] }> =
    grouped
      ? [
          ...categories
            .filter((c) => (grouped.get(c.id)?.length ?? 0) > 0)
            .map((c) => ({ groupLabel: c.name, groupColor: c.color, items: grouped.get(c.id)! })),
          ...(grouped.get("__uncategorized__")?.length
            ? [{ groupLabel: "Uncategorized", groupColor: null, items: grouped.get("__uncategorized__")! }]
            : []),
        ]
      : [{ groupLabel: null, groupColor: null, items: filteredPages }];

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter chips — read only, manage via Facebook Pages */}
      {categories.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-1.5 pb-1 sm:min-w-0 sm:flex-wrap sm:pb-0">
          {(["all", "uncategorized", ...categories.map((c) => c.id)]).map((key) => {
            const cat = categories.find((c) => c.id === key);
            const label = key === "all" ? "All" : key === "uncategorized" ? "Uncategorized" : cat?.name ?? key;
            const active = categoryFilter === key;
            return (
              <button key={key} type="button" onClick={() => setCategoryFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-[#1877f2] text-white" : "bg-white text-[#475467] ring-1 ring-[#d9dee8] hover:bg-[#f8fafc]"}`}>
                {cat && <span className="size-2 rounded-full" style={{ background: cat.color }} />}
                {label}
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* Bulk config panel */}
      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-[#1877f2]/40 bg-[#eff6ff] shadow-sm">
          <div className="grid gap-3 border-b border-[#1877f2]/20 px-4 py-3 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <p className="text-sm font-semibold text-[#175cd3]">
              {selectedIds.size} page{selectedIds.size === 1 ? "" : "s"} selected
            </p>
            {/* Bulk category assign */}
            {categories.length > 0 && (
              <div className="min-w-0">
                <div className="mb-1 text-xs text-[#175cd3] sm:hidden">Move to</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:items-center sm:overflow-visible sm:pb-0">
                <span className="hidden shrink-0 text-xs text-[#175cd3] sm:inline">Move to:</span>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleBulkMoveCategory(cat.id)}
                    disabled={isPending}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium ring-1 ring-[#d9dee8] hover:ring-[#1877f2] disabled:opacity-50"
                  >
                    <span className="size-2 rounded-full" style={{ background: cat.color }} />
                    {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleBulkMoveCategory(null)}
                  disabled={isPending}
                  className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs text-[#667085] ring-1 ring-[#d9dee8] hover:text-[#344054] disabled:opacity-50"
                >
                  Remove category
                </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="justify-self-start text-xs text-[#175cd3] hover:underline lg:justify-self-end"
            >
              Deselect all
            </button>
          </div>

          <form onSubmit={handleApply} className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#344054]">Schedule</label>
              <div className="flex gap-1.5">
                <input type="number" min={1} max={maxPosts} value={postsCount}
                  onChange={(e) => setPostsCount(Number(e.target.value))}
                  className="h-9 w-16 rounded-md border border-[#cfd6e3] bg-white px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20" />
                <select value={scheduleType} onChange={(e) => { setScheduleType(e.target.value); setPostsCount(1); }}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] bg-white px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20">
                  {SCHEDULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>posts/{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#344054]">Time window (VN)</label>
              <div className="flex items-center gap-1.5">
                <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] bg-white px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)}:00</option>)}
                </select>
                <span className="text-xs text-[#667085]">–</span>
                <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] bg-white px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{pad(i)}:00</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#344054]">Media tags <span className="font-normal text-[#98a2b3]">(empty = all)</span></label>
              <input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="nurse, meme"
                list="bulk-tag-suggestions"
                className="h-9 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20" />
              <datalist id="bulk-tag-suggestions">{knownTags.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#344054]">Caption</label>
              {sheetOptions.length > 0 ? (
                <select value={selectedSheetId} onChange={(e) => setSelectedSheetId(e.target.value)}
                  className="h-9 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20">
                  <option value="">-- Manual --</option>
                  {sheetOptions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
                </select>
              ) : null}
              {!selectedSheetId && (
                <textarea value={captions} onChange={(e) => setCaptions(e.target.value)}
                  placeholder={"Nurse life ✨\nEvery shift is a new adventure 🏥"}
                  rows={2}
                  className="resize-none rounded-md border border-[#cfd6e3] bg-white px-3 py-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20" />
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2 sm:flex sm:items-end xl:col-span-4">
              {message && (
                <p className={`flex-1 rounded-md px-3 py-2 text-sm ${message.startsWith("Applied") || message.includes("Generated") ? "bg-[#ecfdf3] text-[#067647]" : message.includes("full") ? "bg-[#fffbeb] text-[#b45309]" : "bg-[#fff1f1] text-[#b42318]"}`}>
                  {message}
                </p>
              )}
              <button type="submit" disabled={isPending || endHour <= startHour}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1877f2] px-4 text-sm font-semibold text-white hover:bg-[#1668d7] disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">
                {isPending ? "Saving..." : `Apply to ${selectedIds.size} page${selectedIds.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Page list grouped by category */}
      <div className="overflow-hidden rounded-lg border border-[#d9dee8] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e9f2] bg-[#f8fafc] px-4 py-2.5">
          <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll}
            className="size-4 rounded border-[#cfd6e3] accent-[#1877f2]" />
          <span className="text-xs font-medium text-[#667085]">
            {selectedIds.size > 0
              ? `${selectedIds.size} / ${filteredPages.length} page${filteredPages.length === 1 ? "" : "s"} selected`
              : `${filteredPages.length} page${filteredPages.length === 1 ? "" : "s"}`}
          </span>
          {selectedIds.size > 0 && (
            <span className="w-full text-xs text-[#1877f2] sm:ml-auto sm:w-auto">Adjust settings above then click Apply</span>
          )}
        </div>

        {pagesToRender.map((group, gi) => (
          <div key={gi}>
            {group.groupLabel && (
              <div className="flex items-center gap-2 border-t border-[#f2f4f7] bg-[#fafafa] px-4 py-2">
                {group.groupColor ? (
                  <span className="size-2.5 rounded-full" style={{ background: group.groupColor }} />
                ) : (
                  <span className="size-2.5 rounded-full bg-[#d0d5dd]" />
                )}
                <span className="text-xs font-semibold text-[#475467]">{group.groupLabel}</span>
                <span className="text-xs text-[#98a2b3]">({group.items.length})</span>
              </div>
            )}
            <div className="divide-y divide-[#edf1f7]">
              {group.items.map((page) => {
                const selected = selectedIds.has(page.id);
                const pageCat = categories.find((c) => c.id === page.category_id);
                return (
                  <div
                    key={page.id}
                    className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-3 px-4 py-3.5 transition-colors sm:flex sm:items-center ${selected ? "bg-[#f5f9ff]" : "hover:bg-[#fafafa]"}`}
                  >
                    <input type="checkbox" checked={selected} onChange={() => toggleOne(page.id)}
                      className="size-4 shrink-0 rounded border-[#cfd6e3] accent-[#1877f2]" />

                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f1ff] text-xs font-bold text-[#1877f2]">
                      {page.page_name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#101828]">{page.page_name}</p>
                        {page.token_status !== "active" && (
                          <span className="shrink-0 rounded-full bg-[#fff4e5] px-2 py-0.5 text-xs font-medium text-[#b54708]">Token error</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#667085]">
                        {page.rule ? ruleLabel(page.rule) : "Not configured"}
                      </p>
                    </div>

                    {/* Category dot — display only */}
                    {pageCat && (
                      <span
                        title={pageCat.name}
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: pageCat.color }}
                      />
                    )}

                    {/* Per-page actions */}
                    {page.rule && (
                      <div className="col-span-4 flex min-w-0 shrink-0 items-center justify-end gap-2 sm:col-span-1">
                        <button type="button" onClick={() => handleGenerateNow(page)} disabled={isPending}
                          title="Generate now"
                          className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-[#cfd6e3] px-2 text-xs font-medium text-[#344054] hover:bg-[#f8fafc] disabled:opacity-40 sm:h-7 sm:flex-none">
                          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                          </svg>
                          <span className="sm:inline">Generate</span>
                        </button>
                        <button type="button" onClick={() => handleToggle(page)} disabled={isPending}
                          title={page.rule.is_active ? "Disable" : "Enable"}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${page.rule.is_active ? "bg-[#1877f2]" : "bg-[#d0d5dd]"}`}>
                          <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition-transform ${page.rule.is_active ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                        <button type="button" onClick={() => handleDelete(page)} disabled={isPending}
                          title="Delete rule"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#f0b6b6] text-xs text-[#b42318] hover:bg-[#fff1f1] disabled:opacity-40 sm:size-7">
                          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
