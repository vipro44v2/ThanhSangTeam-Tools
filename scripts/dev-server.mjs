import { spawn } from "node:child_process";
import path from "node:path";

const distDir = `.next-dev-${Date.now()}`;
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const workerScript = path.join(process.cwd(), "scripts", "post-worker.mjs");

console.log(`Starting Next dev server with isolated cache: ${distDir}`);

const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  },
  stdio: "inherit",
});

const worker = spawn(process.execPath, [workerScript], {
  cwd: process.cwd(),
  env: {
    ...process.env,
  },
  stdio: "inherit",
  windowsHide: true,
});

function shutdown(signal) {
  worker.kill(signal);
  child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  worker.kill();

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

worker.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`Post worker exited with code ${code}`);
  }
});
