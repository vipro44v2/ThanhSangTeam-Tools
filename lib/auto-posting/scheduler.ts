import { runAutoPosting } from "./generator";

const INTERVAL_MS = Number(process.env.AUTO_POST_INTERVAL_MS ?? String(6 * 60 * 60 * 1000)); // default 6h
const SCHEDULER_STATE_KEY = "__autoPostingSchedulerState";

type SchedulerState = {
  started?: boolean;
  running?: boolean;
};

export function startAutoPostingScheduler() {
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
      const result = await runAutoPosting();
      const total = result.results.reduce((sum, r) => sum + r.generated, 0);
      if (total > 0) {
        console.log(
          `[auto-posting] ${new Date().toISOString()} rules=${result.rules} generated=${total}`,
        );
      }
    } catch (err) {
      console.error(
        `[auto-posting] ${new Date().toISOString()} error:`,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      state.running = false;
    }
  }

  tick();
  setInterval(tick, INTERVAL_MS).unref();
  console.log(`[auto-posting] started, running every ${INTERVAL_MS / 1000 / 60} min`);
}
