import { loginWithCredentials } from "./actions";

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-[#111827]">
      <section className="w-full max-w-sm rounded-lg border border-[#d9dee8] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#667085]">Admin access</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          Enter your email and password to continue.
        </p>

        {params?.error ? (
          <div className="mt-4 rounded-md border border-[#f3b7b7] bg-[#fff1f1] px-3 py-2 text-sm text-[#b42318]">
            Invalid email or password.
          </div>
        ) : null}

        <form action={loginWithCredentials} className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-10 rounded-md border border-[#cfd6e3] px-3 outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10 rounded-md border border-[#cfd6e3] px-3 outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-[#1877f2] px-4 text-sm font-medium text-white transition hover:bg-[#1668d7]"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
