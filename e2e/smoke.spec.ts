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
});
