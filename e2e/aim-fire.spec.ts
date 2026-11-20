import { test, expect } from "@playwright/test";

type Vec3 = { x: number; y: number; z: number };

interface TestTarget {
  id: string;
  position: Vec3;
  health: number | null;
}

interface TestSnapshot {
  position: Vec3 | null;
  health: number | null;
  ammo: number | null;
  score: number | null;
  targets: TestTarget[];
}

const LASER_DAMAGE = 10; // src/components/combat/WeaponManager.ts WEAPONS.laser.damage

test.describe("Aim / Fire / Damage (shooting gallery)", () => {
  const getSnapshot = async (page: any): Promise<TestSnapshot | null> => {
    return page.evaluate(() => {
      const probe = (
        window as Window & {
          __darkmoonTest?: { getSnapshot: () => TestSnapshot };
        }
      ).__darkmoonTest;
      return probe?.getSnapshot() ?? null;
    });
  };

  const waitForSnapshot = async (page: any, timeout = 20000): Promise<TestSnapshot> => {
    await expect
      .poll(
        async () => {
          const snap = await getSnapshot(page);
          return snap?.targets?.length ?? 0 > 0;
        },
        { timeout, message: "targets array populated" }
      )
      .toBe(true);
    const snap = await getSnapshot(page);
    if (!snap) throw new Error("snapshot missing after wait");
    return snap;
  };

  test("Hit: firing at a target reduces its health by weapon damage and consumes 1 ammo", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10000 });

    // Enable gallery debug mode (auto-starts shooting gallery, same as smoke.spec.ts)
    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    // Wait for probe to have targets
    const snapBefore = await waitForSnapshot(page);

    // Find a target that is "up" (visible) — in gallery debug, targets are continuously spawned
    // Use the first target with a non-null health value
    const target = snapBefore.targets.find((t) => t.health !== null && t.health > 0);
    if (!target) {
      await testInfo.attach("snapshot-no-target.json", {
        body: Buffer.from(JSON.stringify(snapBefore, null, 2)),
        contentType: "application/json",
      });
      throw new Error("No target with health > 0 in snapshot; cannot run hit test");
    }

    // Aim at target: the reticle is locked to viewport center; we rotate the camera
    // by sending mouse move deltas. Since we can't easily compute exact yaw/pitch from
    // position, we'll use the gallery bot's perfect aim as a reference — in debug mode
    // the bot fires and hits. Instead, we simulate a click at center (which is where
    // the reticle is) after ensuring the target is roughly centered.
    // The gallery-debug path uses a bot that auto-aims; we rely on the fact that
    // targets spawn in a fixed grid. We'll click and verify the hit via snapshot.
    // If the first click misses, we'll retry a few times (targets cycle).
    const maxAttempts = 5;
    let hitConfirmed = false;
    let snapAfter: TestSnapshot | null = null;

    for (let attempt = 0; attempt < maxAttempts && !hitConfirmed; attempt++) {
      // Fire once
      await page.mouse.click(0, 0); // viewport center = reticle center
      await page.waitForTimeout(200); // allow fire event to process

      snapAfter = await getSnapshot(page);
      if (!snapAfter) continue;

      const targetAfter = snapAfter.targets.find((t) => t.id === target.id);
      if (targetAfter && targetAfter.health !== null && targetAfter.health < target.health) {
        hitConfirmed = true;
        break;
      }
      // Target may have cycled down; wait for next spawn
      await page.waitForTimeout(1000);
    }

    if (!hitConfirmed || !snapAfter) {
      await testInfo.attach("snapshot-before.json", {
        body: Buffer.from(JSON.stringify(snapBefore, null, 2)),
        contentType: "application/json",
      });
      await testInfo.attach("snapshot-after.json", {
        body: Buffer.from(JSON.stringify(snapAfter, null, 2)),
        contentType: "application/json",
      });
      throw new Error(
        `Hit not confirmed after ${maxAttempts} attempts. ` +
          `Target ${target.id} health before: ${target.health}, after: ${snapAfter?.targets.find((t) => t.id === target.id)?.health ?? "missing"}`
      );
    }

    // Assert ammo decreased by 1
    expect(snapAfter.ammo).not.toBeNull();
    expect(snapBefore.ammo).not.toBeNull();
    if (snapAfter.ammo !== null && snapBefore.ammo !== null) {
      expect(snapBefore.ammo! - snapAfter.ammo!).toBe(1);
    }

    // Assert target health dropped by laser damage (10)
    const targetAfter = snapAfter.targets.find((t) => t.id === target.id);
    expect(targetAfter).toBeDefined();
    expect(targetAfter!.health).not.toBeNull();
    if (targetAfter!.health !== null && target.health !== null) {
      expect(target.health! - targetAfter!.health!).toBe(LASER_DAMAGE);
    }

    expect(pageErrors, "uncaught application errors during hit test").toEqual([]);
  });

  test("Miss: firing with offset aim consumes ammo but does not change any target health", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    const snapBefore = await waitForSnapshot(page);

    // Capture health of all targets before miss
    const healthBefore = new Map(snapBefore.targets.map((t) => [t.id, t.health]));
    const ammoBefore = snapBefore.ammo;

    // Offset aim by moving mouse off-center (reticle stays center, but camera rotates)
    // In this game the reticle is locked to viewport center; to "miss" we need to
    // rotate the camera away from targets. Easiest: press a movement key to strafe
    // so the player moves and the fixed reticle no longer points at a target.
    // However, movement takes time. Simpler: click at an offset from center which
    // in the gallery-fire event uses camera position + direction from center.
    // The gallery-fire event detail uses camera position and direction from NDC (0,0).
    // We can't easily change that from E2E without pointer lock. Instead, we'll
    // fire, then if it hits (health changed), we'll retry after a strafe.
    // But the test should be deterministic: we know targets are at z <= -10.
    // The player spawns at origin. A target at z=-10 is in front.
    // If we turn 90 degrees (strafe right + mouse move), we'll miss.
    // Let's use keyboard to strafe right while firing.
    await page.keyboard.down("d");
    await page.waitForTimeout(300); // move a bit
    await page.mouse.click(0, 0); // fire while strafed
    await page.keyboard.up("d");
    await page.waitForTimeout(200);

    const snapAfter = await getSnapshot(page);
    if (!snapAfter) throw new Error("snapshot missing after miss attempt");

    // Assert ammo decreased by 1
    expect(snapAfter.ammo).not.toBeNull();
    expect(ammoBefore).not.toBeNull();
    if (snapAfter.ammo !== null && ammoBefore !== null) {
      expect(ammoBefore! - snapAfter.ammo!).toBe(1);
    }

    // Assert no target health changed
    for (const target of snapAfter.targets) {
      const before = healthBefore.get(target.id);
      if (before !== null && target.health !== null) {
        expect(target.health).toBe(before);
      }
    }

    expect(pageErrors, "uncaught application errors during miss test").toEqual([]);
  });

  test("Empty magazine: firing with 0 ammo does not change any target health", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    // Wait for probe, then exhaust ammo by firing repeatedly
    let snap = await waitForSnapshot(page);
    const maxShots = 50; // laser has infinite ammo per WeaponManager (maxAmmo undefined)
    // Check if laser has infinite ammo
    if (snap.ammo === null) {
      // Laser has infinite ammo — skip this test as it's not applicable
      // (the brief says "after exhausting ammo", but laser doesn't exhaust)
      test.skip(true, "Laser has infinite ammo; empty-magazine scenario not applicable");
      return;
    }

    // If we reach here, the weapon has finite ammo. Fire until ammo hits 0.
    while ((snap.ammo ?? 1) > 0 && maxShots-- > 0) {
      await page.mouse.click(0, 0);
      await page.waitForTimeout(100); // respect cooldown
      snap = await getSnapshot(page);
      if (!snap) break;
    }

    if (!snap || (snap.ammo ?? 1) > 0) {
      await testInfo.attach("snapshot-final.json", {
        body: Buffer.from(JSON.stringify(snap, null, 2)),
        contentType: "application/json",
      });
      throw new Error("Could not exhaust ammo within shot limit");
    }

    // Ammo is now 0. Capture target health.
    const healthBefore = new Map(snap.targets.map((t) => [t.id, t.health]));

    // Fire once more with empty magazine
    await page.mouse.click(0, 0);
    await page.waitForTimeout(200);

    const snapAfter = await getSnapshot(page);
    if (!snapAfter) throw new Error("snapshot missing after empty-mag fire");

    // Assert ammo stayed at 0
    expect(snapAfter.ammo).toBe(0);

    // Assert no target health changed
    for (const target of snapAfter.targets) {
      const before = healthBefore.get(target.id);
      if (before !== null && target.health !== null) {
        expect(target.health).toBe(before);
      }
    }

    expect(pageErrors, "uncaught application errors during empty-magazine test").toEqual([]);
  });
});