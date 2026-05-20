import { publishDuePostJobs } from "./publisher";

const INTERVAL_MS = Number(process.env.POST_WORKER_INTERVAL_MS ?? "60000");
const SCHEDULER_STATE_KEY = "__postSchedulerState";

type SchedulerState = {
  started?: boolean;
  running?: boolean;
};

export function startScheduler() {
  const globalState = globalThis as typeof globalThis & {
    [SCHEDULER_STATE_KEY]?: SchedulerState;
  };
  const state = globalState[SCHEDULER_STATE_KEY] ??= {};
  if (state.started) return;
  state.started = true;

  async function tick() {
    if (state.running) return;
    state.running = true;
    try {
      const result = await publishDuePostJobs();
      const posted = result.results.filter((r) => r.status === "posted").length;
      const failed = result.results.filter((r) => r.status === "failed").length;
      if (result.due > 0) {
        console.log(
          `[scheduler] ${new Date().toISOString()} due=${result.due} posted=${posted} failed=${failed}`,
        );
      }
    } catch (err) {
      console.error(
        `[scheduler] ${new Date().toISOString()} error:`,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      state.running = false;
    }
  }

  tick();
  setInterval(tick, INTERVAL_MS).unref();
  console.log(`[scheduler] started, polling every ${INTERVAL_MS}ms`);
}
