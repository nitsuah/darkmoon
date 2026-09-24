import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGalleryBot } from "../useGalleryBot";
import type { TargetState } from "../ShootingGallery";
import type { GalleryBotConfig } from "../GalleryBotConfig";
import {
  renderR3F,
  inAct,
  advance,
  mockNow,
  type MockClock,
  type R3FRenderer,
} from "../../../../__tests__/r3f.test.utils";

type Phase = TargetState["phase"];

function target(
  id: string,
  x: number,
  z: number,
  points: 10 | 25 | 50 | 100,
  phase: Phase = "up",
): TargetState {
  return {
    def: {
      id,
      row: 0,
      col: 0,
      x,
      z,
      counterY: 1.6,
      targetH: 0.5,
      targetW: 0.3,
      points,
      color: "#fff",
    },
    phase,
    y: 2,
    yDown: 1,
    yUp: 2,
    phaseStartTime: 0,
    upDuration: 2500,
  };
}

const baseConfig: GalleryBotConfig = {
  name: "Test Bot",
  reactionMs: 0,
  shotIntervalMs: 100,
  aimJitterRad: 0,
  missChance: 0,
  targetStrategy: "random",
  hesitate: false,
};

function Harness(props: {
  targets: TargetState[];
  isActive?: boolean;
  enabled?: boolean;
  config: GalleryBotConfig;
}) {
  // Tests mutate the target objects in place, so the initial array suffices.
  const ref = React.useRef(props.targets);
  useGalleryBot(
    ref,
    props.isActive ?? true,
    props.enabled ?? true,
    props.config,
  );
  return null;
}

type Shot = {
  originX: number;
  originY: number;
  originZ: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  range: number;
};

describe("useGalleryBot", () => {
  let clock: MockClock;
  let shots: Shot[];
  const onFire = (e: Event) => shots.push((e as CustomEvent<Shot>).detail);
  let renderer: R3FRenderer | null = null;

  beforeEach(() => {
    clock = mockNow(50_000);
    shots = [];
    window.addEventListener("gallery-fire", onFire);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    window.removeEventListener("gallery-fire", onFire);
    if (renderer) await renderer.unmount();
    renderer = null;
    vi.restoreAllMocks();
  });

  /** Aim direction the bot used for the most recent shot, as the target it points at. */
  const lastAimX = () => {
    const s = shots[shots.length - 1];
    // Project the ray to the target plane (z = -10 in these tests).
    const t = (-10 - s.originZ) / s.dirZ;
    return s.originX + s.dirX * t;
  };

  it("does nothing when disabled or when the gallery is inactive", async () => {
    const targets = [target("a", 0, -10, 10)];
    renderer = await renderR3F(
      <Harness targets={targets} enabled={false} config={baseConfig} />,
    );
    await advance(renderer, 3);
    await renderer.update(
      <Harness targets={targets} isActive={false} config={baseConfig} />,
    );
    await advance(renderer, 3);
    expect(shots).toHaveLength(0);
  });

  it("aims perfectly at a ready target from the camera and respects the fire-rate cap", async () => {
    const targets = [target("a", 3, -10, 10)];
    renderer = await renderR3F(
      <Harness targets={targets} config={baseConfig} />,
    );
    await advance(renderer);
    expect(shots).toHaveLength(1);
    expect(shots[0].range).toBe(80);
    expect(shots[0].originZ).toBe(5); // default R3F camera position
    expect(lastAimX()).toBeCloseTo(3);

    // Still within shotIntervalMs: no second shot.
    await advance(renderer);
    expect(shots).toHaveLength(1);

    clock.tick(150);
    await advance(renderer);
    expect(shots).toHaveLength(2);
  });

  it("waits for its reaction time before shooting a newly visible target", async () => {
    const targets = [target("a", 0, -10, 10, "down")];
    renderer = await renderR3F(
      <Harness targets={targets} config={{ ...baseConfig, reactionMs: 300 }} />,
    );
    await advance(renderer);
    targets[0].phase = "rising";
    await advance(renderer); // first seen now
    expect(shots).toHaveLength(0);
    clock.tick(350);
    await advance(renderer);
    expect(shots).toHaveLength(1);

    // Hidden targets are forgotten and ignored.
    targets[0].phase = "falling";
    clock.tick(500);
    await advance(renderer);
    expect(shots).toHaveLength(1);
  });

  it.each([
    ["highest_value", 6],
    ["nearest", 0],
    ["front_first", -3],
  ] as const)(
    "picks targets using the %s strategy",
    async (strategy, expectedX) => {
      const targets = [
        target("far-high", 6, -20, 50),
        target("near", 0, -8, 10),
        target("front", -3, -5, 25),
      ];
      // "nearest" is measured in XZ from the camera at (0, 0, 5); push "front"
      // far off to the side so "near" is the unambiguous closest target.
      if (strategy === "nearest") targets[2].def.x = -40;
      renderer = await renderR3F(
        <Harness
          targets={targets}
          config={{ ...baseConfig, targetStrategy: strategy }}
        />,
      );
      await advance(renderer);
      expect(shots).toHaveLength(1);
      const s = shots[0];
      const chosen = targets.find(
        (t) =>
          Math.abs(
            s.originX + s.dirX * ((t.def.z - s.originZ) / s.dirZ) - t.def.x,
          ) < 1e-6,
      );
      expect(chosen?.def.x).toBe(expectedX);
    },
  );

  it("occasionally hesitates instead of shooting", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // < 0.15 → hesitate
    const targets = [target("a", 0, -10, 10)];
    renderer = await renderR3F(
      <Harness targets={targets} config={{ ...baseConfig, hesitate: true }} />,
    );
    await advance(renderer, 3);
    expect(shots).toHaveLength(0);
  });

  it("deflects its aim when the miss chance fires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const targets = [target("a", 0, -10, 10)];
    renderer = await renderR3F(
      <Harness targets={targets} config={{ ...baseConfig, missChance: 0.5 }} />,
    );
    await advance(renderer);
    expect(shots).toHaveLength(1);
    expect(Math.abs(lastAimX())).toBeGreaterThan(0.1);
    expect(
      vi
        .mocked(console.log)
        .mock.calls.some((c) => c.includes("[forcing miss]")),
    ).toBe(true);
  });

  // Every random draw below 0.5 fires the 50% miss chance. Low draws used to
  // shrink the deflection to almost nothing and let the "miss" hit.
  it.each([0.01, 0.4, 0.49])(
    "clears the target hitbox on a forced miss (random = %s)",
    async (r) => {
      vi.spyOn(Math, "random").mockReturnValue(r);
      const targets = [target("a", 0, -10, 10)];
      renderer = await renderR3F(
        <Harness
          targets={targets}
          config={{ ...baseConfig, missChance: 0.5 }}
        />,
      );
      await advance(renderer);
      expect(Math.abs(lastAimX())).toBeGreaterThan(targets[0].def.targetW);
    },
  );

  it("applies random aim jitter when configured", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const targets = [target("a", 0, -10, 10)];
    renderer = await renderR3F(
      <Harness
        targets={targets}
        config={{ ...baseConfig, aimJitterRad: 0.2 }}
      />,
    );
    await advance(renderer);
    expect(shots).toHaveLength(1);
    expect(lastAimX()).not.toBeCloseTo(0);
  });

  it("logs hit and miss diagnostics from correlated gallery-combo events", async () => {
    const log = vi.mocked(console.log);
    const targets = [target("a", 0, -10, 10)];
    renderer = await renderR3F(
      <Harness targets={targets} config={baseConfig} />,
    );

    const combo = (pts: number) =>
      inAct(() =>
        window.dispatchEvent(
          new window.CustomEvent("gallery-combo", {
            detail: { combo: 1, multiplier: 2, pts },
          }),
        ),
      );

    await combo(10); // no shot yet → ignored
    await advance(renderer);
    await combo(20);
    expect(log.mock.calls.some((c) => String(c[2]).includes("HIT"))).toBe(true);

    clock.tick(150);
    await advance(renderer);
    await combo(0);
    expect(log.mock.calls.some((c) => String(c[2]).includes("MISS"))).toBe(
      true,
    );

    // Stale correlation (>300ms after the shot) is ignored.
    clock.tick(150);
    await advance(renderer);
    const before = log.mock.calls.length;
    clock.tick(400);
    await combo(10);
    expect(log.mock.calls.length).toBe(before);
  });
});
