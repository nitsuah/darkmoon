import { test, expect } from "@playwright/test";

test.describe("Darkmoon E2E Smoke Tests", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("DARKMOON.DEV");
  });

  test("solo scene mounts without uncaught browser errors", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      // The E2E container runs Vite in middleware mode; its HMR WebSocket
      // listens on a container-only port and cannot be reached by Chromium.
      // Ignore only that known dev-server error, not application exceptions.
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.goto("/solo");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => {
        const bounds = await canvas.boundingBox();
        return bounds ? bounds.width > 0 && bounds.height > 0 : false;
      })
      .toBe(true);

    // Allow the initial React/Three.js render and effects to run before checking.
    await page.waitForTimeout(1000);
    expect(pageErrors, "uncaught application errors during solo startup").toEqual([]);
  });

  test("gallery debug bot can fire and score in a playable round", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    // Make first-run UI deterministic so the tutorial cannot intercept game controls.
    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10000 });

    // Use the game's own debug bot as a deterministic actor instead of trying
    // to infer hit registration from screenshots or canvas pixels.
    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await page.getByRole("button", { name: /Shooting Gallery/ }).click();

    await expect(page.getByText(/Shooting Gallery! Hit targets to score/i)).toBeVisible({ timeout: 5000 });

    // The game UI scoreboard hook opens on I; assert a positive score rather than
    // assuming the bot is functional just because the round started.
    await page.keyboard.down("i");
    try {
      await expect(page.getByText(/SHOOTING_GALLERY — SCORES/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/^[1-9]\d* pts$/).first()).toBeVisible({ timeout: 15000 });
    } finally {
      await page.keyboard.up("i");
    }

    expect(pageErrors, "uncaught application errors during gallery gameplay").toEqual([]);
  });
});
