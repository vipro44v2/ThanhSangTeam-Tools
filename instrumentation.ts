export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/posts/scheduler");
    const { startAutoPostingScheduler } = await import("./lib/auto-posting/scheduler");
    startScheduler();
    startAutoPostingScheduler();
  }
}
