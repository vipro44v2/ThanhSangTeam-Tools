import "dotenv/config";

const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const intervalMs = Number(process.env.POST_WORKER_INTERVAL_MS || "60000");
const cronSecret = process.env.CRON_SECRET;

async function publishDuePosts() {
  const headers = {};

  if (cronSecret) {
    headers.authorization = `Bearer ${cronSecret}`;
  }

  const response = await fetch(`${appUrl}/api/cron/publish-due-posts`, {
    method: "POST",
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }

  const posted = payload.results?.filter((result) => result.status === "posted").length ?? 0;
  const failed = payload.results?.filter((result) => result.status === "failed").length ?? 0;
  console.log(
    `[${new Date().toISOString()}] due=${payload.due ?? 0} posted=${posted} failed=${failed}`,
  );
}

async function tick() {
  try {
    await publishDuePosts();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] publish worker error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

console.log(`Post worker polling ${appUrl}/api/cron/publish-due-posts every ${intervalMs}ms`);
await tick();
setInterval(tick, intervalMs);
