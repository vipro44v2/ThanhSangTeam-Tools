export type ExpiredMediaCleanupCandidate = {
  id: string;
  storage_key: string;
  _count: {
    post_job_media: number;
  };
};

export function partitionExpiredMediaAssetsForCleanup(
  assets: ExpiredMediaCleanupCandidate[],
) {
  return {
    deletableAssets: assets.filter((asset) => asset._count.post_job_media === 0),
    retainedIds: assets
      .filter((asset) => asset._count.post_job_media > 0)
      .map((asset) => asset.id),
  };
}
