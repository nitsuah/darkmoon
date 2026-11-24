import { test, expect, type Page } from "@playwright/test";
import type { DarkmoonTestProbe } from "../src/lib/testProbe";

declare global {
  interface Window {
    __darkmoonTest?: DarkmoonTestProbe;
  }
}

// Reticle vs firing ray (#482). The reticle is a DOM overlay and shots fly along
// the camera ray through NDC (0, 0). These checks read both through the dev-only
// test probe, so the assertion is geometric (the two rays agree, a shot along
// the ray hits, a shot off it misses) and never depends on frame timing. What
// they cannot judge is how real-mouse aiming feels under pointer lock.

type Vec3 = { x: number; y: number; z: number };
const SLOW = { timeout: 30_000 };
// Rays closer than ~0.05 degrees count as the same ray.
const MIN_COSINE = Math.cos((0.05 * Math.PI) / 180);
const SMG_DAMAGE = 12;

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

async function setUpRange(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("darkmoon-tutorial-complete", "true");
  });
  await page.goto("/solo");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__darkmoonTest)), SLOW)
    .toBe(true);
  await page.getByRole("button", { name: /Deathmatch/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = window.__darkmoonTest!.getSnapshot();
          return s.position !== null && s.targets.some((t) => (t.health ?? 0) > 0);
        }),
      SLOW,
    )
    .toBe(true);
  await page.evaluate(() => {
    const probe = window.__darkmoonTest!;
    probe.freezeBots(true);
    probe.disablePickups(true);
    probe.setLoadout("smg");
  });
  await expect
    .poll(() => page.evaluate(() => window.__darkmoonTest!.getAimRays() !== null), SLOW)
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__darkmoonTest!.getSnapshot().ammo), SLOW)
    .toBe(40);
}

const rays = (page: Page) =>
  page.evaluate(() => window.__darkmoonTest!.getAimRays());

async function expectReticleOnFireRay(page: Page) {
  const r = await rays(page);
  expect(r?.reticle, "reticle is on screen").not.toBeNull();
  expect(dot(r!.fire, r!.reticle!)).toBeGreaterThan(MIN_COSINE);
  expect(Math.abs(r!.reticleNdc!.x)).toBeLessThan(0.002);
  expect(Math.abs(r!.reticleNdc!.y)).toBeLessThan(0.002);
}

test.describe("reticle and firing ray", () => {
  test.setTimeout(300_000);

  test("the reticle stays on the firing ray as the mouse, camera and viewport change", async ({ page }) => {
    await setUpRange(page);
    await expectReticleOnFireRay(page);

    // A free mouse moving to the corner must not drag the reticle with it.
    await page.mouse.move(5, 5);
    await expectReticleOnFireRay(page);

    // Rotating the camera (right-drag) changes the ray; the reticle must follow it.
    const before = (await rays(page))!.fire;
    await page.mouse.move(400, 300);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(520, 340, { steps: 2 });
    await page.mouse.up({ button: "right" });
    await expect
      .poll(async () => dot((await rays(page))!.fire, before), SLOW)
      .toBeLessThan(MIN_COSINE);
    await expectReticleOnFireRay(page);

    // A different aspect ratio keeps the reticle on the ray too.
    await page.setViewportSize({ width: 900, height: 700 });
    await expect.poll(async () => (await rays(page))?.reticleNdc?.x ?? 1, SLOW).toBeCloseTo(0, 2);
    await expectReticleOnFireRay(page);
  });

  test("a shot along the firing ray hits and a shot off it misses, with no aim override", async ({ page }) => {
    await setUpRange(page);
    const snap = await page.evaluate(() => window.__darkmoonTest!.getSnapshot());
    const target = snap.targets.find((t) => (t.health ?? 0) > 0)!;
    const p = snap.position!;
    const muzzle = { x: p.x, y: p.y + 1, z: p.z };
    const aim = (await rays(page))!.fire;
    const place = (at: Vec3) =>
      page.evaluate(
        ({ id, to }) => window.__darkmoonTest!.placeTarget(id, to),
        { id: target.id, to: at },
      );
    const health = () =>
      page.evaluate(
        (id) =>
          window.__darkmoonTest!.getSnapshot().targets.find((t) => t.id === id)?.health ?? null,
        target.id,
      );
    const ammo = () => page.evaluate(() => window.__darkmoonTest!.getSnapshot().ammo);
    // Pull until the magazine drops (a pull inside the cooldown is ignored).
    const shoot = async (start: number) => {
      await expect
        .poll(async () => {
          await page.evaluate((s) => {
            const probe = window.__darkmoonTest!;
            if ((probe.getSnapshot().ammo ?? s) >= s) probe.fire();
          }, start);
          return (await ammo())! < start;
        }, SLOW)
        .toBe(true);
    };

    // Off the ray: 4 units to the side of the aim direction.
    const side = { x: -aim.z, y: 0, z: aim.x };
    const sideLen = Math.hypot(side.x, side.z) || 1;
    expect(
      await place({
        x: muzzle.x + (side.x / sideLen) * 4,
        y: muzzle.y,
        z: muzzle.z + (side.z / sideLen) * 4,
      }),
    ).toBe(true);
    const full = (await health())!;
    const a0 = (await ammo())!;
    await shoot(a0);
    expect(await health()).toBe(full);

    // On the ray: 4 units straight along the camera ray.
    expect(
      await place({
        x: muzzle.x + aim.x * 4,
        y: muzzle.y + aim.y * 4,
        z: muzzle.z + aim.z * 4,
      }),
    ).toBe(true);
    await page.waitForTimeout(400); // outlast the SMG's 120 ms cooldown
    await shoot((await ammo())!);
    expect(await health()).toBe(full - SMG_DAMAGE);
  });
});
