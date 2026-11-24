import { test, expect, step, settle, trackPageErrors } from './darkmoon';

test('player starts a solo round from the landing page', {
  tag: ['@feature:solo-practice'],
}, async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/');
  await settle(page);

  await step(page, 'see the landing page and the play button', async () => {
    await expect(page).toHaveTitle('DARKMOON.DEV');
    await expect(page.getByRole('button', { name: /START PLAYING/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solo Practice' })).toBeVisible();
  }, { docs: 'solo-practice' });

  await step(page, 'start solo practice and wait for the scene', async () => {
    await page.getByRole('button', { name: /START PLAYING/ }).click();
    await expect(page).toHaveURL(/\/solo$/);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 90_000 });
    await expect
      .poll(async () => {
        const b = await canvas.boundingBox();
        return !!b && b.width > 0 && b.height > 0;
      })
      .toBe(true);
    await page.waitForTimeout(1500); // first frames of the Three.js scene
  }, { screenshot: false });

  await step(page, 'open the utility menu from the game screen', async () => {
    await page.getByTitle('Open Utilities').click();
    await expect(page.getByTitle('Quality Settings')).toBeVisible();
  }, { screenshot: false });

  expect(errors, 'uncaught page errors while starting solo').toEqual([]);
});

test('player starts the shooting gallery', {
  tag: ['@feature:shooting-gallery'],
}, async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto('/solo');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90_000 });

  await step(page, 'switch on the gallery and see the gallery HUD', async () => {
    await page.getByRole('button', { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 90_000 });
  }, { screenshot: false });

  expect(errors, 'uncaught page errors in the gallery').toEqual([]);
});
