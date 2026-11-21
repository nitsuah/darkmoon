import { test, expect, type Page } from "@playwright/test";
import type { DarkmoonTestProbe } from "../src/lib/testProbe";

declare global {
  interface Window {
    __darkmoonTest?: DarkmoonTestProbe;
  }
}

// Aim/fire/damage end to end (#497). Uses the dev-only test probe
// (src/lib/testProbe.ts): it freezes the bots, places one target near the
// player, equips the SMG (finite ammo, 12 damage, single ray, 120 ms cooldown,
// no auto-reload) and aims shots at a target or a point. Shots go through the
// real PlayerWeapon -> processFiring -> GameManager.hitPlayer path.

type Vec3 = { x: number; y: number; z: number };
type Snapshot = {
  position: Vec3 | null;
  health: number | null;
  ammo: number | null;
  targets: Array<{ id: string; position: Vec3; health: number | null }>;
};

const SMG = { id: "smg", damage: 12, maxAmmo: 40, cooldownMs: 120 };
// Software WebGL in the E2E container stalls the page for ~20s at a time.
const SLOW = { timeout: 30_000 };

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    // Vite's HMR socket is unreachable from the E2E container; ignore only that.
    if (error.stack?.includes("/@vite/client")) return;
    errors.push(`${error.message}\n${error.stack ?? ""}`);
  });
  return errors;
}

const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    const snap = window.__darkmoonTest?.getSnapshot();
    if (!snap) throw new Error("Darkmoon test probe is not installed");
    return snap;
  });

const targetHealth = async (page: Page, id: string) =>
  (await snapshot(page)).targets.find((t) => t.id === id)?.health ?? null;

/** Start deathmatch, freeze bots, equip the SMG and put one target 4 units ahead. */
async function setUpRange(page: Page): Promise<string> {
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
    .poll(async () => {
      const snap = await snapshot(page);
      return snap.position !== null && snap.targets.some((t) => (t.health ?? 0) > 0);
    }, SLOW)
    .toBe(true);

  await page.evaluate((weaponId) => {
    const probe = window.__darkmoonTest!;
    probe.freezeBots(true);
    // Spawn points can sit on weapon pickups, which would swap out the SMG.
    probe.disablePickups(true);
    probe.setLoadout(weaponId);
  }, SMG.id);
  await expect.poll(async () => (await snapshot(page)).ammo, SLOW).toBe(SMG.maxAmmo);

  const snap = await snapshot(page);
  const target = snap.targets.find((t) => (t.health ?? 0) > 0)!;
  const p = snap.position!;
  const placed = await page.evaluate(
    ({ id, at }) => window.__darkmoonTest!.placeTarget(id, at),
    { id: target.id, at: { x: p.x, y: p.y, z: p.z - 4 } },
  );
  expect(placed).toBe(true);
  return target.id;
}

/** Pull the trigger until ammo drops below `before`; returns the new ammo. */
async function fireOnce(page: Page, before: number): Promise<number> {
  let ammo = before;
  await expect
    .poll(async () => {
      // Read ammo and pull in one step, and only while the shot has not landed,
      // so a retry (a pull inside the cooldown is ignored) never queues a second shot.
      ammo = await page.evaluate((start) => {
        const probe = window.__darkmoonTest!;
        const now = probe.getSnapshot().ammo ?? start;
        if (now >= start) probe.fire();
        return now;
      }, before);
      return ammo < before;
    }, SLOW)
    .toBe(true);
  return ammo;
}

test.describe("aim, fire and damage", () => {
  test.setTimeout(180_000);

  test("hit: one shot at the target costs 1 ammo and deals the weapon's damage", async ({ page }) => {
    const errors = trackPageErrors(page);
    const targetId = await setUpRange(page);

    expect(await page.evaluate((id) => window.__darkmoonTest!.aimAt(id), targetId)).toBe(true);
    const before = await snapshot(page);
    const healthBefore = before.targets.find((t) => t.id === targetId)!.health!;

    const ammoAfter = await fireOnce(page, before.ammo!);

    expect(ammoAfter).toBe(before.ammo! - 1);
    expect(await targetHealth(page, targetId)).toBe(healthBefore - SMG.damage);
    expect(errors, "uncaught application errors").toEqual([]);
  });

  test("miss: a shot 90 degrees off costs 1 ammo and deals no damage", async ({ page }) => {
    const errors = trackPageErrors(page);
    const targetId = await setUpRange(page);

    // The target sits 4 units along -z; aim 4 units along +x instead.
    const before = await snapshot(page);
    const p = before.position!;
    await page.evaluate((at) => window.__darkmoonTest!.aimAtPoint(at), { x: p.x + 4, y: p.y, z: p.z });
    const healthBefore = before.targets.find((t) => t.id === targetId)!.health!;

    const ammoAfter = await fireOnce(page, before.ammo!);

    expect(ammoAfter).toBe(before.ammo! - 1);
    expect(await targetHealth(page, targetId)).toBe(healthBefore);
    expect(errors, "uncaught application errors").toEqual([]);
  });

  test("empty magazine: a trigger pull at 0 ammo deals no damage", async ({ page }) => {
    const errors = trackPageErrors(page);
    const targetId = await setUpRange(page);

    // Drain the magazine away from the target so its health stays put.
    const start = await snapshot(page);
    const p = start.position!;
    await page.evaluate((at) => window.__darkmoonTest!.aimAtPoint(at), { x: p.x + 4, y: p.y, z: p.z });
    let ammo = start.ammo!;
    while (ammo > 0) {
      const next = await fireOnce(page, ammo);
      expect(next).toBe(ammo - 1);
      ammo = next;
    }

    // Now aim at the target, wait out the cooldown and pull again.
    await page.evaluate((id) => window.__darkmoonTest!.aimAt(id), targetId);
    const healthBefore = await targetHealth(page, targetId);
    await page.waitForTimeout(SMG.cooldownMs * 3);
    await page.evaluate(() => window.__darkmoonTest!.fire());
    await page.waitForTimeout(500);

    const after = await snapshot(page);
    expect(after.ammo).toBe(0);
    expect(await targetHealth(page, targetId)).toBe(healthBefore);
    expect(errors, "uncaught application errors").toEqual([]);
  });
});
