import assert from "node:assert/strict";
import { test } from "node:test";

import { partitionExpiredMediaAssetsForCleanup } from "../lib/media/cleanup";

test("partitionExpiredMediaAssetsForCleanup keeps assets linked to post jobs", () => {
  const result = partitionExpiredMediaAssetsForCleanup([
    {
      id: "linked",
      storage_key: "media/linked.png",
      _count: { post_job_media: 1 },
    },
    {
      id: "unused",
      storage_key: "media/unused.png",
      _count: { post_job_media: 0 },
    },
  ]);

  assert.deepEqual(result.retainedIds, ["linked"]);
  assert.deepEqual(result.deletableAssets, [
    {
      id: "unused",
      storage_key: "media/unused.png",
      _count: { post_job_media: 0 },
    },
  ]);
});
