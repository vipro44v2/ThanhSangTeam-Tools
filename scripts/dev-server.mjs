import { spawn } from "node:child_process";
import path from "node:path";

const distDir = `.next-dev-${Date.now()}`;
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

console.log(`Starting Next dev server with isolated cache: ${distDir}`);

const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_DIST_DIR: distDir,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
