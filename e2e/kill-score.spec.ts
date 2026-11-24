import { test, expect, type Page } from "@playwright/test";
import type { DarkmoonTestProbe } from "../src/lib/testProbe";

declare global {
  interface Window {
    __darkmoonTest?: DarkmoonTestProbe;
  }
}

// Kill and score end to end (#481), built on the same dev-only probe as aim-fire.spec.ts (#497). Uses the dev-only test probe
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

test.describe("kill and score", () => {
  test.setTimeout(240_000);

  test("a lethal burst awards one kill, and a downed target cannot be farmed", async ({ page }) => {
    const errors = trackPageErrors(page);
    const targetId = await setUpRange(page);
    expect(await page.evaluate((id) => window.__darkmoonTest!.aimAt(id), targetId)).toBe(true);

    const before = await snapshot(page);
    const scoreBefore = before.score ?? 0;
    const shotsToKill = Math.ceil(before.targets.find((t) => t.id === targetId)!.health! / SMG.damage);
    expect(shotsToKill).toBeLessThanOrEqual(before.ammo!);

    // Outcome, not timing: keep shooting (one pull per landed shot) until the kill registers.
    let ammo = before.ammo!;
    for (let i = 0; i < shotsToKill; i++) {
      ammo = await fireOnce(page, ammo);
    }

    await expect.poll(async () => (await snapshot(page)).score, SLOW).toBe(scoreBefore + 1);
    expect(await targetHealth(page, targetId)).toBe(0);
    expect(ammo).toBe(before.ammo! - shotsToKill);

    // The downed target sits out a respawn window: more shots neither damage it
    // nor award another kill (one setup, so only one slow software-GL page load).
    for (let i = 0; i < 2; i++) {
      ammo = await fireOnce(page, ammo);
    }
    const after = await snapshot(page);
    expect(after.score).toBe(scoreBefore + 1);
    expect(after.targets.find((t) => t.id === targetId)!.health).toBe(0);
    expect(errors, "uncaught application errors").toEqual([]);
  });
});
