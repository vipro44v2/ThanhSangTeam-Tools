import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.resolve(process.cwd(), "public", "uploads");

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

export type StoredMediaFile = {
  buffer: Buffer;
  fileUrl: string;
  storageKey: string;
};

export async function saveMediaFile(file: File): Promise<StoredMediaFile> {
  if (isCloudinaryConfigured()) {
    return saveCloudinaryFile(file);
  }

  return saveLocalMediaFile(file);
}

export async function deleteMediaFile(storageKey: string): Promise<void> {
  if (storageKey.startsWith("cloudinary:")) {
    await deleteCloudinaryFile(storageKey);
    return;
  }

  await deleteLocalMediaFile(storageKey);
}

async function saveLocalMediaFile(file: File): Promise<StoredMediaFile> {
  const extension = EXTENSIONS_BY_MIME_TYPE[file.type] ?? "bin";
  const storageKey = `media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const absolutePath = path.resolve(process.cwd(), "public", "uploads", storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    buffer,
    fileUrl: `/uploads/${storageKey.replaceAll("\\", "/")}`,
    storageKey,
  };
}

async function deleteLocalMediaFile(storageKey: string): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), "public", "uploads", storageKey);

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
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

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

async function saveCloudinaryFile(file: File): Promise<StoredMediaFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const cloudName = getRequiredCloudinaryEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getRequiredCloudinaryEnv("CLOUDINARY_API_KEY");
  const apiSecret = getRequiredCloudinaryEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "thanh-sang-team-tools/media";
  const publicId = randomUUID();
  const uploadParams = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const formData = new FormData();

  formData.set("file", new Blob([buffer], { type: file.type }), file.name);
  formData.set("api_key", apiKey);
  formData.set("timestamp", timestamp);
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("signature", signCloudinaryParams(uploadParams, apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const payload = await response.json() as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message ?? "Cloudinary upload failed.");
  }

  return {
    buffer,
    fileUrl: payload.secure_url,
    storageKey: `cloudinary:${resourceType}:${payload.public_id}`,
  };
}

async function deleteCloudinaryFile(storageKey: string): Promise<void> {
  const [, resourceType, ...publicIdParts] = storageKey.split(":");
  const publicId = publicIdParts.join(":");

  if (!resourceType || !publicId) {
    throw new Error("Invalid Cloudinary storage key.");
  }

  const cloudName = getRequiredCloudinaryEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getRequiredCloudinaryEnv("CLOUDINARY_API_KEY");
  const apiSecret = getRequiredCloudinaryEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const destroyParams = {
    public_id: publicId,
    timestamp,
  };
  const formData = new FormData();

  formData.set("api_key", apiKey);
  formData.set("timestamp", timestamp);
  formData.set("public_id", publicId);
  formData.set("signature", signCloudinaryParams(destroyParams, apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "Cloudinary delete failed.");
  }
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string): string {
  const signatureBase = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
}

function getRequiredCloudinaryEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Cloudinary storage.`);
  }

  return value;
}
