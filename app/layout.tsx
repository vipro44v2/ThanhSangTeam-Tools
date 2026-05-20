import type { Metadata } from "next";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FB Manager",
  description: "Manage Facebook Pages and auto posting",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const session = await decrypt(token);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full" suppressHydrationWarning>
        {session?.userId ? (
          <div className="flex h-full overflow-hidden bg-[#f5f6fa]">
            <Sidebar userEmail={session.email} />
            <div className="flex flex-1 flex-col overflow-y-auto pt-14 md:pt-0">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
