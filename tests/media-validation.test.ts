import assert from "node:assert/strict";
import test from "node:test";

import {
  createExpiryDate,
  parseTags,
  validateMediaFile,
} from "../lib/media/validation";

test("parseTags trims, lowercases, removes empties, and deduplicates tags", () => {
  assert.deepEqual(parseTags(" nurse meme, Night Shift, nurse meme,, funny nurse "), [
    "nurse meme",
    "night shift",
    "funny nurse",
  ]);
});

test("validateMediaFile accepts supported image files under the size limit", () => {
  const result = validateMediaFile(
    { name: "quote.png", type: "image/png", size: 1024 },
    { maxFileSizeBytes: 2 * 1024 },
  );

  assert.deepEqual(result, { ok: true });
});

test("validateMediaFile rejects unsupported mime types", () => {
  const result = validateMediaFile(
    { name: "notes.txt", type: "text/plain", size: 10 },
    { maxFileSizeBytes: 1024 },
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /Unsupported file type/);
});

test("validateMediaFile rejects files above the configured size limit", () => {
  const result = validateMediaFile(
    { name: "huge.jpg", type: "image/jpeg", size: 2049 },
    { maxFileSizeBytes: 2048 },
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /exceeds/);
});

test("createExpiryDate adds the configured number of days", () => {
  const createdAt = new Date("2026-05-15T00:00:00.000Z");

  assert.equal(createExpiryDate(createdAt, 7).toISOString(), "2026-05-22T00:00:00.000Z");
});
