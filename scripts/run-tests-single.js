#!/usr/bin/env node
// Wrapper to run npm test:ci with VITEST_MAX_WORKERS=1 in a cross-platform way.
process.env.VITEST_MAX_WORKERS = process.env.VITEST_MAX_WORKERS || "1";

import { spawnSync } from "child_process";

const cwd = process.cwd();
console.log(
  "Running tests with VITEST_MAX_WORKERS=%s",
  process.env.VITEST_MAX_WORKERS
);

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "test:ci"],
  {
    cwd,
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  }
);

process.exit(result.status ?? 1);
