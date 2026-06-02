import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDatabaseUrl } from "../lib/database-url";

test("resolveDatabaseUrl prefers DATABASE_URL", () => {
  assert.equal(
    resolveDatabaseUrl({
      DATABASE_URL: "postgresql://database-url",
      POSTGRES_PRISMA_URL: "postgresql://postgres-prisma-url",
      POSTGRES_URL: "postgresql://postgres-url",
    }),
    "postgresql://database-url",
  );
});

test("resolveDatabaseUrl falls back to POSTGRES_PRISMA_URL", () => {
  assert.equal(
    resolveDatabaseUrl({
      POSTGRES_PRISMA_URL: "postgresql://postgres-prisma-url",
      POSTGRES_URL: "postgresql://postgres-url",
    }),
    "postgresql://postgres-prisma-url",
  );
});

test("resolveDatabaseUrl falls back to POSTGRES_URL", () => {
  assert.equal(
    resolveDatabaseUrl({
      POSTGRES_URL: "postgresql://postgres-url",
    }),
    "postgresql://postgres-url",
  );
});

test("resolveDatabaseUrl requires a database connection string", () => {
  assert.throws(
    () => resolveDatabaseUrl({}),
    /DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL is required/,
  );
});
