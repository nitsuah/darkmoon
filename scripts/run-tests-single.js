#!/usr/bin/env node
// Wrapper to run npm test:ci with VITEST_MAX_WORKERS=1 in a cross-platform way.
process.env.VITEST_MAX_WORKERS = process.env.VITEST_MAX_WORKERS || "1";

import { spawnSync } from "child_process";

const cwd = process.cwd();
console.log(
  "Running tests with VITEST_MAX_WORKERS=%s",
  process.env.VITEST_MAX_WORKERS
);

// Run vitest directly using npx to avoid spawning an npm child process which
// can trigger IPC issues in some Node/OS environments.
const runner = process.platform === "win32" ? "npx.cmd" : "npx";
const args = [
  "vitest",
  "run",
  "--coverage",
  "--config",
  "./config/vitest.config.ts",
];

// Retry a few times to mitigate intermittent IPC crashes observed in some
// Windows/Node environments. Keep output live for the user by using
// stdio: 'inherit'. If it fails repeatedly, return last exit code.
const MAX_ATTEMPTS = 3;
let lastResult = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  if (attempt > 1)
    console.warn(`Retrying tests (attempt ${attempt}/${MAX_ATTEMPTS})...`);
  const res = spawnSync(runner, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  });
  lastResult = res;
  if (res.status === 0) {
    process.exit(0);
  }
}

// If we get here, all attempts failed. Exit with the last status code.
process.exit((lastResult && lastResult.status) || 1);
