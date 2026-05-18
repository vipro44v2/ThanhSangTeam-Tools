import { NextRequest, NextResponse } from "next/server";

import { createMediaAssets } from "@/lib/media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tags = String(formData.get("tags") ?? "");
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Upload at least one image file." }, { status: 400 });
    }

    const result = await createMediaAssets(files, tags);
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
