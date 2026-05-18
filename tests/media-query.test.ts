import assert from "node:assert/strict";
import test from "node:test";

import {
  parseMediaListParams,
  parseMediaStatus,
} from "../lib/media/query";

test("parseMediaListParams clamps invalid page and limit values", () => {
  assert.deepEqual(
    parseMediaListParams({
      page: "0",
      limit: "999",
    }),
    {
      page: 1,
      limit: 60,
      skip: 0,
      search: undefined,
      status: undefined,
      tag: undefined,
    },
  );
});

test("parseMediaListParams keeps valid filters", () => {
  assert.deepEqual(
    parseMediaListParams({
      page: "3",
      limit: "24",
      search: "quote",
      status: "available",
      tag: " Night Shift ",
    }),
    {
      page: 3,
      limit: 24,
      skip: 48,
      search: "quote",
      status: "available",
      tag: "night shift",
    },
  );
});

test("parseMediaStatus rejects unknown statuses", () => {
  assert.equal(parseMediaStatus("archived"), null);
});

test("parseMediaStatus accepts known statuses", () => {
  assert.equal(parseMediaStatus("deleted"), "deleted");
});
