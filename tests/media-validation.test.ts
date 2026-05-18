import assert from "node:assert/strict";
import test from "node:test";

import {
  createExpiryDate,
  isMediaAssetExpired,
  isMediaAssetExpiringSoon,
  parseExpiryDateInput,
  parseTags,
  parseRetentionDaysInput,
  resolveUploadRetentionDays,
  resolveUploadTags,
  validateMediaFile,
} from "../lib/media/validation";

test("parseTags trims, lowercases, removes empties, and deduplicates tags", () => {
  assert.deepEqual(parseTags(" nurse meme, Night Shift, nurse meme,, funny nurse "), [
    "nurse meme",
    "night shift",
    "funny nurse",
  ]);
});

test("resolveUploadTags uses per-file tags when provided", () => {
  assert.equal(resolveUploadTags("common", ["first", "second"], 0), "first");
  assert.equal(resolveUploadTags("common", ["first", "second"], 1), "second");
});

test("resolveUploadTags falls back to shared tags when per-file tags are blank or missing", () => {
  assert.equal(resolveUploadTags("common", ["first", " "], 1), "common");
  assert.equal(resolveUploadTags("common", ["first"], 2), "common");
});

test("resolveUploadRetentionDays uses per-file days when provided", () => {
  assert.equal(resolveUploadRetentionDays("7", ["10", "14"], 0), "10");
  assert.equal(resolveUploadRetentionDays("7", ["10", "14"], 1), "14");
});

test("resolveUploadRetentionDays falls back to shared days when per-file days are blank or missing", () => {
  assert.equal(resolveUploadRetentionDays("7", ["10", " "], 1), "7");
  assert.equal(resolveUploadRetentionDays("7", ["10"], 2), "7");
});

test("resolveUploadRetentionDays leaves days unset when shared and per-file days are blank", () => {
  assert.equal(resolveUploadRetentionDays("", [" "], 0), undefined);
  assert.equal(resolveUploadRetentionDays("", [], 0), undefined);
});

test("parseRetentionDaysInput accepts positive whole days", () => {
  assert.equal(parseRetentionDaysInput("14"), 14);
});

test("parseRetentionDaysInput rejects invalid days", () => {
  assert.throws(() => parseRetentionDaysInput("0"), /Invalid expiry days/);
  assert.throws(() => parseRetentionDaysInput("-1"), /Invalid expiry days/);
  assert.throws(() => parseRetentionDaysInput("1.5"), /Invalid expiry days/);
  assert.throws(() => parseRetentionDaysInput("abc"), /Invalid expiry days/);
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

test("isMediaAssetExpired detects assets at or before the current time", () => {
  const now = new Date("2026-05-18T12:00:00.000Z");

  assert.equal(isMediaAssetExpired(new Date("2026-05-18T12:00:00.000Z"), now), true);
  assert.equal(isMediaAssetExpired(new Date("2026-05-18T11:59:59.999Z"), now), true);
  assert.equal(isMediaAssetExpired(new Date("2026-05-18T12:00:00.001Z"), now), false);
});

test("isMediaAssetExpiringSoon detects active assets expiring within the window", () => {
  const now = new Date("2026-05-18T12:00:00.000Z");
  const inTwoDays = new Date("2026-05-20T12:00:00.000Z");

  assert.equal(isMediaAssetExpiringSoon(new Date("2026-05-18T12:00:00.000Z"), now, inTwoDays), false);
  assert.equal(isMediaAssetExpiringSoon(new Date("2026-05-19T12:00:00.000Z"), now, inTwoDays), true);
  assert.equal(isMediaAssetExpiringSoon(new Date("2026-05-20T12:00:00.000Z"), now, inTwoDays), true);
  assert.equal(isMediaAssetExpiringSoon(new Date("2026-05-20T12:00:00.001Z"), now, inTwoDays), false);
});

test("parseExpiryDateInput accepts yyyy-mm-dd dates", () => {
  assert.equal(parseExpiryDateInput("2026-05-31").toISOString(), "2026-05-31T00:00:00.000Z");
});

test("parseExpiryDateInput rejects invalid dates", () => {
  assert.throws(() => parseExpiryDateInput("2026-02-31"), /Invalid expiry date/);
  assert.throws(() => parseExpiryDateInput("not-a-date"), /Invalid expiry date/);
});
