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

// If we get here, all attempts failed. Try a sequential per-file fallback to
// avoid worker pool IPC crashes. This is slower but more robust on flaky
// environments.
try {
  console.warn(
    "Parallel test run failed — attempting sequential test run as fallback..."
  );

  const fs = await import("fs");
  const path = await import("path");
  const { readdirSync, statSync } = fs;

  function collectTests(dir) {
    const results = [];
    const files = readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const st = statSync(full);
      if (st.isDirectory()) {
        results.push(...collectTests(full));
      } else if (/\.test\.(t|j)sx?$/.test(f) || /\.(spec)\.(t|j)sx?$/.test(f)) {
        results.push(full);
      }
    }
    return results;
  }

  const testRoots = [path.join(cwd, "src"), path.join(cwd, "server")];
  let testFiles = [];
  for (const root of testRoots) {
    try {
      testFiles.push(...collectTests(root));
    } catch {
      // ignore missing directories
    }
  }

  if (testFiles.length === 0) {
    console.error(
      "No test files found for sequential fallback. Exiting with last status."
    );
    process.exit((lastResult && lastResult.status) || 1);
  }

  for (const tf of testFiles) {
    console.log(`Running test file: ${tf}`);
    const res = spawnSync(
      runner,
      ["vitest", "run", tf, "--config", "./config/vitest.config.ts"],
      {
        cwd,
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          VITEST_MAX_WORKERS: process.env.VITEST_MAX_WORKERS || "1",
        },
      }
    );
    if (res.status !== 0) {
      console.error(`Test file failed: ${tf}`);
      process.exit(res.status || 1);
    }
  }

  // all sequential tests passed
  process.exit(0);
} catch (e) {
  console.error("Sequential fallback failed:", e);
  process.exit((lastResult && lastResult.status) || 1);
}
