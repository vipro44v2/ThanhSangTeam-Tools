"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostJob } from "./actions";

type DeleteModalProps = {
  jobId: string;
  pageName: string;
  caption: string | null;
  scheduledAt: string;
  onClose: () => void;
};

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function DeleteModal({ jobId, pageName, caption, scheduledAt, onClose }: DeleteModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const fd = new FormData();
    fd.append("id", jobId);
    startTransition(async () => {
      await deletePostJob(fd);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div
        className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Card */}
      <div className="animate-modal-in relative w-full max-w-sm rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-2xl">
        {/* Icon */}
        <div className="flex size-11 items-center justify-center rounded-full bg-[#fff1f1]">
          <svg className="size-5 text-[#b42318]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </div>

        <h2 className="mt-4 text-base font-semibold text-[#101828]">Delete scheduled post</h2>
        <p className="mt-1 text-sm text-[#667085]">
          This action cannot be undone.
        </p>

        {/* Post preview */}
        <div className="mt-4 rounded-xl border border-[#e4e9f2] bg-[#f8fafc] p-4 text-sm">
          <p className="font-medium text-[#344054]">{pageName}</p>
          {caption ? (
            <p className="mt-1.5 line-clamp-3 text-[#475467]">{caption}</p>
          ) : (
            <p className="mt-1.5 italic text-[#98a2b3]">No caption</p>
          )}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#98a2b3]">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDatetime(scheduledAt)}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-[#d0d5dd] py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f2f4f7] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 rounded-lg bg-[#d92d20] py-2.5 text-sm font-semibold text-white transition hover:bg-[#b42318] disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting…
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
