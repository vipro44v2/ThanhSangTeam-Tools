import { MediaStatus } from "@/generated/prisma/enums";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

const MEDIA_STATUSES = new Set<string>(Object.values(MediaStatus));

export type MediaListParamsInput = {
  page?: string | null;
  limit?: string | null;
  search?: string | null;
  status?: string | null;
  tag?: string | null;
};

export type MediaListParams = {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: MediaStatus;
  tag?: string;
};

export function parseMediaListParams(input: MediaListParamsInput): MediaListParams {
  const page = clampPositiveInteger(input.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER);
  const limit = clampPositiveInteger(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const search = normalizeOptionalText(input.search);
  const tag = normalizeOptionalText(input.tag)?.toLowerCase();
  const status = parseMediaStatus(input.status);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search,
    status: status ?? undefined,
    tag,
  };
}

export function parseMediaStatus(value: string | null | undefined): MediaStatus | null {
  if (!value || value === "all") {
    return null;
  }

  return MEDIA_STATUSES.has(value) ? (value as MediaStatus) : null;
}

function clampPositiveInteger(
  value: string | null | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
