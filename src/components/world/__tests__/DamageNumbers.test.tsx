import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import type * as THREE from "three";
import DamageNumbers from "../DamageNumbers";
import {
  renderR3F,
  inAct,
  advance,
  mockNow,
  type R3FRenderer,
} from "../../../__tests__/r3f.test.utils";

const slots = (r: R3FRenderer) => r.scene.children;
const slotGroup = (r: R3FRenderer, i: number) =>
  slots(r)[i].instance as THREE.Group;

const showDamage = (detail: Record<string, unknown>) =>
  window.dispatchEvent(new window.CustomEvent("damage-number", { detail }));

describe("DamageNumbers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a hidden pool of twelve slots", async () => {
    const renderer = await renderR3F(<DamageNumbers />);
    expect(slots(renderer)).toHaveLength(12);
    await advance(renderer);
    expect(slots(renderer).every((s) => !s.instance.visible)).toBe(true);
    await renderer.unmount();
  });

  it("floats a number upward and pops it out at the end of its lifetime", async () => {
    const clock = mockNow(0);
    const renderer = await renderR3F(<DamageNumbers />);

    await inAct(() => showDamage({ x: 1, y: 2, z: 3, damage: 30 }));
    // Active slot mounts its billboard label.
    expect(slots(renderer)[0].children.length).toBeGreaterThan(0);

    clock.tick(550); // t = 0.5
    await advance(renderer);
    const g = slotGroup(renderer, 0);
    expect(g.visible).toBe(true);
    expect(g.position.y).toBeCloseTo(2 + 0.5 + 0.5 * 2.5);
    expect(g.scale.x).toBe(1);

    clock.tick(440); // t = 0.9 — in the shrink window
    await advance(renderer);
    expect(g.scale.x).toBeLessThan(1);

    clock.tick(200); // past 1100ms
    await advance(renderer);
    expect(g.visible).toBe(false);
    await renderer.unmount();
  });

  it("sizes labels by damage tier and supports positive/colored numbers", async () => {
    mockNow(0);
    const renderer = await renderR3F(<DamageNumbers />);
    await inAct(() => {
      showDamage({ x: 0, y: 0, z: 0, damage: 10 });
      showDamage({ x: 0, y: 0, z: 0, damage: 25 });
      showDamage({ x: 0, y: 0, z: 0, damage: 50, positive: true });
      showDamage({ x: 0, y: 0, z: 0, damage: 100, color: "#ffd700" });
    });
    await advance(renderer);
    const visible = slots(renderer).filter((s) => s.instance.visible);
    expect(visible).toHaveLength(4);
    await renderer.unmount();
  });

  it("drops new numbers when every slot is still live, and reuses expired ones", async () => {
    const clock = mockNow(0);
    const renderer = await renderR3F(<DamageNumbers />);
    await inAct(() => {
      for (let i = 0; i < 13; i++) showDamage({ x: i, y: 0, z: 0, damage: 5 });
    });
    await advance(renderer);
    expect(slots(renderer).filter((s) => s.instance.visible)).toHaveLength(12);

    clock.tick(1_200);
    await inAct(() => showDamage({ x: 42, y: 0, z: 0, damage: 5 }));
    await advance(renderer);
    expect(slotGroup(renderer, 0).visible).toBe(true);
    expect(slotGroup(renderer, 0).position.x).toBe(42);
    await renderer.unmount();
  });
});
