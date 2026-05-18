import Link from "next/link";

type LogItem = {
  id: string;
  status: string;
  error_message: string | null;
  time: string;
  page_name: string | null;
  media_url: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  posted:  { label: "Success", cls: "bg-[#ecfdf3] text-[#067647]" },
  failed:  { label: "Failed",  cls: "bg-[#fff1f1] text-[#b42318]" },
  skipped: { label: "Skipped", cls: "bg-[#fff4e5] text-[#b54708]" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function LogsPanel({ logs }: { logs: LogItem[] }) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eaecf0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#101828]">Posting Logs</h2>
        <Link href="/posts" className="text-xs font-medium text-[#1877f2] hover:underline">
          View All
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#98a2b3]">No recent activity</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#f2f4f7] bg-[#f9fafb]">
                <th className="px-4 py-2.5 text-left font-semibold text-[#667085]">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#667085]">Page</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#667085]">Image</th>
                <th className="px-4 py-2.5 text-left font-semibold text-[#667085]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f9fafb]">
              {logs.map((log) => {
                const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, cls: "bg-[#f2f4f7] text-[#475467]" };
                return (
                  <tr key={log.id} className="hover:bg-[#fafafa]">
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="max-w-[90px] truncate px-4 py-2.5 text-[#344054]">
                      {log.page_name ?? "—"}
                      {log.status === "failed" && log.error_message && (
                        <p className="text-[10px] text-[#b42318]" title={log.error_message}>
                          {log.error_message.slice(0, 20)}…
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={log.media_url} alt="" className="size-7 rounded-md object-cover" />
                      ) : (
                        <div className="size-7 rounded-md bg-[#f2f4f7]" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#667085]">{formatTime(log.time)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
