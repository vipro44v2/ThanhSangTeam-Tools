"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJobNow } from "./actions";

type PostNowModalProps = {
  jobId: string;
  pageName: string;
  caption: string | null;
  mediaUrl: string | null;
  onClose: () => void;
};

export function PostNowModal({
  jobId,
  pageName,
  caption,
  mediaUrl,
  onClose,
}: PostNowModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handlePublish() {
    setError("");
    const fd = new FormData();
    fd.append("id", jobId);
    startTransition(async () => {
      const result = await postJobNow(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="animate-modal-in relative w-full max-w-sm rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-2xl">
        <div className="flex size-11 items-center justify-center rounded-full bg-[#ecfdf3]">
          <svg className="size-5 text-[#067647]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </div>

        <h2 className="mt-4 text-base font-semibold text-[#101828]">Publish now</h2>
        <p className="mt-1 text-sm text-[#667085]">
          This post will be sent to Facebook immediately, bypassing the schedule.
        </p>

        <div className="mt-4 flex gap-3 rounded-xl border border-[#e4e9f2] bg-[#f8fafc] p-4 text-sm">
          {mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[#344054]">{pageName}</p>
            {caption ? (
              <p className="mt-1 line-clamp-3 text-[#475467]">{caption}</p>
            ) : (
              <p className="mt-1 italic text-[#98a2b3]">No caption</p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-[#fff1f1] px-3 py-2 text-sm text-[#b42318]">{error}</p>
        )}

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
            onClick={handlePublish}
            disabled={isPending}
            className="flex-1 rounded-lg bg-[#067647] py-2.5 text-sm font-semibold text-white transition hover:bg-[#05603a] disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing…
              </span>
            ) : (
              "Publish Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
