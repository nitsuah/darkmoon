import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import * as THREE from "three";
import GrenadeProjectiles from "../GrenadeProjectiles";
import {
  renderR3F,
  inAct,
  advance,
  mockNow,
  type R3FRenderer,
} from "../../../__tests__/r3f.test.utils";

const GRENADE_SLOTS = 5;

const allMeshes = (r: R3FRenderer) =>
  r.scene.children.map((c) => c.instance as THREE.Mesh);
const grenades = (r: R3FRenderer) => allMeshes(r).slice(0, GRENADE_SLOTS);
const particles = (r: R3FRenderer) => allMeshes(r).slice(GRENADE_SLOTS);

const throwGrenade = (detail: Record<string, unknown>) =>
  window.dispatchEvent(new window.CustomEvent("grenade-throw", { detail }));

describe("GrenadeProjectiles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders hidden grenade and particle pools", async () => {
    const renderer = await renderR3F(<GrenadeProjectiles />);
    expect(grenades(renderer)).toHaveLength(5);
    expect(particles(renderer)).toHaveLength(12);
    expect(allMeshes(renderer).every((m) => !m.visible)).toBe(true);
    await renderer.unmount();
  });

  it("launches a grenade from a plain-object origin and moves it along its arc", async () => {
    const clock = mockNow(10_000);
    const renderer = await renderR3F(<GrenadeProjectiles />);

    await inAct(() =>
      throwGrenade({
        origin: { x: 0, y: 2, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
        chargeProgress: 1,
      }),
    );
    const [g] = grenades(renderer);
    expect(g.visible).toBe(true);
    expect(g.position.toArray()).toEqual([0, 2, 0]);

    clock.tick(200);
    await advance(renderer);
    // Travelled forward (-z) and upward along the default 30° arc.
    expect(g.position.z).toBeLessThan(0);
    expect(g.position.y).toBeGreaterThan(2);
    expect(g.visible).toBe(true);
    await renderer.unmount();
  });

  it("detonates on landing: hides the grenade, fires weapon-explosion and animates particles", async () => {
    const clock = mockNow(0);
    const renderer = await renderR3F(<GrenadeProjectiles />);
    const onExplosion = vi.fn();
    window.addEventListener("weapon-explosion", onExplosion);

    await inAct(() =>
      throwGrenade({
        origin: new THREE.Vector3(1, 1, 1),
        direction: new THREE.Vector3(1, 0, 0),
        chargeProgress: 0.5,
        launchAngle: 0,
      }),
    );

    clock.tick(1_000); // flat launch: gravity has pulled it below 0.3
    await advance(renderer);

    const [g] = grenades(renderer);
    expect(g.visible).toBe(false);
    expect(onExplosion).toHaveBeenCalledTimes(1);
    const detail = (onExplosion.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.radius).toBe(7);
    expect(detail.y).toBeCloseTo(0.3);

    const sparks = particles(renderer);
    expect(sparks.every((p) => p.visible)).toBe(true);

    // Particles drift and shrink over subsequent frames...
    await advance(renderer, 1, 0.1);
    expect(sparks[0].scale.x).toBeLessThan(0.2);

    // ...and are hidden once their life (at most 1s) runs out.
    await advance(renderer, 1, 1.5);
    expect(sparks.every((p) => !p.visible)).toBe(true);

    window.removeEventListener("weapon-explosion", onExplosion);
    await renderer.unmount();
  });

  it("times out a grenade that stays airborne for more than five seconds", async () => {
    const clock = mockNow(0);
    const renderer = await renderR3F(<GrenadeProjectiles />);
    const onExplosion = vi.fn();
    window.addEventListener("weapon-explosion", onExplosion);

    // Zero charge from very high up: it cannot land inside 5s.
    await inAct(() =>
      throwGrenade({
        origin: { x: 0, y: 1_000, z: 0 },
        direction: { x: 0, y: 0, z: 1 },
        chargeProgress: 0,
        launchAngle: 0,
      }),
    );
    clock.tick(5_100);
    await advance(renderer);
    expect(onExplosion).toHaveBeenCalledTimes(1);

    window.removeEventListener("weapon-explosion", onExplosion);
    await renderer.unmount();
  });

  it("drops throws once all grenade slots are in flight", async () => {
    mockNow(0);
    const renderer = await renderR3F(<GrenadeProjectiles />);
    await inAct(() => {
      for (let i = 0; i < 6; i++) {
        throwGrenade({
          origin: { x: i + 1, y: 5, z: 0 },
          direction: { x: 0, y: 0, z: 1 },
          chargeProgress: 1,
        });
      }
    });
    expect(grenades(renderer).map((g) => g.position.x)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    await renderer.unmount();
  });
});
