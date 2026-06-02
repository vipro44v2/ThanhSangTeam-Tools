import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const LOCAL_DATABASE_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://postgres:1234@localhost:5432/nurse-fb-auto-poster1?schema=public";

const REMOTE_DATABASE_URL = process.env.REMOTE_DATABASE_URL ?? process.env.DATABASE_URL;

const tables = [
  "page_categories",
  "facebook_accounts",
  "users",
  "settings",
  "media_assets",
  "caption_sheets",
  "facebook_pages",
  "post_jobs",
  "post_job_media",
  "page_media_usage",
  "auto_posting_rules",
];

const mode = process.argv[2] ?? "--counts";

if (!REMOTE_DATABASE_URL) {
  throw new Error("DATABASE_URL or REMOTE_DATABASE_URL is required.");
}

function makeClient(connectionString) {
  const isSupabase = connectionString.includes("supabase.co");
  const normalizedConnectionString = isSupabase
    ? connectionString.replace(/[?&]sslmode=[^&]+/, (match) =>
        match.startsWith("?") ? "?" : "",
      ).replace(/[?&]$/, "")
    : connectionString;

  return new Client({
    connectionString: normalizedConnectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });
}

function quoteIdent(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function getColumns(client, table) {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );

  return result.rows.map((row) => row.column_name);
}

async function countRows(client) {
  const counts = {};

  for (const table of tables) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM public.${quoteIdent(table)}`,
    );
    counts[table] = result.rows[0].count;
  }

  return counts;
}

function printCounts(label, counts) {
  console.log(label);
  for (const table of tables) {
    console.log(`${table}: ${counts[table]}`);
  }
}

async function migrateTable(local, remote, table) {
  const columns = await getColumns(remote, table);
  const columnList = columns.map(quoteIdent).join(", ");
  const localRows = await local.query(
    `SELECT ${columnList} FROM public.${quoteIdent(table)}`,
  );

  if (localRows.rowCount === 0) {
    return 0;
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const updateColumns = columns.filter((column) => column !== "id");
  const updateClause =
    updateColumns.length > 0
      ? `DO UPDATE SET ${updateColumns
          .map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`)
          .join(", ")}`
      : "DO NOTHING";

  const insertSql = `
    INSERT INTO public.${quoteIdent(table)} (${columnList})
    VALUES (${placeholders})
    ON CONFLICT (${quoteIdent("id")}) ${updateClause}
  `;

  for (const row of localRows.rows) {
    await remote.query(
      insertSql,
      columns.map((column) => row[column]),
    );
  }

  return localRows.rowCount;
}

async function main() {
  const local = makeClient(LOCAL_DATABASE_URL);
  const remote = makeClient(REMOTE_DATABASE_URL);

  console.log("Connecting local database...");
  await local.connect();
  console.log("Connecting remote database...");
  await remote.connect();
  console.log("Connected.");

  try {
    if (mode === "--counts") {
      printCounts("Local", await countRows(local));
      printCounts("Remote", await countRows(remote));
      return;
    }

    if (mode !== "--migrate") {
      throw new Error("Usage: node scripts/migrate-local-data-to-supabase.mjs --counts|--migrate");
    }

    await remote.query("BEGIN");

    try {
      for (const table of tables) {
        const migrated = await migrateTable(local, remote, table);
        console.log(`${table}: migrated ${migrated}`);
      }

      await remote.query("COMMIT");
    } catch (error) {
      await remote.query("ROLLBACK");
      throw error;
    }

    printCounts("Local after migrate", await countRows(local));
    printCounts("Remote after migrate", await countRows(remote));
  } finally {
    await remote.end();
    await local.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
