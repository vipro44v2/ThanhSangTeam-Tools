"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAutoPostingRule, toggleAutoPostingRule, deleteAutoPostingRule, generateNow } from "./actions";

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
  rule: Rule | null;
};


const SCHEDULE_OPTIONS = [
  { value: "daily", label: "per day" },
  { value: "weekly", label: "per week" },
  { value: "monthly", label: "per month" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function scheduleLabel(rule: Rule) {
  const t = SCHEDULE_OPTIONS.find((o) => o.value === rule.schedule_type)?.label ?? rule.schedule_type;
  return `${rule.posts_count} posts ${t}`;
}

export function RuleCard({ page, knownTags, sheetOptions }: { page: PageItem; knownTags: string[]; sheetOptions: SheetOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!page.rule);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [scheduleType, setScheduleType] = useState(page.rule?.schedule_type ?? "daily");
  const [postsCount, setPostsCount] = useState(page.rule?.posts_count ?? 1);
  const [startHour, setStartHour] = useState(page.rule?.start_hour ?? 8);
  const [endHour, setEndHour] = useState(page.rule?.end_hour ?? 22);
  const [tagFilter, setTagFilter] = useState(page.rule?.tag_filter.join(", ") ?? "");
  const [captions, setCaptions] = useState(page.rule?.captions.join("\n") ?? "");
  const [selectedSheetId, setSelectedSheetId] = useState(page.rule?.caption_sheet_id ?? "");

  const maxPosts = scheduleType === "daily" ? 10 : scheduleType === "weekly" ? 30 : 60;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("pageId", page.id);
    fd.set("scheduleType", scheduleType);
    fd.set("postsCount", String(postsCount));
    fd.set("startHour", String(startHour));
    fd.set("endHour", String(endHour));
    fd.set("tagFilter", tagFilter);
    fd.set("captions", captions);
    fd.set("captionSheetId", selectedSheetId);

    startTransition(async () => {
      const result = await upsertAutoPostingRule(fd);
      if (result.error) { setMessage(result.error); return; }
      setMessage("");
      setEditing(false);
      router.refresh();
    });
  }

  function handleToggle() {
    if (!page.rule) return;
    const fd = new FormData();
    fd.set("pageId", page.id);
    fd.set("isActive", String(!page.rule.is_active));
    startTransition(async () => {
      await toggleAutoPostingRule(fd);
      router.refresh();
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("pageId", page.id);
    startTransition(async () => {
      await deleteAutoPostingRule(fd);
      setEditing(false);
      router.refresh();
    });
  }

  function handleGenerateNow() {
    if (!page.rule) return;
    const fd = new FormData();
    fd.set("ruleId", page.rule.id);
    startTransition(async () => {
      const result = await generateNow(fd);
      if (result.error) { setMessage(result.error); return; }
      setMessage(result.generated === 0 ? "Queue is full for the next 14 days." : `Generated ${result.generated} new post${result.generated === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  const hasRule = !!page.rule;
  const isActive = page.rule?.is_active ?? false;

  return (
    <div className={`rounded-lg border bg-white shadow-sm ${isActive && hasRule ? "border-[#1877f2]/30" : "border-[#d9dee8]"}`}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f1ff] text-sm font-bold text-[#1877f2]">
          {page.page_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#101828]">{page.page_name}</p>
          <p className="mt-0.5 text-xs text-[#667085]">
            {hasRule
              ? `${scheduleLabel(page.rule!)} · ${pad(page.rule!.start_hour)}:00 – ${pad(page.rule!.end_hour)}:00`
              : "Not configured"}
            {page.token_status !== "active" && (
              <span className="ml-2 rounded-full bg-[#fff4e5] px-2 py-0.5 text-xs font-medium text-[#b54708]">
                Token error
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasRule && (
            <>
              <button
                type="button"
                onClick={handleGenerateNow}
                disabled={isPending}
                title="Generate now"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cfd6e3] px-2.5 text-xs font-medium text-[#344054] hover:bg-[#f8fafc] disabled:opacity-50"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                </svg>
                Generate
              </button>

              {/* Toggle */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${isActive ? "bg-[#1877f2]" : "bg-[#d0d5dd]"}`}
                aria-label={isActive ? "Disable" : "Enable"}
              >
                <span className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex h-8 items-center rounded-md border border-[#cfd6e3] px-3 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
          >
            {editing ? "Close" : hasRule ? "Edit" : "Set up"}
          </button>

          {hasRule && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex h-8 items-center rounded-md border border-[#f0b6b6] px-2.5 text-xs font-medium text-[#b42318] hover:bg-[#fff1f1] disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Rule summary chips */}
      {hasRule && !editing && (
        <div className="flex flex-wrap gap-2 border-t border-[#f2f4f7] px-5 py-3">
          <Chip>{scheduleLabel(page.rule!)}</Chip>
          <Chip>{pad(page.rule!.start_hour)}:00 – {pad(page.rule!.end_hour)}:00</Chip>
          {page.rule!.tag_filter.length > 0
            ? page.rule!.tag_filter.map((t) => <Chip key={t}>#{t}</Chip>)
            : <Chip>All media</Chip>}
          {page.rule!.caption_sheet_id
            ? <Chip>Sheet: {sheetOptions.find((s) => s.id === page.rule!.caption_sheet_id)?.name ?? "…"}</Chip>
            : <Chip>{page.rule!.captions.length} caption{page.rule!.captions.length !== 1 ? "s" : ""}</Chip>
          }
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <form ref={formRef} onSubmit={handleSave} className="border-t border-[#f2f4f7] px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Schedule */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#344054]">Schedule</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={maxPosts}
                  value={postsCount}
                  onChange={(e) => setPostsCount(Number(e.target.value))}
                  className="h-9 w-20 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                />
                <select
                  value={scheduleType}
                  onChange={(e) => { setScheduleType(e.target.value); setPostsCount(1); }}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                >
                  {SCHEDULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>posts {o.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[#667085]">
                Max {maxPosts} posts {SCHEDULE_OPTIONS.find((o) => o.value === scheduleType)?.label}
              </p>
            </div>

            {/* Time window */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#344054]">Posting hours</label>
              <div className="flex items-center gap-2">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{pad(i)}:00</option>
                  ))}
                </select>
                <span className="text-sm text-[#667085]">–</span>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                    <option key={i} value={i}>{pad(i)}:00</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[#667085]">Vietnam time (UTC+7)</p>
            </div>

            {/* Tag filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#344054]">
                Filter media by tag
                <span className="ml-1 font-normal text-[#667085]">(empty = use all)</span>
              </label>
              <input
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder="nurse, meme, night shift"
                list="auto-tag-suggestions"
                className="h-9 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              />
              {knownTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {knownTags.slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = tagFilter.split(",").map((t) => t.trim()).filter(Boolean);
                        if (!current.includes(tag)) setTagFilter([...current, tag].join(", "));
                      }}
                      className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-xs text-[#475467] hover:bg-[#e8f1ff] hover:text-[#1877f2]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Captions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#344054]">Caption</label>
              {sheetOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSheetId}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    disabled={isPending}
                    className="h-9 flex-1 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                  >
                    <option value="">-- Manual captions --</option>
                    {sheetOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.count} captions)
                      </option>
                    ))}
                  </select>
                  <a
                    href="/auto-posting/captions"
                    className="shrink-0 text-xs text-[#1877f2] hover:underline"
                  >
                    Manage sheets
                  </a>
                </div>
              )}
              {!selectedSheetId && (
                <>
                  <textarea
                    value={captions}
                    onChange={(e) => setCaptions(e.target.value)}
                    placeholder={"Nurse life ✨\nEvery shift is a new adventure 🏥\nProud to be a nurse 💙"}
                    rows={4}
                    className="resize-y rounded-md border border-[#cfd6e3] px-3 py-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                  />
                  <p className="text-xs text-[#667085]">
                    {captions.split("\n").filter((c) => c.trim()).length} captions · one per line · randomly picked when posting
                  </p>
                </>
              )}
              {selectedSheetId && (
                <p className="rounded-md bg-[#eff6ff] px-3 py-2 text-xs text-[#175cd3]">
                  Using the selected caption sheet. Captions will be picked randomly when generating posts.
                </p>
              )}
              {sheetOptions.length === 0 && (
                <p className="text-xs text-[#667085]">
                  <a href="/auto-posting/captions" className="text-[#1877f2] hover:underline">Upload a caption sheet</a> to use captions from a file.
                </p>
              )}
            </div>
          </div>

          {message && (
            <p className={`mt-4 rounded-md px-3 py-2 text-sm ${message.includes("Generated") || message.includes("full") ? "bg-[#ecfdf3] text-[#067647]" : "bg-[#fff1f1] text-[#b42318]"}`}>
              {message}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={isPending || endHour <= startHour}
              className="inline-flex h-9 items-center rounded-md bg-[#1877f2] px-4 text-sm font-semibold text-white hover:bg-[#1668d7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save settings"}
            </button>
            {hasRule && (
              <button
                type="button"
                onClick={() => { setEditing(false); setMessage(""); }}
                className="inline-flex h-9 items-center rounded-md border border-[#cfd6e3] px-4 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <datalist id="auto-tag-suggestions">
        {knownTags.map((tag) => <option key={tag} value={tag} />)}
      </datalist>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-medium text-[#475467]">
      {children}
    </span>
  );
}
