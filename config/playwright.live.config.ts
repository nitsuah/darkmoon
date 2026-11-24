// Nightly crawl of the deployed site (no local server). Run by
// .github/workflows/live-crawl.yml; locally:
//   BASE_URL=https://darkmoon.dev npx playwright test -c config/playwright.live.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  testDir: path.join(repoRoot, 'tests', 'live'),
  outputDir: path.join(repoRoot, 'test-results', 'live'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // The JSON report feeds the shared bot:journey issue reporter.
  reporter: process.env.CI
    ? [['list'], ['json', { outputFile: path.join(repoRoot, 'journeys-report', 'report.json') }]]
    : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://darkmoon.dev',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
