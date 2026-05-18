import { NextResponse } from "next/server";

import { listMediaTags } from "@/lib/media/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tags = await listMediaTags();

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load media tags.",
      },
      { status: 500 },
    );
  }
}
