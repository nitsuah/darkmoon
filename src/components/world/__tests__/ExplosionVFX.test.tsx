import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import type * as THREE from "three";
import ExplosionVFX from "../ExplosionVFX";
import {
  renderR3F,
  inAct,
  advance,
  mockNow,
  type R3FRenderer,
} from "../../../__tests__/r3f.test.utils";

const meshes = (r: R3FRenderer) =>
  r.scene.children.map((c) => c.instance as THREE.Mesh);

const explode = (detail: { x: number; y: number; z: number; radius: number }) =>
  window.dispatchEvent(new window.CustomEvent("weapon-explosion", { detail }));

describe("ExplosionVFX", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a hidden pool of explosion spheres", async () => {
    const renderer = await renderR3F(<ExplosionVFX />);
    const pool = meshes(renderer);
    expect(pool).toHaveLength(4);
    expect(pool.every((m) => !m.visible)).toBe(true);
    await renderer.unmount();
  });

  it("shows, grows and fades an explosion, then hides it after its lifetime", async () => {
    const clock = mockNow(1_000);
    const renderer = await renderR3F(<ExplosionVFX />);

    await inAct(() => explode({ x: 1, y: 2, z: 3, radius: 4 }));
    const [first] = meshes(renderer);
    expect(first.visible).toBe(true);
    expect(first.position.toArray()).toEqual([1, 2, 3]);

    clock.tick(225); // halfway through the 450ms lifetime
    await advance(renderer);
    expect(first.scale.x).toBeCloseTo(4 * (0.15 + 0.5 * 0.85));
    expect((first.material as THREE.MeshBasicMaterial).opacity).toBeCloseTo(
      0.425,
    );

    clock.tick(300);
    await advance(renderer);
    expect(first.visible).toBe(false);
    await renderer.unmount();
  });

  it("ignores new explosions once every slot is busy", async () => {
    mockNow(5_000);
    const renderer = await renderR3F(<ExplosionVFX />);
    await inAct(() => {
      for (let i = 0; i < 5; i++) explode({ x: i + 1, y: 0, z: 0, radius: 1 });
    });
    expect(meshes(renderer).map((m) => m.position.x)).toEqual([1, 2, 3, 4]);
    await renderer.unmount();
  });

  it("recycles a slot whose explosion has expired", async () => {
    const clock = mockNow(0);
    const renderer = await renderR3F(<ExplosionVFX />);
    await inAct(() => {
      for (let i = 0; i < 4; i++) explode({ x: i + 1, y: 0, z: 0, radius: 1 });
    });
    clock.tick(500);
    await inAct(() => explode({ x: 99, y: 0, z: 0, radius: 1 }));
    expect(meshes(renderer)[0].position.x).toBe(99);
    await renderer.unmount();
  });
});
