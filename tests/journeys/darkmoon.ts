// Fixture for the nightly journeys: the built app served by `vite preview`
// (see config/playwright.journeys.config.ts), a fixed first-run state, and
// web fonts blocked so text renders in the installed fallback font.
import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';

export { expect };
export { step } from './journey';

export const test = base.extend({
  page: async ({ page }, use) => {
    // The first-run tutorial would sit on top of the game controls.
    await page.addInitScript(() => {
      window.localStorage.setItem('darkmoon-tutorial-complete', 'true');
    });
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
    await use(page);
  },
});

/** Collect uncaught page errors; the journey asserts the list is empty at the end. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`));
  return errors;
}

/** Let fonts and CSS transitions finish before a baseline. */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
