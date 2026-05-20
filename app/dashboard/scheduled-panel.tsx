import Link from "next/link";

type ScheduleItem = {
  id: string;
  scheduled_at: string;
  caption: string | null;
  page_name: string | null;
  page_id: string | null;
  media_url: string | null;
  tags: string[];
};

function formatSchedule(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function PageAvatar({ name }: { name: string }) {
  const colors = ["bg-[#eff4ff] text-[#6172f3]", "bg-[#ecfdf3] text-[#067647]", "bg-[#fff6ed] text-[#ec4a0a]", "bg-[#f4f3ff] text-[#7a5af8]", "bg-[#fef0c7] text-[#b45309]"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function ScheduledPanel({ posts }: { posts: ScheduleItem[] }) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eaecf0] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#101828]">Next Scheduled Posts</h2>
        <Link href="/posts" className="text-xs font-medium text-[#1877f2] hover:underline">
          View All
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[#98a2b3]">No upcoming posts</p>
          <Link href="/posts?tab=create" className="mt-2 inline-block text-xs font-medium text-[#1877f2] hover:underline">
            Create a post →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#f9fafb]">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#fafafa]">
              {post.media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.media_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
              ) : post.page_name ? (
                <PageAvatar name={post.page_name} />
              ) : (
                <div className="size-9 shrink-0 rounded-lg bg-[#f2f4f7]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#101828]">
                  {post.page_name ?? "Unknown page"}
                </p>
                {post.tags.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-[#f2f4f7] px-1.5 py-0.5 text-[10px] text-[#475467]">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {post.caption && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#667085]">{post.caption}</p>
                )}
                <div className="mt-1 flex items-center gap-1 text-xs text-[#98a2b3]">
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatSchedule(post.scheduled_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
