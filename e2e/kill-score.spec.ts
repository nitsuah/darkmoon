import { test, expect, type Page } from "@playwright/test";
import type { DarkmoonTestProbe, TestSnapshot } from "../src/lib/testProbe";

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
type Snapshot = TestSnapshot;

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
  // The call returning true is not proof: wait until the snapshot shows the target there.
  await expect
    .poll(async () => {
      const moved = (await snapshot(page)).targets.find((t) => t.id === target.id);
      return moved ? Math.hypot(moved.position.x - p.x, moved.position.z - (p.z - 4)) : Infinity;
    }, SLOW)
    .toBeLessThan(0.5);
  return target.id;
}

test.describe("kill and score", () => {
  test.setTimeout(240_000);

  test("a lethal burst awards the player exactly one kill", async ({ page }) => {
    const errors = trackPageErrors(page);
    const targetId = await setUpRange(page);
    expect(await page.evaluate((id) => window.__darkmoonTest!.aimAt(id), targetId)).toBe(true);

    const before = await snapshot(page);
    const scoreBefore = before.score ?? 0;
    // Precondition: the magazine can kill this bot (aim-fire.spec.ts pins the SMG at 12 damage a hit).
    const targetHp = before.targets.find((t) => t.id === targetId)!.health!;
    expect(targetHp, "target health fits inside one magazine").toBeLessThanOrEqual(SMG.damage * before.ammo!);

    // Outcome, not timing or damage tables: pull the trigger until the score moves
    // or the magazine is empty. The loop runs inside the page: software-GL stalls
    // freeze the page for ~20 s at a time, and one CDP round-trip per shot would
    // multiply those stalls past the test timeout.
    const result = await page.evaluate(
      ({ scoreBefore, budgetMs }) =>
        new Promise<{ score: number | null; ammo: number | null; timedOut: boolean }>((resolve) => {
          const probe = window.__darkmoonTest!;
          const startedAt = performance.now();
          let lastPullAt = -Infinity;
          let ammoAtPull: number | null = null;
          const tick = () => {
            const snap = probe.getSnapshot();
            const killed = (snap.score ?? 0) !== scoreBefore;
            const empty = (snap.ammo ?? 0) <= 0;
            const timedOut = performance.now() - startedAt > budgetMs;
            if (killed || empty || timedOut) {
              resolve({ score: snap.score, ammo: snap.ammo, timedOut });
              return;
            }
            // One pull per landed shot; a pull swallowed by the cooldown is retried.
            const landed = ammoAtPull === null || (snap.ammo ?? 0) < ammoAtPull;
            if (landed || performance.now() - lastPullAt > 500) {
              ammoAtPull = snap.ammo;
              lastPullAt = performance.now();
              probe.fire();
            }
            setTimeout(tick, 25);
          };
          tick();
        }),
      { scoreBefore, budgetMs: 150_000 },
    );

    expect(result.timedOut, "the kill registered within the time budget").toBe(false);
    expect(result.score).toBe(scoreBefore + 1);
    expect(result.ammo, "the kill took at least one and fewer than all rounds").toBeLessThan(before.ammo!);
    expect(result.ammo).toBeGreaterThan(0);
    expect(errors, "uncaught application errors").toEqual([]);
  });
});
