import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSessionSecret } from "../lib/session-secret";

test("resolveSessionSecret requires SESSION_SECRET in production when used", () => {
  assert.throws(
    () => resolveSessionSecret({ NODE_ENV: "production" }),
    /SESSION_SECRET is required in production/,
  );
});

test("resolveSessionSecret uses a development fallback outside production", () => {
  assert.equal(
    resolveSessionSecret({ NODE_ENV: "development" }),
    "dev-secret-key-change-in-production",
  );
});
