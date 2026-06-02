import { MediaStatus } from "@/generated/prisma/enums";
import { parseMediaStatus } from "@/lib/media/query";
import { parseExpiryDateInput, parseTags } from "@/lib/media/validation";

export type BulkTagsMode = "add" | "replace";

export type BulkMediaUpdateInput = {
  status?: unknown;
  expires_at?: unknown;
  tags?: unknown;
  tagsMode?: unknown;
};

export type ParsedBulkMediaUpdate = {
  status?: MediaStatus;
  expires_at?: Date;
  tags?: string[];
  tagsMode?: BulkTagsMode;
};

export type BulkMediaAssetSnapshot = {
  id: string;
  tags: string[];
};

export function parseBulkMediaUpdateInput(input: BulkMediaUpdateInput): ParsedBulkMediaUpdate {
  const data: ParsedBulkMediaUpdate = {};

  if (typeof input.status === "string" && input.status) {
    const status = parseMediaStatus(input.status);

    if (!status) {
      throw new Error("Invalid media status.");
    }

    data.status = status;
  }

  if (typeof input.expires_at === "string" && input.expires_at.trim()) {
    data.expires_at = parseExpiryDateInput(input.expires_at);
  }

  if (typeof input.tags === "string") {
    const tags = parseTags(input.tags);

    if (tags.length > 0) {
      data.tags = tags;
      data.tagsMode = input.tagsMode === "replace" ? "replace" : "add";
    }
  }

  if (!data.status && !data.expires_at && !data.tags) {
    throw new Error("No media fields were provided for update.");
  }

  return data;
}

export function buildBulkMediaUpdateData(
  asset: BulkMediaAssetSnapshot,
  update: ParsedBulkMediaUpdate,
) {
  const data: {
    status?: MediaStatus;
    expires_at?: Date;
    tags?: string[];
  } = {};

  if (update.status) {
    data.status = update.status;
  }

  if (update.expires_at) {
    data.expires_at = update.expires_at;
  }

  if (update.tags) {
    data.tags = update.tagsMode === "replace"
      ? update.tags
      : [...new Set([...asset.tags, ...update.tags])];
  }

  return data;
}
