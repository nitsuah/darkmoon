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

const result = spawnSync(runner, args, {
  cwd,
  stdio: "inherit",
  shell: false,
  env: { ...process.env },
});

process.exit(result.status ?? 1);
