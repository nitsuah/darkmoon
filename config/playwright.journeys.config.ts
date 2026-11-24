// Nightly "AI user" journeys: happy paths a real player takes, one visual
// baseline per DOM step. Run by .github/workflows/journeys.yml through the
// shared nitsuah/.github journeys harness, which files/dedups/closes
// `bot:journey` issues from the JSON report (contract: journeys/STANDARD.md).
//
// Baselines are Linux-only: generate them in the Playwright Docker image
// (see tests/journeys/README.md). The WebGL canvas is never baselined (software
// rendering is not pixel-stable); canvas steps assert behaviour instead.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;

export default defineConfig({
  testDir: path.join(repoRoot, 'tests', 'journeys'),
  outputDir: path.join(repoRoot, 'test-results', 'journeys'),
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{testName}/{arg}{ext}',
  // A missing baseline must fail in CI instead of being written and thrown away.
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0, // pass-on-retry = flaky, not an issue
  timeout: 180_000,
  reporter: [['list'], ['json', { outputFile: path.join(repoRoot, 'journeys-report', 'report.json') }]],
  expect: {
    timeout: 30_000, // software WebGL makes the game screen slow
    toHaveScreenshot: { maxDiffPixels: 100, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  webServer: {
    command: `npm run build && npx vite preview --config config/vite.config.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});
