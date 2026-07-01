import { test, expect } from "@playwright/test";

test.describe("Darkmoon E2E Smoke Tests", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("http://localhost:4444/");
    const title = await page.title();
    expect(title).toBe("DARKMOON.DEV");
  });

  test("solo page loads", async ({ page }) => {
    await page.goto("http://localhost:4444/solo");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });
});
