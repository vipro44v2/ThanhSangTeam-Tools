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

export function getMediaUploadConfig() {
  const maxFileSizeMb = Number(process.env.MEDIA_MAX_FILE_SIZE_MB ?? "10");
  const retentionDays = Number(process.env.MEDIA_RETENTION_DAYS ?? "7");

  return {
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    retentionDays,
  };
}
