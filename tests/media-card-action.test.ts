import assert from "node:assert/strict";
import test from "node:test";

import { getMediaCardAction, getMediaCardActions } from "../lib/media/card-action";

test("deleted media shows restore action", () => {
  assert.deepEqual(getMediaCardAction("deleted"), {
    label: "Restore",
    intent: "restore",
  });
});

test("deleted media shows restore and permanent delete actions", () => {
  assert.deepEqual(getMediaCardActions("deleted"), [
    {
      label: "Restore",
      intent: "restore",
    },
    {
      label: "Delete Forever",
      intent: "permanentDelete",
    },
  ]);
});

test("active media statuses show delete action", () => {
  for (const status of ["available", "used", "expired"] as const) {
    assert.deepEqual(getMediaCardAction(status), {
      label: "Delete",
      intent: "delete",
    });
    assert.deepEqual(getMediaCardActions(status), [
      {
        label: "Delete",
        intent: "delete",
      },
    ]);
  }
});
