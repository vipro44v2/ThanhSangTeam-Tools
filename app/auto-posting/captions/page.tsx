import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { CaptionSheetsManager } from "./caption-sheets-manager";

export const dynamic = "force-dynamic";

export default async function CaptionSheetsPage() {
  await requireAdminAccess();

  const sheets = await prisma.caption_sheets.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      captions: true,
      created_at: true,
      updated_at: true,
      _count: { select: { auto_posting_rules: true } },
    },
  });

  const items = sheets.map((s) => ({
    id: s.id,
    name: s.name,
    caption_count: s.captions.length,
    preview: s.captions.slice(0, 3),
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
    rules_count: s._count.auto_posting_rules,
  }));

  return (
    <div className="min-h-full">
      <div className="border-b border-[#eaecf0] bg-white px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="text-lg font-bold text-[#101828] sm:text-xl">Caption Sheets</h1>
        <p className="mt-0.5 text-sm text-[#667085]">
          Upload .txt, .csv, or .xlsx files to build caption pools for auto posting.
        </p>
      </div>
      <div className="px-4 py-4 sm:px-8 sm:py-6">
        <CaptionSheetsManager sheets={items} />
      </div>
    </div>
  );
}
