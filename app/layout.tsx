import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurse Auto Poster",
  description: "Media library for nurse Facebook Page posting workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
