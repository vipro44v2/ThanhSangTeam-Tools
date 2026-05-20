import Link from "next/link";
import { importPagesWithToken, logoutAdmin, purgeUnlinkedAccounts } from "./actions";
import { PagesInventory } from "./pages-inventory";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    imported?: string;
    error?: string;
    detail?: string;
    purged?: string;
  }>;
};

const errorCopy: Record<string, string> = {
  "missing-token": "Enter a User Access Token before importing pages.",
  "import-failed": "Import failed. Check the token and pages_show_list permission.",
  "missing-page": "The selected page could not be found.",
  "invalid-limit": "Daily limit must be an integer from 0 to 50.",
  "oauth-not-configured": "Facebook OAuth is not configured in environment variables.",
  "oauth-state": "The OAuth session is invalid or expired.",
  "oauth-failed": "Facebook connection failed. Check App ID, App Secret, and Redirect URI.",
  unauthorized: "You are not authorized to access this dashboard.",
};

export default async function FacebookPagesDashboard({
  searchParams,
}: PageProps) {
  await requireAdminAccess();

  const params = await searchParams;

  const [pages, categories] = await Promise.all([
    prisma.facebook_pages.findMany({
      orderBy: [{ created_at: "asc" }],
      select: {
        id: true,
        page_id: true,
        page_name: true,
        is_active: true,
        token_status: true,
        daily_post_limit: true,
        category_id: true,
        created_at: true,
        updated_at: true,
        facebook_accounts: {
          select: {
            id: true,
            facebook_user_id: true,
            facebook_user_name: true,
          },
        },
      },
    }),
    prisma.page_categories.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const facebookAccounts = await prisma.facebook_accounts.findMany({
    orderBy: [{ facebook_user_name: "asc" }],
    select: {
      id: true,
      facebook_user_id: true,
      facebook_user_name: true,
      token_status: true,
    },
  });

  const activePages = pages.filter((page) => page.is_active).length;
  const tokenIssues = pages.filter((page) => page.token_status !== "active").length;
  const totalDailyLimit = pages.reduce(
    (total, page) => total + page.daily_post_limit,
    0,
  );
  const importedCount = Number(params?.imported || 0);
  const purgedCount = params?.purged !== undefined ? Number(params.purged) : null;
  const error = params?.error ? errorCopy[params.error] : "";
  const errorDetail = params?.detail ?? "";
  const pageItems = pages.map(({ facebook_accounts, ...page }) => ({
    ...page,
    created_at: page.created_at.toISOString(),
    updated_at: page.updated_at.toISOString(),
    facebook_account: facebook_accounts
      ? {
          id: facebook_accounts.id,
          facebook_user_id: facebook_accounts.facebook_user_id,
          facebook_user_name: facebook_accounts.facebook_user_name,
        }
      : null,
  }));
  const categoryItems = categories.map((c) => ({ id: c.id, name: c.name, color: c.color }));
  const accountItems = facebookAccounts.map((account) => ({
    id: account.id,
    facebook_user_id: account.facebook_user_id,
    facebook_user_name: account.facebook_user_name,
    token_status: account.token_status,
  }));

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-[#d9dee8] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-[#667085]">
                Thanh Sang Tools
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Facebook Pages
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/posts"
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#1877f2] px-3 text-sm font-medium text-white transition hover:bg-[#1668d7]"
              >
                Posts
              </Link>
              <Link
                href="/api/facebook/oauth/start"
                className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
              >
                Connect
              </Link>
              <Link
                href="/facebook-pages"
                className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
              >
                Refresh
              </Link>
              <form action={purgeUnlinkedAccounts}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#f0b6b6] bg-white px-3 text-sm font-medium text-[#b42318] hover:bg-[#fff1f1]"
                >
                  Purge unlinked accounts
                </button>
              </form>
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfd6e3] bg-white px-3 text-sm font-medium text-[#344054] hover:bg-[#f8fafc]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-[#f2f4f7] px-4 py-3">
              <div className="text-xs font-medium uppercase text-[#667085]">
                Total
              </div>
              <div className="mt-1 text-2xl font-semibold">{pages.length}</div>
            </div>
            <div className="rounded-md bg-[#ecfdf3] px-4 py-3">
              <div className="text-xs font-medium uppercase text-[#067647]">
                Active
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#067647]">
                {activePages}
              </div>
            </div>
            <div className="rounded-md bg-[#fff4e5] px-4 py-3">
              <div className="text-xs font-medium uppercase text-[#b54708]">
                Token issues
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#b54708]">
                {tokenIssues}
              </div>
            </div>
            <div className="rounded-md bg-[#eef4ff] px-4 py-3">
              <div className="text-xs font-medium uppercase text-[#175cd3]">
                Daily capacity
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#175cd3]">
                {totalDailyLimit}
              </div>
            </div>
          </div>
        </header>


        {importedCount > 0 ? (
          <div className="rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-4 py-3 text-sm text-[#067647]">
            Imported {importedCount} Facebook page{importedCount === 1 ? "" : "s"}.
          </div>
        ) : null}

        {purgedCount !== null ? (
          <div className="rounded-md border border-[#a9dbbb] bg-[#ecfdf3] px-4 py-3 text-sm text-[#067647]">
            {purgedCount === 0
              ? "No unlinked accounts found."
              : `Deleted ${purgedCount} unlinked account${purgedCount === 1 ? "" : "s"}.`}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-[#f3b7b7] bg-[#fff1f1] px-4 py-3 text-sm text-[#b42318]">
            <p>{error}</p>
            {errorDetail ? (
              <p className="mt-1 font-mono text-xs opacity-80">{errorDetail}</p>
            ) : null}
          </div>
        ) : null}

        <PagesInventory pages={pageItems} accounts={accountItems} categories={categoryItems} />

        <details className="rounded-lg border border-[#d9dee8] bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Import with User Access Token
          </summary>
          <div className="border-t border-[#e4e9f2] px-5 py-4">
            <form
              action={importPagesWithToken}
              className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]"
            >
              <textarea
                id="token"
                name="userAccessToken"
                rows={3}
                className="min-h-24 resize-y rounded-md border border-[#cfd6e3] bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
                placeholder="Paste a User Access Token with pages_show_list permission"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center self-start rounded-md bg-[#1f2937] px-4 text-sm font-medium text-white hover:bg-[#111827]"
              >
                Import pages
              </button>
            </form>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-md bg-[#f8fafc] px-3 py-2">
                App ID: {process.env.FACEBOOK_APP_ID ? "Configured" : "Missing"}
              </div>
              <div className="rounded-md bg-[#f8fafc] px-3 py-2">
                App Secret:{" "}
                {process.env.FACEBOOK_APP_SECRET ? "Configured" : "Missing"}
              </div>
              <div className="rounded-md bg-[#f8fafc] px-3 py-2">
                Token Secret:{" "}
                {process.env.FACEBOOK_TOKEN_SECRET ? "Configured" : "Missing"}
              </div>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
