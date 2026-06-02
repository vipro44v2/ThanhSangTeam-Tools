import { NextRequest, NextResponse } from "next/server";

import { bulkUpdateMediaAssets, permanentlyDeleteMediaAssets } from "@/lib/media/service";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "Select at least one media asset." }, { status: 400 });
    }

    const result = await bulkUpdateMediaAssets(ids, body.updates ?? {});

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update media assets.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "Select at least one deleted media asset." }, { status: 400 });
    }

    const result = await permanentlyDeleteMediaAssets(ids);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to permanently delete media assets.",
      },
      { status: 400 },
    );
  }
}
