import { NextRequest, NextResponse } from "next/server";

import { parseMediaListParams } from "@/lib/media/query";
import { listMediaAssets } from "@/lib/media/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const result = await listMediaAssets(parseMediaListParams({
      tag: searchParams.get("tag") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load media assets.",
      },
      { status: 500 },
    );
  }
}
