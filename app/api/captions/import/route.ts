import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(req: NextRequest) {
  await requireAdminAccess();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = (form.get("name") as string | null)?.trim() || "";
  const sheetId = (form.get("sheetId") as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Sheet name is required." }, { status: 400 });

  const mime = file.type.split(";")[0].trim().toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_TYPES.has(mime) && !["txt", "csv", "xlsx", "xls"].includes(ext)) {
    return NextResponse.json({ error: "Only .txt, .csv, .xlsx, .xls are supported." }, { status: 400 });
  }

  let captions: string[];

  try {
    if (ext === "xlsx" || ext === "xls") {
      captions = await parseExcel(file);
    } else {
      captions = await parsePlainText(file);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  captions = captions.map((c) => c.trim()).filter((c) => c.length > 0);
  if (captions.length === 0) {
    return NextResponse.json({ error: "No valid captions found in the file." }, { status: 400 });
  }

  const now = new Date();

  if (sheetId) {
    const updated = await prisma.caption_sheets.updateMany({
      where: { id: sheetId },
      data: { name, captions, updated_at: now },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Sheet not found." }, { status: 404 });
    }
    return NextResponse.json({ id: sheetId, name, count: captions.length });
  }

  const sheet = await prisma.caption_sheets.create({
    data: { id: randomUUID(), name, captions, updated_at: now },
  });

  return NextResponse.json({ id: sheet.id, name: sheet.name, count: captions.length });
}

// ---------------------------------------------------------------------------

async function parsePlainText(file: File): Promise<string[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  return lines.map((line) => {
    const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    return firstTextCell(cells);
  });
}

async function parseExcel(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const workbook = xlsxRead(new Uint8Array(buffer), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsxUtils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
  return rows.map((row) => firstTextCell(row));
}

// Returns the first cell in a row that looks like real text (not a pure number).
// Handles sheets where column A is a row-number index and captions are in column B+.
function firstTextCell(cells: unknown[]): string {
  for (const cell of cells) {
    const s = cell != null ? String(cell).trim() : "";
    if (s && !/^\d+(\.\d+)?$/.test(s)) return s;
  }
  return "";
}
