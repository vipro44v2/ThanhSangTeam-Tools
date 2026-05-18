export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type MediaFileCandidate = {
  name: string;
  type: string;
  size: number;
};

export type MediaValidationConfig = {
  maxFileSizeBytes: number;
};

export type MediaValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function parseTags(input: string | null | undefined): string[] {
  if (!input) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of input.split(",")) {
    const tag = rawTag.trim().toLowerCase();

    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function resolveUploadTags(sharedTags: string, fileTags: string[], fileIndex: number): string {
  const perFileTags = fileTags[fileIndex]?.trim();
  return perFileTags ? perFileTags : sharedTags;
}

export function resolveUploadRetentionDays(
  sharedRetentionDays: string,
  fileRetentionDays: string[],
  fileIndex: number,
): string | undefined {
  const perFileRetentionDays = fileRetentionDays[fileIndex]?.trim();
  const fallbackRetentionDays = sharedRetentionDays.trim();

  return perFileRetentionDays || fallbackRetentionDays || undefined;
}

export function validateMediaFile(
  file: MediaFileCandidate,
  config: MediaValidationConfig,
): MediaValidationResult {
  if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type for ${file.name}. Use JPEG, PNG, or WebP.`,
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      error: `${file.name} is empty.`,
    };
  }

  if (file.size > config.maxFileSizeBytes) {
    const maxMb = Math.round(config.maxFileSizeBytes / 1024 / 1024);

    return {
      ok: false,
      error: `${file.name} exceeds the ${maxMb}MB upload limit.`,
    };
  }

  return { ok: true };
}

export function createExpiryDate(createdAt: Date, retentionDays: number): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  return expiresAt;
}

export function isMediaAssetExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isMediaAssetExpiringSoon(expiresAt: Date, now: Date, windowEnd: Date): boolean {
  const expiresAtTime = expiresAt.getTime();

  return expiresAtTime > now.getTime() && expiresAtTime <= windowEnd.getTime();
}

export function parseRetentionDaysInput(input: string): number {
  if (!/^\d+$/.test(input)) {
    throw new Error("Invalid expiry days.");
  }

  const retentionDays = Number(input);

  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error("Invalid expiry days.");
  }

  return retentionDays;
}

export function parseExpiryDateInput(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);

  if (!match) {
    throw new Error("Invalid expiry date.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const expiresAt = new Date(Date.UTC(year, month - 1, day));

  if (
    expiresAt.getUTCFullYear() !== year ||
    expiresAt.getUTCMonth() !== month - 1 ||
    expiresAt.getUTCDate() !== day
  ) {
    throw new Error("Invalid expiry date.");
  }

  return expiresAt;
}

export function getMediaUploadConfig() {
  const maxFileSizeMb = Number(process.env.MEDIA_MAX_FILE_SIZE_MB ?? "10");
  const retentionDays = Number(process.env.MEDIA_RETENTION_DAYS ?? "7");

  return {
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    retentionDays,
  };
}
