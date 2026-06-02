import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBulkMediaUpdateData,
  parseBulkMediaUpdateInput,
} from "../lib/media/bulk";

test("parseBulkMediaUpdateInput accepts status, expiry, and replace tags", () => {
  assert.deepEqual(
    parseBulkMediaUpdateInput({
      status: "available",
      expires_at: "2026-07-01",
      tags: "Night Shift, ICU",
      tagsMode: "replace",
    }),
    {
      status: "available",
      expires_at: new Date("2026-07-01T00:00:00.000Z"),
      tags: ["night shift", "icu"],
      tagsMode: "replace",
    },
  );
});

test("parseBulkMediaUpdateInput defaults tags mode to add", () => {
  assert.deepEqual(
    parseBulkMediaUpdateInput({
      tags: "night shift",
    }),
    {
      tags: ["night shift"],
      tagsMode: "add",
    },
  );
});

test("parseBulkMediaUpdateInput rejects empty updates", () => {
  assert.throws(
    () => parseBulkMediaUpdateInput({ tags: "  " }),
    /No media fields were provided/,
  );
});

test("buildBulkMediaUpdateData adds tags without duplicates", () => {
  assert.deepEqual(
    buildBulkMediaUpdateData(
      { id: "asset-1", tags: ["icu", "meme"] },
      { tags: ["icu", "night shift"], tagsMode: "add" },
    ),
    {
      tags: ["icu", "meme", "night shift"],
    },
  );
});

test("buildBulkMediaUpdateData replaces tags and includes shared fields", () => {
  const expiresAt = new Date("2026-06-01T00:00:00.000Z");

  assert.deepEqual(
    buildBulkMediaUpdateData(
      { id: "asset-1", tags: ["old"] },
      {
        status: "deleted",
        expires_at: expiresAt,
        tags: ["new"],
        tagsMode: "replace",
      },
    ),
    {
      status: "deleted",
      expires_at: expiresAt,
      tags: ["new"],
    },
  );
});
