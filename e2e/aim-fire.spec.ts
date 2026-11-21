import { test, expect } from "@playwright/test";

type TestSnapshot = {
  position: { x: number; y: number; z: number } | null;
  health: number | null;
  ammo: number | null;
  score: number | null;
  targets: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    health: number | null;
  }>;
};

test.describe("Aim/Fire/Damage E2E", () => {
  const testTimeout = 120000;

  test("hit: aimAt target, fire once, target health drops by weapon damage, ammo drops by 1", async ({ page }, testInfo) => {
    test.setTimeout(testTimeout);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const hasSnapshotProbe = async () =>
      page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return Boolean(probe?.getSnapshot()?.targets?.length);
      });
    await expect.poll(hasSnapshotProbe, { timeout: 15000 }).toBe(true);

    const getSnapshot = async (): Promise<TestSnapshot> => {
      const snap = await page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return probe?.getSnapshot() ?? null;
      });
      if (!snap) throw new Error("Darkmoon test probe has no snapshot");
      return snap;
    };

    // Start deathmatch mode with a bot for combat testing
    // Using gallery debug path from smoke.spec.ts as a fallback if no deterministic spawn exists
    // For deathmatch, we need to start a deathmatch game through the game manager
    // This is done via the probe or through keyboard interactions
    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    // Get initial snapshot to find a target
    let snapshot = await getSnapshot();

    // Find a valid target with health
    let target = snapshot.targets.find(t => t.health !== null && t.health > 0);
    if (!target) {
      // Fallback: use any target
      target = snapshot.targets[0];
    }
    if (!target) throw new Error("No targets found in snapshot");

    // Aim at the target using the probe's aimAt method
    await page.evaluate((targetId) => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            aimAt: (targetId: string) => void;
          };
        }
      ).__darkmoonTest;
      if (!probe?.aimAt) throw new Error("aimAt not available on test probe");
      probe.aimAt(targetId);
    }, target.id);

    // Capture baseline snapshot right before the shot
    const baselineSnapshot = await getSnapshot();
    const baselineAmmo = baselineSnapshot.ammo ?? 0;
    const targetBefore = baselineSnapshot.targets.find(t => t.id === target.id);
    if (!targetBefore) throw new Error("Target not found in baseline snapshot");
    const baselineHealth = targetBefore.health ?? 0;

    // Fire once (click at viewport center = reticle center)
    await page.mouse.click(
      (await canvas.boundingBox())?.width / 2 || 0,
      (await canvas.boundingBox())?.height / 2 || 0
    );

    // Allow time for shot to register
    await page.waitForTimeout(100);

    // Get post-shot snapshot
    const afterSnapshot = await getSnapshot();
    const targetAfter = afterSnapshot.targets.find(t => t.id === target.id);
    if (!targetAfter) throw new Error("Target not found in after snapshot");

    // Attach JSON samples for debugging
    await testInfo.attach("aim-fire-hit.json", {
      body: Buffer.from(
        JSON.stringify({
          scenario: "hit",
          baseline: {
            ammo: baselineAmmo,
            targetHealth: baselineHealth,
          },
          after: {
            ammo: afterSnapshot.ammo,
            targetHealth: targetAfter.health,
          },
          weaponDamage: 60, // shotgun damage from WeaponManager.ts
        }, null, 2),
      ),
      contentType: "application/json",
    });

    // Assertions
    // Ammo should decrease by 1 (shotgun has finite ammo)
    expect(afterSnapshot.ammo).toBe(baselineAmmo - 1);

    // Target health should drop by weapon damage (shotgun = 60)
    expect(targetAfter.health).toBe(baselineHealth - 60);

    expect(pageErrors, "uncaught application errors during hit test").toEqual([]);
  });

  test("miss: aim 90 degrees away, fire, ammo decreases but target health unchanged", async ({ page }, testInfo) => {
    test.setTimeout(testTimeout);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const hasSnapshotProbe = async () =>
      page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return Boolean(probe?.getSnapshot()?.targets?.length);
      });
    await expect.poll(hasSnapshotProbe, { timeout: 15000 }).toBe(true);

    const getSnapshot = async (): Promise<TestSnapshot> => {
      const snap = await page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return probe?.getSnapshot() ?? null;
      });
      if (!snap) throw new Error("Darkmoon test probe has no snapshot");
      return snap;
    };

    // Start gallery debug mode
    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    // Get initial snapshot
    const snapshot = await getSnapshot();

    // Find a valid target
    let target = snapshot.targets.find(t => t.health !== null && t.health > 0);
    if (!target) {
      target = snapshot.targets[0];
    }
    if (!target) throw new Error("No targets found in snapshot");

    // Aim at the target first to get the camera oriented
    await page.evaluate((targetId) => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            aimAt: (targetId: string) => void;
          };
        }
      ).__darkmoonTest;
      if (!probe?.aimAt) throw new Error("aimAt not available on test probe");
      probe.aimAt(targetId);
    }, target.id);

    // Wait for camera to orient
    await page.waitForTimeout(100);

    // Now offset the aim by 90 degrees (simulate rotating camera)
    // We do this by manipulating the camera yaw directly through the probe
    // Since aimAt sets the camera to face the target, we need to add 90 degrees to yaw
    // This is a dev-only operation - in production the camera would be controlled by mouse movement
    await page.evaluate(() => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            _offsetYaw?: (radians: number) => void;
          };
        }
      ).__darkmoonTest;
      // Note: This is a simplified approach. In reality, we'd need to extend the probe
      // with a method to offset the camera yaw. For now, we simulate by re-aiming
      // at a position 90 degrees away.
    });

    // Since we don't have a direct yaw offset method yet, we'll use a workaround:
    // Calculate a position 90 degrees away from the target and aim there
    const baselineSnapshot = await getSnapshot();
    const baselineAmmo = baselineSnapshot.ammo ?? 0;
    const targetBefore = baselineSnapshot.targets.find(t => t.id === target.id);
    if (!targetBefore) throw new Error("Target not found in baseline snapshot");
    const baselineHealth = targetBefore.health ?? 0;
    const playerPos = baselineSnapshot.position;

    if (!playerPos) throw new Error("No player position in snapshot");

    // Calculate position 90 degrees away from target
    const dx = target.position.x - playerPos.x;
    const dz = target.position.z - playerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz) + Math.PI / 2; // 90 degrees offset

    const missTarget = {
      position: {
        x: playerPos.x + distance * Math.sin(angle),
        y: target.position.y,
        z: playerPos.z + distance * Math.cos(angle),
      },
      id: "miss-target",
      health: 100,
    };

    // Aim at the miss position (this is a workaround - ideally we'd have a setCameraOrientation method)
    await page.evaluate((pos) => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            aimAt: (targetId: string) => void;
            _setCameraOrientation?: (yaw: number, pitch: number) => void;
          };
        }
      ).__darkmoonTest;
      if (probe?._setCameraOrientation) {
        // Calculate yaw/pitch to face the miss position
        const snap = probe.getSnapshot();
        if (snap?.position) {
          const [px, py, pz] = [snap.position.x, snap.position.y, snap.position.z];
          const [tx, ty, tz] = [pos.x, pos.y, pos.z];
          const dx = tx - px;
          const dy = ty - py;
          const dz = tz - pz;
          const yaw = Math.atan2(dx, dz);
          const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
          probe._setCameraOrientation(yaw, pitch);
        }
      }
    }, missTarget.position);

    // Fire once
    await page.mouse.click(
      (await canvas.boundingBox())?.width / 2 || 0,
      (await canvas.boundingBox())?.height / 2 || 0
    );

    await page.waitForTimeout(100);

    // Get post-shot snapshot
    const afterSnapshot = await getSnapshot();
    const targetAfter = afterSnapshot.targets.find(t => t.id === target.id);
    if (!targetAfter) throw new Error("Target not found in after snapshot");

    // Attach JSON samples for debugging
    await testInfo.attach("aim-fire-miss.json", {
      body: Buffer.from(
        JSON.stringify({
          scenario: "miss",
          baseline: {
            ammo: baselineAmmo,
            targetHealth: baselineHealth,
          },
          after: {
            ammo: afterSnapshot.ammo,
            targetHealth: targetAfter.health,
          },
        }, null, 2),
      ),
      contentType: "application/json",
    });

    // Assertions
    // Ammo should decrease by 1
    expect(afterSnapshot.ammo).toBe(baselineAmmo - 1);

    // Target health should remain unchanged
    expect(targetAfter.health).toBe(baselineHealth);

    expect(pageErrors, "uncaught application errors during miss test").toEqual([]);
  });

  test("empty magazine: fire until ammo 0, wait cooldown, fire again, no health change", async ({ page }, testInfo) => {
    test.setTimeout(testTimeout);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (error.stack?.includes("/@vite/client")) return;
      pageErrors.push(`${error.message}\n${error.stack ?? ""}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
    });
    await page.goto("/solo");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const hasSnapshotProbe = async () =>
      page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return Boolean(probe?.getSnapshot()?.targets?.length);
      });
    await expect.poll(hasSnapshotProbe, { timeout: 15000 }).toBe(true);

    const getSnapshot = async (): Promise<TestSnapshot> => {
      const snap = await page.evaluate(() => {
        const probe = (
          window as Window & {
            __darkmoonTest?: {
              getSnapshot: () => TestSnapshot;
            };
          }
        ).__darkmoonTest;
        return probe?.getSnapshot() ?? null;
      });
      if (!snap) throw new Error("Darkmoon test probe has no snapshot");
      return snap;
    };

    // Start gallery debug mode
    await page.getByRole("button", { name: /Gallery Debug/ }).click();
    await expect(page.getByText(/🎯 GALLERY/).first()).toBeVisible({ timeout: 10000 });

    // Get initial snapshot
    const snapshot = await getSnapshot();

    // Find a valid target
    let target = snapshot.targets.find(t => t.health !== null && t.health > 0);
    if (!target) {
      target = snapshot.targets[0];
    }
    if (!target) throw new Error("No targets found in snapshot");

    // Aim at the target
    await page.evaluate((targetId) => {
      const probe = (
        window as Window & {
          __darkmoonTest?: {
            aimAt: (targetId: string) => void;
          };
        }
      ).__darkmoonTest;
      if (!probe?.aimAt) throw new Error("aimAt not available on test probe");
      probe.aimAt(targetId);
    }, target.id);

    await page.waitForTimeout(100);

    // Get baseline - we need a finite ammo weapon (shotgun has maxAmmo: 6)
    // Fire until ammo reaches 0
    let currentAmmo = snapshot.ammo ?? 0;
    let shotsFired = 0;
    const maxShots = currentAmmo > 0 ? currentAmmo : 6; // shotgun has 6 maxAmmo

    while (currentAmmo > 0 && shotsFired < maxShots) {
      await page.mouse.click(
        (await canvas.boundingBox())?.width / 2 || 0,
        (await canvas.boundingBox())?.height / 2 || 0
      );
      await page.waitForTimeout(100); // wait for cooldown
      shotsFired++;
      currentAmmo = (await getSnapshot()).ammo ?? 0;
    }

    // Verify ammo is now 0
    const emptySnapshot = await getSnapshot();
    expect(emptySnapshot.ammo).toBe(0);

    // Wait for weapon cooldown (shotgun cooldownMs = 1000)
    await page.waitForTimeout(1100);

    // Get pre-extra-shot snapshot
    const preExtraSnapshot = await getSnapshot();
    const targetBeforeExtra = preExtraSnapshot.targets.find(t => t.id === target.id);
    if (!targetBeforeExtra) throw new Error("Target not found in pre-extra snapshot");
    const healthBeforeExtra = targetBeforeExtra.health ?? 0;

    // Fire again with empty magazine
    await page.mouse.click(
      (await canvas.boundingBox())?.width / 2 || 0,
      (await canvas.boundingBox())?.height / 2 || 0
    );

    await page.waitForTimeout(100);

    // Get post-extra-shot snapshot
    const postExtraSnapshot = await getSnapshot();
    const targetAfterExtra = postExtraSnapshot.targets.find(t => t.id === target.id);
    if (!targetAfterExtra) throw new Error("Target not found in post-extra snapshot");

    // Attach JSON samples for debugging
    await testInfo.attach("aim-fire-empty-magazine.json", {
      body: Buffer.from(
        JSON.stringify({
          scenario: "empty-magazine",
          shotsFired,
          maxShots,
          emptySnapshot: {
            ammo: emptySnapshot.ammo,
          },
          preExtraShot: {
            ammo: preExtraSnapshot.ammo,
            targetHealth: healthBeforeExtra,
          },
          postExtraShot: {
            ammo: postExtraSnapshot.ammo,
            targetHealth: targetAfterExtra.health,
          },
        }, null, 2),
      ),
      contentType: "application/json",
    });

    // Assertions
    // Ammo should remain 0
    expect(postExtraSnapshot.ammo).toBe(0);

    // Target health should remain unchanged (no damage from empty magazine)
    expect(targetAfterExtra.health).toBe(healthBeforeExtra);

    expect(pageErrors, "uncaught application errors during empty magazine test").toEqual([]);
  });
});