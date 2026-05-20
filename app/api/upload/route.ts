import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";
import { saveMediaFile } from "@/lib/media/local-storage";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  await requireAdminAccess();

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 });
  }

  const id = randomUUID();
  const storedFile = await saveMediaFile(file);

  const tagsRaw = form.get("tags") as string | null;
  const tags: string[] = tagsRaw ? (JSON.parse(tagsRaw) as string[]) : [];
  const autoDeleteDays = Number(form.get("autoDeleteDays") ?? 365);
  const expiresAt = autoDeleteDays > 0
    ? new Date(Date.now() + autoDeleteDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const asset = await prisma.media_assets.create({
    data: {
      id,
      file_url: storedFile.fileUrl,
      storage_key: storedFile.storageKey,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      tags,
      status: "available",
      expires_at: expiresAt,
    },
  });

  return NextResponse.json({
    id: asset.id,
    url: asset.file_url,
    name: asset.file_name,
    mime_type: asset.mime_type,
  });
}
