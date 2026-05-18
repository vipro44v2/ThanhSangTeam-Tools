import { NextResponse } from "next/server";

import { getMediaStats } from "@/lib/media/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getMediaStats();

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load media stats.",
      },
      { status: 500 },
    );
  }
}
