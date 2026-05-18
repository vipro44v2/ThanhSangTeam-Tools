"use client";

import { useMemo, useState } from "react";
import {
  deleteFacebookPage,
  toggleFacebookPageStatus,
  updateFacebookPageLimit,
} from "./actions";

type PageItem = {
  id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  token_status: string;
  daily_post_limit: number;
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
}: {
  pages: PageItem[];
  accounts: FacebookAccountItem[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [accountId, setAccountId] = useState("all");

  const filteredPages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesQuery =
        !normalizedQuery ||
        page.page_name.toLowerCase().includes(normalizedQuery) ||
        page.page_id.toLowerCase().includes(normalizedQuery) ||
        (page.facebook_account?.facebook_user_name || "")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        status === "all" ||
        (status === "active" && page.is_active) ||
        (status === "inactive" && !page.is_active) ||
        (status === "token-error" && page.token_status !== "active");

      return matchesQuery && matchesStatus;
    }).filter((page) => {
      return accountId === "all" || page.facebook_account?.id === accountId;
    });
  }, [accountId, pages, query, status]);

  function handleSearchChange(value: string) {
    setQuery(value);

    if (!value.trim()) {
      setStatus("all");
      setAccountId("all");
    }
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

        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilters.map((item) => {
            const selected = item.value === status;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={
                  selected
                    ? "rounded-md bg-[#e8f1ff] px-3 py-2 text-sm font-medium text-[#175cd3]"
                    : "rounded-md px-3 py-2 text-sm font-medium text-[#667085] hover:bg-[#f2f4f7]"
                }
              >
                {item.label}
              </button>
            );
          })}
          <span className="px-2 py-2 text-sm text-[#667085]">
            {filteredPages.length} shown
          </span>
        </div>
      </div>

      {filteredPages.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase text-[#667085]">
              <tr>
                <th className="px-5 py-3 font-semibold">Page</th>
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
                      <form action={deleteFacebookPage}>
                        <input type="hidden" name="id" value={page.id} />
                        <button
                          type="submit"
                          className="h-8 rounded-md border border-[#f0b6b6] px-2 text-xs font-medium text-[#b42318] hover:bg-[#fff1f1]"
                        >
                          Delete
                        </button>
                      </form>
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
    </section>
  );
}
