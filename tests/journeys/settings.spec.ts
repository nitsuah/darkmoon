import { test, expect, step, settle } from './darkmoon';

test('player switches the theme and it survives a reload', {
  tag: ['@feature:theme-and-ui'],
}, async ({ page }) => {
  await page.goto('/solo');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 });
  const stored = () => page.evaluate(() => window.localStorage.getItem('darkmoon-theme'));

  await step(page, 'open the utility menu and switch to light mode', async () => {
    await page.getByTitle('Open Utilities').click();
    await page.getByTitle('Light Mode').dispatchEvent('click'); // software WebGL runs the page at ~4 FPS, so skip the click's stability wait
    await expect.poll(stored).toBe('light');
  }, { screenshot: false });

  await step(page, 'reload and still see light mode', async () => {
    await page.reload();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 });
    await settle(page);
    expect(await stored()).toBe('light');
    await page.getByTitle('Open Utilities').click();
    await expect(page.getByTitle('Dark Mode')).toBeVisible();
  }, { screenshot: false });
});
