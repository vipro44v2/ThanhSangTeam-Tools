import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "media");

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type StoredMediaFile = {
  buffer: Buffer;
  fileUrl: string;
  storageKey: string;
};

export async function saveMediaFile(file: File): Promise<StoredMediaFile> {
  const extension = EXTENSIONS_BY_MIME_TYPE[file.type] ?? "bin";
  const storageKey = `media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const absolutePath = path.join(process.cwd(), "public", "uploads", storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    buffer,
    fileUrl: `/uploads/${storageKey.replaceAll("\\", "/")}`,
    storageKey,
  };
}

export async function deleteMediaFile(storageKey: string): Promise<void> {
  const absolutePath = path.join(process.cwd(), "public", "uploads", storageKey);

  if (!absolutePath.startsWith(UPLOAD_ROOT)) {
    throw new Error("Refusing to delete a file outside the media upload directory.");
  }

  try {
    await unlink(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
