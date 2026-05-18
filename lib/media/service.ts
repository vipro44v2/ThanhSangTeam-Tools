import { randomUUID } from "node:crypto";

import { MediaStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { readImageDimensions } from "@/lib/media/image-dimensions";
import { deleteMediaFile, saveMediaFile } from "@/lib/media/local-storage";
import { MediaListParams, parseMediaStatus } from "@/lib/media/query";
import {
  createExpiryDate,
  getMediaUploadConfig,
  parseTags,
  validateMediaFile,
} from "@/lib/media/validation";

export type MediaUploadResult = {
  created: Awaited<ReturnType<typeof createMediaAsset>>[];
  errors: { fileName: string; error: string }[];
};

export async function createMediaAsset(file: File, rawTags: string) {
  const config = getMediaUploadConfig();
  const validation = validateMediaFile(file, config);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const createdAt = new Date();
  const storedFile = await saveMediaFile(file);
  const dimensions = readImageDimensions(storedFile.buffer, file.type);

  return prisma.media_assets.create({
    data: {
      id: randomUUID(),
      file_url: storedFile.fileUrl,
      storage_key: storedFile.storageKey,
      file_name: file.name,
      mime_type: file.type,
      width: dimensions?.width,
      height: dimensions?.height,
      size_bytes: file.size,
      tags: parseTags(rawTags),
      status: MediaStatus.available,
      expires_at: createExpiryDate(createdAt, config.retentionDays),
      created_at: createdAt,
    },
  });
}

export async function createMediaAssets(files: File[], rawTags: string): Promise<MediaUploadResult> {
  const created: MediaUploadResult["created"] = [];
  const errors: MediaUploadResult["errors"] = [];

  for (const file of files) {
    try {
      created.push(await createMediaAsset(file, rawTags));
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  return { created, errors };
}

export async function listMediaAssets(params: MediaListParams) {
  const where = {
    ...(params.tag ? { tags: { has: params.tag } } : {}),
    ...(params.status
      ? { status: params.status }
      : { status: { not: MediaStatus.deleted } }),
    ...(params.search
      ? {
          file_name: {
            contains: params.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [assets, total] = await Promise.all([
    prisma.media_assets.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      skip: params.skip,
      take: params.limit,
    }),
    prisma.media_assets.count({ where }),
  ]);

  return {
    assets,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listMediaTags() {
  const assets = await prisma.media_assets.findMany({
    where: {
      status: {
        not: MediaStatus.deleted,
      },
    },
    select: {
      tags: true,
    },
  });

  const tags = new Set<string>();

  for (const asset of assets) {
    for (const tag of asset.tags) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export async function updateMediaAsset(
  id: string,
  input: {
    tags?: string;
    status?: string;
  },
) {
  const data: {
    tags?: string[];
    status?: MediaStatus;
  } = {};

  if (input.tags !== undefined) {
    data.tags = parseTags(input.tags);
  }

  if (input.status !== undefined) {
    const status = parseMediaStatus(input.status);

    if (!status) {
      throw new Error("Invalid media status.");
    }

    data.status = status;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("No media fields were provided for update.");
  }

  return prisma.media_assets.update({
    where: { id },
    data,
  });
}

export async function markMediaAssetDeleted(id: string) {
  const asset = await prisma.media_assets.findUnique({
    where: { id },
  });

  if (!asset) {
    return null;
  }

  await deleteMediaFile(asset.storage_key);

  return prisma.media_assets.update({
    where: { id },
    data: {
      status: MediaStatus.deleted,
    },
  });
}
