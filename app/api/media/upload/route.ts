import { NextRequest, NextResponse } from "next/server";

import { createMediaAssets } from "@/lib/media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tags = String(formData.get("tags") ?? "");
    const expiresInDays = String(formData.get("expiresInDays") ?? "");
    const fileTags = parseFileTags(formData.get("fileTags"));
    const fileExpiresInDays = parseStringList(formData.get("fileExpiresInDays"));
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Upload at least one image file." }, { status: 400 });
    }

    const result = await createMediaAssets(files, tags, fileTags, expiresInDays, fileExpiresInDays);
    const status = result.created.length > 0 ? 201 : 400;

    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload media.",
      },
      { status: 500 },
    );
  }
}

function parseFileTags(value: FormDataEntryValue | null): string[] {
  return parseStringList(value);
}

function parseStringList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => (typeof item === "string" ? item : ""));
  } catch {
    return [];
  }
}
