type Stat = {
  label: string;
  value: number;
  trend: string;
  up: boolean;
  iconBg: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, trend, up, iconBg, icon }: Stat) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eaecf0] bg-white px-5 py-4 shadow-sm">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#667085]">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-[#101828]">{value.toLocaleString()}</p>
        <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${up ? "text-[#067647]" : "text-[#b42318]"}`}>
          {up ? (
            <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            </svg>
          )}
          {trend}
        </p>
      </div>
    </div>
  );
}

export function StatsRow({
  totalPages, activeTokens, mediaCount, postedToday, failedPosts,
}: {
  totalPages: number; activeTokens: number; mediaCount: number;
  postedToday: number; failedPosts: number;
}) {
  const stats: Stat[] = [
    {
      label: "Total Pages",
      value: totalPages,
      trend: "vs last month",
      up: true,
      iconBg: "bg-[#eff4ff]",
      icon: (
        <svg className="size-5 text-[#6172f3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3.284 14.253A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
    },
    {
      label: "Active Tokens",
      value: activeTokens,
      trend: "all valid",
      up: true,
      iconBg: "bg-[#ecfdf3]",
      icon: (
        <svg className="size-5 text-[#067647]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      label: "Media in Library",
      value: mediaCount,
      trend: "available assets",
      up: true,
      iconBg: "bg-[#f4f3ff]",
      icon: (
        <svg className="size-5 text-[#7a5af8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h10.5a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v11.25A2.25 2.25 0 006.75 21z" />
        </svg>
      ),
    },
    {
      label: "Posted Today",
      value: postedToday,
      trend: "since midnight",
      up: true,
      iconBg: "bg-[#fff6ed]",
      icon: (
        <svg className="size-5 text-[#ec4a0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: "Failed Posts",
      value: failedPosts,
      trend: "need attention",
      up: failedPosts === 0,
      iconBg: "bg-[#fff1f3]",
      icon: (
        <svg className="size-5 text-[#c01048]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {stats.map((s) => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
