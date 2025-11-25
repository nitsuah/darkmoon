#!/usr/bin/env node
// In-process Vitest runner to avoid worker IPC crashes in some environments.
// This imports Vitest programmatically and forces single-threaded/in-process
// execution when possible.
import { run } from "vitest";

async function main() {
  try {
    // Try to run vitest programmatically. We pass `threads: false` to prefer
    // in-process execution. If the runner doesn't honor this, tests may still
    // spawn workers, but overall this is more robust than spawning child
    // processes in some Windows environments.
    await run({
      config: "./config/vitest.config.ts",
      run: true,
      threads: false,
    });
    process.exit(0);
  } catch (err) {
    // Print error and exit non-zero so pre-push fails if tests fail.
    // Vitest may throw on test failures.
     
    console.error("In-process vitest run failed:", err);
    process.exit(1);
  }
}

void main();
