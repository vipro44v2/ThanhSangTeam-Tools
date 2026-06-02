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

export const MEDIA_MAX_EXPIRY_DAYS = 365;

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

export function parseFileNameInput(input: string): string {
  const fileName = input.trim();

  if (!fileName) {
    throw new Error("File name is required.");
  }

  return fileName;
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

  if (retentionDays > MEDIA_MAX_EXPIRY_DAYS) {
    throw new Error(`Expiry days cannot exceed ${MEDIA_MAX_EXPIRY_DAYS}.`);
  }

  return retentionDays;
}

export function parseExpiryDateInput(
  input: string,
  options: { now?: Date; maxDays?: number } = {},
): Date {
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

  const now = options.now ?? new Date();
  const today = startOfUtcDay(now);
  const maxDays = options.maxDays ?? MEDIA_MAX_EXPIRY_DAYS;
  const maxExpiryDate = new Date(today);
  maxExpiryDate.setUTCDate(maxExpiryDate.getUTCDate() + maxDays);

  if (expiresAt.getTime() < today.getTime()) {
    throw new Error("Expiry date cannot be in the past.");
  }

  if (expiresAt.getTime() > maxExpiryDate.getTime()) {
    throw new Error(`Expiry date cannot be more than ${maxDays} days from today.`);
  }

  return expiresAt;
}

export function formatDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getExpiryDateBounds(now = new Date(), maxDays = MEDIA_MAX_EXPIRY_DAYS) {
  const min = startOfUtcDay(now);
  const max = new Date(min);
  max.setUTCDate(max.getUTCDate() + maxDays);

  return {
    min: formatDateInputValue(min),
    max: formatDateInputValue(max),
  };
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function getMediaUploadConfig() {
  const maxFileSizeMb = Number(process.env.MEDIA_MAX_FILE_SIZE_MB ?? "10");
  const retentionDays = Number(process.env.MEDIA_RETENTION_DAYS ?? "7");

  return {
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    retentionDays,
  };
}
