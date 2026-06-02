import assert from "node:assert/strict";
import { test } from "node:test";

import { createPgPoolOptions } from "../lib/database-url";

test("createPgPoolOptions configures Supabase direct URLs for pg TLS", () => {
  const options = createPgPoolOptions(
    "postgresql://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require",
  );

  assert.equal(
    options.connectionString,
    "postgresql://postgres:secret@db.example.supabase.co:5432/postgres",
  );
  assert.deepEqual(options.ssl, { rejectUnauthorized: false });
});

test("createPgPoolOptions keeps local URLs unchanged", () => {
  const options = createPgPoolOptions(
    "postgresql://postgres:secret@localhost:5432/nurse-fb-auto-poster1?schema=public",
  );

  assert.equal(
    options.connectionString,
    "postgresql://postgres:secret@localhost:5432/nurse-fb-auto-poster1?schema=public",
  );
  assert.equal(options.ssl, undefined);
});
