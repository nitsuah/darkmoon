import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import type * as THREE from "three";
import HealthPickups, { HEALTH_PICKUP_DEFS } from "../HealthPickups";
import WeaponPickups, { PICKUP_DEFS } from "../WeaponPickups";
import type { GameState } from "../../GameManager";
import {
  renderR3F,
  advance,
  mockNow,
  type R3FRenderer,
} from "../../../__tests__/r3f.test.utils";

const groups = (r: R3FRenderer) =>
  r.scene.children.map((c) => c.instance as THREE.Group);

const state = (mode: GameState["mode"], isActive = true): GameState =>
  ({ mode, isActive, timeRemaining: 60, scores: {} }) as GameState;

type Pos = [number, number, number];

const cases = [
  {
    name: "HealthPickups",
    Component: HealthPickups,
    defs: HEALTH_PICKUP_DEFS,
    activeModes: ["deathmatch", "ctf"] as const,
    inactiveMode: "tag" as const,
    event: "health-pickup",
    detail: { amount: 25 },
    respawnMs: 12_000,
  },
  {
    name: "WeaponPickups",
    Component: WeaponPickups,
    defs: PICKUP_DEFS,
    activeModes: ["deathmatch", "ctf", "tag"] as const,
    inactiveMode: "shooting_gallery" as const,
    event: "weapon-pickup",
    detail: { weaponId: PICKUP_DEFS[0].weaponId },
    respawnMs: 15_000,
  },
];

describe.each(cases)("$name", (c) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const farAway: Pos = [500, 0, 500];

  it.each(c.activeModes)(
    "shows, spins and bobs pickups in %s mode",
    async (mode) => {
      mockNow(1_000);
      const posRef = { current: farAway };
      const renderer = await renderR3F(
        <c.Component playerPositionRef={posRef} gameState={state(mode)} />,
      );
      const gs = groups(renderer);
      expect(gs).toHaveLength(c.defs.length);
      expect(gs.every((g) => !g.visible)).toBe(true);

      await advance(renderer, 1, 0.5);
      expect(gs.every((g) => g.visible)).toBe(true);
      expect(gs[0].rotation.y).toBeGreaterThan(0);
      expect(gs[0].position.y).not.toBe(c.defs[0].position[1]);
      await renderer.unmount();
    },
  );

  it("hides every pickup when the game is inactive or in an unsupported mode", async () => {
    const posRef = { current: farAway };
    const renderer = await renderR3F(
      <c.Component
        playerPositionRef={posRef}
        gameState={state("deathmatch")}
      />,
    );
    await advance(renderer);
    expect(groups(renderer).every((g) => g.visible)).toBe(true);

    await renderer.update(
      <c.Component
        playerPositionRef={posRef}
        gameState={state(c.inactiveMode)}
      />,
    );
    await advance(renderer);
    expect(groups(renderer).every((g) => !g.visible)).toBe(true);

    await renderer.update(
      <c.Component
        playerPositionRef={posRef}
        gameState={state("deathmatch", false)}
      />,
    );
    await advance(renderer);
    expect(groups(renderer).every((g) => !g.visible)).toBe(true);
    await renderer.unmount();
  });

  it("collects a pickup when the player walks over it, then respawns it", async () => {
    const clock = mockNow(0);
    const def = c.defs[0];
    const posRef = {
      current: [def.position[0] + 0.5, 0, def.position[2]] as Pos,
    };
    const onPickup = vi.fn();
    window.addEventListener(c.event, onPickup);

    const renderer = await renderR3F(
      <c.Component
        playerPositionRef={posRef}
        gameState={state("deathmatch")}
      />,
    );
    await advance(renderer);
    expect(onPickup).toHaveBeenCalledTimes(1);
    expect((onPickup.mock.calls[0][0] as CustomEvent).detail).toEqual(c.detail);

    // Walk away; it stays hidden until the respawn timer elapses.
    posRef.current = farAway;
    await advance(renderer);
    expect(groups(renderer)[0].visible).toBe(false);

    clock.tick(c.respawnMs);
    await advance(renderer);
    expect(groups(renderer)[0].visible).toBe(true);
    expect(onPickup).toHaveBeenCalledTimes(1);

    window.removeEventListener(c.event, onPickup);
    await renderer.unmount();
  });

  it("tolerates a missing player position", async () => {
    const posRef = { current: null as unknown as Pos };
    const renderer = await renderR3F(
      <c.Component playerPositionRef={posRef} gameState={state("ctf")} />,
    );
    await advance(renderer);
    expect(groups(renderer).every((g) => g.visible)).toBe(true);
    await renderer.unmount();
  });
});
