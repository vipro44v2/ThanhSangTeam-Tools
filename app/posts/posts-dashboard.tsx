"use client";

import { useState } from "react";
import { PostComposer } from "./create/post-composer";
import { PostsList } from "./posts-list";
import Link from "next/link";

type Tab = "schedule" | "create";

type Page = { id: string; page_id: string; page_name: string; token_status: string };
type JobItem = {
  id: string;
  caption: string | null;
  scheduled_at: string;
  status: string;
  error_message: string | null;
  fb_post_id: string | null;
  posted_at: string | null;
  page: { page_name: string; page_id: string } | null;
  media: { file_url: string; mime_type: string; file_name: string } | null;
};

export function PostsDashboard({
  pages,
  jobs,
  initialTab,
}: {
  pages: Page[];
  jobs: JobItem[];
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex items-center gap-1 rounded-lg border border-[#d9dee8] bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("schedule")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "schedule"
              ? "bg-[#f2f4f7] text-[#101828] shadow-sm"
              : "text-[#667085] hover:text-[#344054]"
          }`}
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Scheduled Posts
          <span className="rounded-full bg-[#e8f1ff] px-2 py-0.5 text-xs font-semibold text-[#175cd3]">
            {jobs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("create")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "create"
              ? "bg-[#1877f2] text-white shadow-sm"
              : "text-[#667085] hover:text-[#344054]"
          }`}
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Post
        </button>
      </div>

      {/* Tab content */}
      {tab === "schedule" ? (
        <PostsList jobs={jobs} onCreatePost={() => setTab("create")} />
      ) : pages.length === 0 ? (
        <div className="rounded-lg border border-[#d9dee8] bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-base font-medium text-[#101828]">No active pages</p>
          <p className="mt-2 text-sm text-[#667085]">
            Connect and activate at least one Facebook Page before creating a post.
          </p>
          <Link
            href="/facebook-pages"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-[#1877f2] px-4 text-sm font-medium text-white hover:bg-[#1668d7]"
          >
            Manage Pages
          </Link>
        </div>
      ) : (
        <PostComposer pages={pages} />
      )}
    </div>
  );
}
