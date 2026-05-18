import { NextRequest, NextResponse } from "next/server";

import { markMediaAssetDeleted, updateMediaAsset } from "@/lib/media/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const asset = await markMediaAssetDeleted(id);

    if (!asset) {
      return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete media asset.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const asset = await updateMediaAsset(id, {
      tags: typeof body.tags === "string" ? body.tags : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update media asset.",
      },
      { status: 400 },
    );
  }
}
