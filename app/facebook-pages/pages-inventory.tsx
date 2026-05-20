"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFacebookPage,
  toggleFacebookPageStatus,
  updateFacebookPageLimit,
  upsertPageCategory,
  deletePageCategory,
  assignPageCategory,
} from "./actions";
import { ConfirmModal } from "@/app/components/confirm-modal";

type Category = { id: string; name: string; color: string };

type PageItem = {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  token_status: string;
  daily_post_limit: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  facebook_account: {
    id: string;
    facebook_user_id: string;
    facebook_user_name: string;
  } | null;
};

type FacebookAccountItem = {
  id: string;
  facebook_user_id: string;
  facebook_user_name: string;
  token_status: string;
};

type StatusFilter = "all" | "active" | "inactive" | "token-error";

const PRESET_COLORS = [
  "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6", "#a855f7", "#ec4899",
];

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "inactive" },
  { label: "Token issues", value: "token-error" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PagesInventory({
  pages,
  accounts,
  categories,
}: {
  pages: PageItem[];
  accounts: FacebookAccountItem[];
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PageItem | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [accountId, setAccountId] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Category management state
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[5]);
  const [catError, setCatError] = useState("");
  const [catPickerPageId, setCatPickerPageId] = useState<string | null>(null);

  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pages.filter((page) => {
      const matchesQuery =
        !normalizedQuery ||
        page.page_name.toLowerCase().includes(normalizedQuery) ||
        page.page_id.toLowerCase().includes(normalizedQuery) ||
        (page.facebook_account?.facebook_user_name || "").toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        status === "all" ||
        (status === "active" && page.is_active) ||
        (status === "inactive" && !page.is_active) ||
        (status === "token-error" && page.token_status !== "active");
      const matchesAccount = accountId === "all" || page.facebook_account?.id === accountId;
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none" && !page.category_id) ||
        page.category_id === categoryFilter;
      return matchesQuery && matchesStatus && matchesAccount && matchesCategory;
    });
  }, [accountId, pages, query, status, categoryFilter]);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("id", deleteTarget.id);
    startTransition(async () => {
      await deleteFacebookPage(fd);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    if (!value.trim()) { setStatus("all"); setAccountId("all"); }
  }

  function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const fd = new FormData();
    fd.set("name", newCatName.trim());
    fd.set("color", newCatColor);
    startCatTransition(async () => {
      try {
        const result = await upsertPageCategory(fd);
        if (result?.error) { setCatError(result.error); return; }
        setNewCatName(""); setCatError(""); router.refresh();
      } catch (err) {
        setCatError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  function handleDeleteCategory(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startCatTransition(async () => { await deletePageCategory(fd); router.refresh(); });
  }

  function handleAssignCategory(pageId: string, categoryId: string | null) {
    const fd = new FormData();
    fd.set("pageId", pageId);
    fd.set("categoryId", categoryId ?? "");
    startTransition(async () => {
      await assignPageCategory(fd);
      setCatPickerPageId(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
      <div className="border-b border-[#e4e9f2] px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold">Page inventory</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Review connected pages, source accounts, posting limits, and token
              status.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="h-9 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 sm:w-52"
            >
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.facebook_user_name}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search page, ID, or account"
              className="h-9 min-w-0 rounded-md border border-[#cfd6e3] px-3 text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20 sm:w-72"
            />
            {query ? (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {statusFilters.map((item) => {
            const selected = item.value === status;
            return (
              <button key={item.value} type="button" onClick={() => setStatus(item.value)}
                className={selected
                  ? "rounded-md bg-[#e8f1ff] px-3 py-2 text-sm font-medium text-[#175cd3]"
                  : "rounded-md px-3 py-2 text-sm font-medium text-[#667085] hover:bg-[#f2f4f7]"}>
                {item.label}
              </button>
            );
          })}

          {/* Category filter chips */}
          {categories.length > 0 && (
            <>
              <span className="text-[#d0d5dd]">|</span>
              <button type="button" onClick={() => setCategoryFilter("all")}
                className={categoryFilter === "all"
                  ? "rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-medium text-[#175cd3]"
                  : "rounded-full px-3 py-1 text-xs font-medium text-[#667085] ring-1 ring-[#e4e9f2] hover:bg-[#f8fafc]"}>
                All categories
              </button>
              {categories.map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoryFilter === cat.id ? "text-white" : "text-[#344054] ring-1 ring-[#e4e9f2] hover:bg-[#f8fafc]"
                  }`}
                  style={categoryFilter === cat.id ? { background: cat.color } : {}}>
                  <span className="size-2 rounded-full" style={{ background: cat.color }} />
                  {cat.name}
                </button>
              ))}
              <button type="button" onClick={() => setCategoryFilter(categoryFilter === "none" ? "all" : "none")}
                className={categoryFilter === "none"
                  ? "rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-medium text-[#475467]"
                  : "rounded-full px-3 py-1 text-xs font-medium text-[#98a2b3] ring-1 ring-[#e4e9f2] hover:bg-[#f8fafc]"}>
                Uncategorized
              </button>
            </>
          )}

          <span className="ml-auto px-2 py-2 text-sm text-[#667085]">{filteredPages.length} shown</span>

          <button type="button" onClick={() => setShowCatPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd6e3] px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
            </svg>
            Categories
          </button>
        </div>

        {/* Category management panel */}
        {showCatPanel && (
          <div className="mt-4 rounded-lg border border-[#e4e9f2] bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">Manage Categories</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {categories.length === 0 && <p className="text-xs text-[#98a2b3]">No categories yet.</p>}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-[#e4e9f2]">
                  <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                  <span className="text-xs font-medium text-[#344054]">{cat.name}</span>
                  <button type="button" onClick={() => handleDeleteCategory(cat.id)} disabled={isCatPending}
                    className="ml-1 text-[#98a2b3] hover:text-[#b42318] disabled:opacity-40">
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleCreateCategory} className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewCatColor(c)}
                    className={`size-5 rounded-full transition ${newCatColor === c ? "ring-2 ring-offset-1 ring-[#1877f2]" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatError(""); }}
                  placeholder="Category name"
                  className="h-9 flex-1 rounded-md border border-[#cfd6e3] bg-white px-3 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20" />
                <button type="submit" disabled={isCatPending || !newCatName.trim()}
                  className="h-9 rounded-md bg-[#1877f2] px-4 text-xs font-semibold text-white hover:bg-[#1668d7] disabled:opacity-50">
                  {isCatPending ? "Saving..." : "Add"}
                </button>
              </div>
              {catError && <p className="text-xs text-[#b42318]">{catError}</p>}
            </form>
          </div>
        )}
      </div>

      {filteredPages.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase text-[#667085]">
              <tr>
                <th className="px-5 py-3 font-semibold">Page</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Page ID</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Token</th>
                <th className="px-5 py-3 font-semibold">Daily limit</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr key={page.id}>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#e8f1ff] text-xs font-semibold text-[#175cd3]">
                        {page.page_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[#101828]">
                          {page.page_name}
                        </div>
                        <div className="mt-0.5 text-xs text-[#667085]">
                          Added {formatDate(page.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Category cell */}
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <div className="relative">
                      {(() => {
                        const cat = categories.find((c) => c.id === page.category_id);
                        return (
                          <button type="button"
                            onClick={() => setCatPickerPageId(catPickerPageId === page.id ? null : page.id)}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-[#e4e9f2] hover:ring-[#1877f2] transition bg-white">
                            <span className="size-2 rounded-full" style={{ background: cat?.color ?? "#d0d5dd" }} />
                            {cat ? cat.name : <span className="text-[#98a2b3]">—</span>}
                          </button>
                        );
                      })()}
                      {catPickerPageId === page.id && (
                        <div className="absolute left-0 top-8 z-20 min-w-[140px] rounded-lg border border-[#e4e9f2] bg-white py-1 shadow-lg">
                          {categories.map((cat) => (
                            <button key={cat.id} type="button"
                              onClick={() => handleAssignCategory(page.id, cat.id)}
                              disabled={isPending}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#f8fafc] disabled:opacity-50">
                              <span className="size-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                              {cat.name}
                              {page.category_id === cat.id && (
                                <svg className="ml-auto size-3 text-[#1877f2]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                          {page.category_id && (
                            <button type="button" onClick={() => handleAssignCategory(page.id, null)}
                              disabled={isPending}
                              className="flex w-full items-center gap-2 border-t border-[#f2f4f7] px-3 py-2 text-left text-xs text-[#667085] hover:bg-[#f8fafc] disabled:opacity-50">
                              Remove
                            </button>
                          )}
                          {categories.length === 0 && (
                            <p className="px-3 py-2 text-xs text-[#98a2b3]">No categories yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    {page.facebook_account ? (
                      <div>
                        <div className="font-medium text-[#101828]">
                          {page.facebook_account.facebook_user_name}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-[#667085]">
                          {page.facebook_account.facebook_user_id}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-[#98a2b3]">Unlinked</span>
                    )}
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4 font-mono text-xs text-[#53637a]">
                    {page.page_id}
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <span
                      className={
                        page.is_active
                          ? "rounded-md bg-[#ecfdf3] px-2 py-1 text-xs font-medium text-[#067647]"
                          : "rounded-md bg-[#f2f4f7] px-2 py-1 text-xs font-medium text-[#475467]"
                      }
                    >
                      {page.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <span
                      className={
                        page.token_status === "active"
                          ? "rounded-md bg-[#ecfdf3] px-2 py-1 text-xs font-medium text-[#067647]"
                          : "rounded-md bg-[#fff4e5] px-2 py-1 text-xs font-medium text-[#b54708]"
                      }
                    >
                      {page.token_status}
                    </span>
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <form
                      action={updateFacebookPageLimit}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={page.id} />
                      <input
                        name="dailyPostLimit"
                        type="number"
                        min={0}
                        max={50}
                        defaultValue={page.daily_post_limit}
                        className="h-8 w-16 rounded-md border border-[#cfd6e3] px-2 text-sm outline-none focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                      />
                      <button
                        type="submit"
                        className="h-8 rounded-md border border-[#cfd6e3] px-2 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4 text-[#667085]">
                    {formatDate(page.updated_at)}
                  </td>
                  <td className="border-t border-[#edf1f7] px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <form action={toggleFacebookPageStatus}>
                        <input type="hidden" name="id" value={page.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!page.is_active)}
                        />
                        <button
                          type="submit"
                          className="h-8 rounded-md border border-[#cfd6e3] px-2 text-xs font-medium text-[#344054] hover:bg-[#f8fafc]"
                        >
                          {page.is_active ? "Pause" : "Resume"}
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(page)}
                        className="h-8 rounded-md border border-[#f0b6b6] px-2 text-xs font-medium text-[#b42318] hover:bg-[#fff1f1]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-14 text-center">
          <p className="text-base font-medium text-[#101828]">
            No pages match this view
          </p>
          <p className="mt-2 text-sm text-[#667085]">
            Clear the search box to return to All pages.
          </p>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Facebook page?"
          description={
            <>
              <span className="font-medium text-[#344054]">{deleteTarget.page_name}</span> will be removed from the tool. Scheduled posts for this page will also be deleted. This cannot be undone.
            </>
          }
          isPending={isPending}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
