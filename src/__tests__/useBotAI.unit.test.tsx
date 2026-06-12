import { vi } from "vitest";

let frameCallback: ((_state: unknown, delta: number) => void) | null = null;
vi.mock("@react-three/fiber", () => ({
  useFrame: (cb: (_state: unknown, delta: number) => void) => {
    frameCallback = cb;
  },
}));

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { useBotAI } from "../components/characters/useBotAI";
import * as THREE from "three";
import type CollisionSystem from "../components/CollisionSystem";

const makeMesh = () => ({
  current: {
    position: new THREE.Vector3(0, 0, 0),
    rotation: { y: 0 },
    scale: { set: vi.fn() },
  },
});

const fakeCollision: React.RefObject<CollisionSystem> = {
  current: {
    checkCollision: (from: THREE.Vector3, to: THREE.Vector3) => {
      // use both params to avoid unused-var lint complaints
      void from;
      return { x: to.x, y: to.y, z: to.z };
    },
    // minimal mock
    checkPlayerCollision: () => false,
  } as unknown as CollisionSystem,
};

import { render } from "@testing-library/react";

type HarnessProps = {
  targetPositionRef: React.RefObject<[number, number, number]>;
  isPaused: boolean;
  isIt: boolean;
  targetIsIt: boolean;
  onTagTarget: () => void;
  onFireAtTarget?: () => void;
  isDowned?: boolean;
  onPositionUpdate: (position: [number, number, number]) => void;
  gameState: {
    mode: "tag" | "deathmatch" | "none";
    isActive: boolean;
    timeRemaining: number;
    scores: Record<string, number>;
  };
  collisionSystem: React.RefObject<CollisionSystem>;
  gotTaggedTimestamp?: number;
  config: {
    botSpeed: number;
    sprintSpeed: number;
    fleeSpeed: number;
    tagCooldown: number;
    tagDistance: number;
    pauseAfterTag: number;
    sprintDuration: number;
    sprintCooldown: number;
    chaseRadius: number;
    initialPosition: [number, number, number];
    label: string;
  };
  meshRef: React.RefObject<THREE.Group | null>;
};

function mountHook(overrides?: Partial<HarnessProps>) {
  const meshRef = makeMesh();
  const capturedRef = React.createRef<ReturnType<typeof useBotAI> | null>();
  const onTagTarget = vi.fn();
  const onFireAtTarget = vi.fn();
  const onPositionUpdate = vi.fn();

  const baseProps: HarnessProps = {
    targetPositionRef: { current: [1, 0, 0] as [number, number, number] },
    isPaused: false,
    isIt: true,
    targetIsIt: false,
    onTagTarget,
    onFireAtTarget,
    onPositionUpdate,
    gameState: {
      mode: "tag",
      isActive: true,
      timeRemaining: 0,
      scores: {},
    },
    collisionSystem: fakeCollision,
    gotTaggedTimestamp: undefined as number | undefined,
    config: {
      botSpeed: 1,
      sprintSpeed: 2,
      fleeSpeed: 1.5,
      tagCooldown: 1000,
      tagDistance: 0.5,
      pauseAfterTag: 500,
      sprintDuration: 200,
      sprintCooldown: 500,
      chaseRadius: 5,
      initialPosition: [0, 0, 0] as [number, number, number],
      label: "TestBot",
    },
    meshRef: meshRef as unknown as React.RefObject<THREE.Group | null>,
  };

  function HookHarness(props: HarnessProps) {
    const refs = useBotAI(props);
    React.useEffect(() => {
      capturedRef.current = refs;
    }, [refs]);
    return null;
  }

  render(<HookHarness {...baseProps} {...overrides} />);
  return {
    refs: capturedRef.current as ReturnType<typeof useBotAI>,
    meshRef,
    onTagTarget,
    onFireAtTarget,
    onPositionUpdate,
  };
}

const deathmatchState = {
  mode: "deathmatch" as const,
  isActive: true,
  timeRemaining: 120,
  scores: {},
};

describe("useBotAI", () => {
  beforeEach(() => {
    frameCallback = null;
    vi.restoreAllMocks();
  });

  it("returns velocity and sprint refs", () => {
    const { refs } = mountHook();
    expect(refs).toHaveProperty("velocity");
    expect(refs).toHaveProperty("isSprinting");
    expect(Array.isArray(refs.velocity.current)).toBeTruthy();
  });

  it("moves toward target when bot is IT", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(2000);
    void nowSpy;

    const { meshRef, onPositionUpdate } = mountHook();
    expect(frameCallback).toBeTruthy();

    frameCallback!(null, 1);

    expect(meshRef.current.position.x).toBeGreaterThan(0);
    expect(onPositionUpdate).toHaveBeenCalled();
  });

  it("tags target when in range and cooldown elapsed", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);
    void nowSpy;

    const { onTagTarget } = mountHook({
      targetPositionRef: { current: [0.1, 0, 0] },
    });

    frameCallback!(null, 0.016);
    expect(onTagTarget).toHaveBeenCalled();
  });

  it("flees when target is IT and within chase radius", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);
    void nowSpy;

    const { meshRef } = mountHook({
      isIt: false,
      targetIsIt: true,
      targetPositionRef: { current: [1, 0, 0] },
    });

    frameCallback!(null, 1);
    expect(meshRef.current.position.x).toBeLessThan(0);
  });

  it("freezes briefly after getting tagged", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1200);
    void nowSpy;

    const { meshRef } = mountHook({
      gotTaggedTimestamp: 1000,
    });

    frameCallback!(null, 1);
    expect(meshRef.current.scale.set).toHaveBeenCalled();

    const xBefore = meshRef.current.position.x;
    frameCallback!(null, 1);
    expect(meshRef.current.position.x).toBe(xBefore);
  });

  it("retries a tag attempt on a short interval while in range", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(5000);

    const { onTagTarget } = mountHook({
      targetPositionRef: { current: [0.1, 0, 0] },
    });

    frameCallback!(null, 0.016);
    expect(onTagTarget).toHaveBeenCalledTimes(1);

    // Same instant - e.g. GameManager rejected the tag due to a cooldown.
    // The bot shouldn't spam onTagTarget every frame while waiting.
    frameCallback!(null, 0.016);
    expect(onTagTarget).toHaveBeenCalledTimes(1);

    // Once the retry interval (200ms) elapses, the bot tries again.
    nowSpy.mockReturnValue(5201);
    frameCallback!(null, 0.016);
    expect(onTagTarget).toHaveBeenCalledTimes(2);
  });

  it("cycles sprint bursts on and off based on sprintDuration/sprintCooldown", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(0);

    // Keep the target far away so the bot stays in the chase branch
    // (distance > tagDistance) for the whole test.
    const { refs } = mountHook({
      targetPositionRef: { current: [100, 0, 0] },
    });

    // t=0: first sprint burst begins immediately
    frameCallback!(null, 0.016);
    expect(refs.isSprinting.current).toBe(true);

    // t=100: still within sprintDuration (200ms)
    nowSpy.mockReturnValue(100);
    frameCallback!(null, 0.016);
    expect(refs.isSprinting.current).toBe(true);

    // t=250: sprintDuration elapsed, sprintCooldown (500ms) not yet elapsed
    nowSpy.mockReturnValue(250);
    frameCallback!(null, 0.016);
    expect(refs.isSprinting.current).toBe(false);

    // t=699: still cooling down
    nowSpy.mockReturnValue(699);
    frameCallback!(null, 0.016);
    expect(refs.isSprinting.current).toBe(false);

    // t=700: cooldown elapsed, a new sprint burst begins
    nowSpy.mockReturnValue(700);
    frameCallback!(null, 0.016);
    expect(refs.isSprinting.current).toBe(true);
  });

  it("advances toward the target in deathmatch when beyond fire range", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);

    const { meshRef, onFireAtTarget } = mountHook({
      isIt: false,
      targetIsIt: false,
      gameState: deathmatchState,
      targetPositionRef: { current: [20, 0, 0] },
    });

    frameCallback!(null, 1);

    expect(meshRef.current.position.x).toBeGreaterThan(0);
    expect(onFireAtTarget).not.toHaveBeenCalled();
  });

  it("holds position and fires on a retry interval when within fire range", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(5000);

    const { meshRef, onFireAtTarget } = mountHook({
      isIt: false,
      targetIsIt: false,
      gameState: deathmatchState,
      targetPositionRef: { current: [5, 0, 0] }, // within FIRE_RANGE (10)
    });

    frameCallback!(null, 0.016);
    expect(meshRef.current.position.x).toBe(0);
    expect(onFireAtTarget).toHaveBeenCalledTimes(1);

    // Same instant - the bot shouldn't spam fire attempts every frame; the
    // parent's WeaponManager owns the real cooldown.
    frameCallback!(null, 0.016);
    expect(onFireAtTarget).toHaveBeenCalledTimes(1);

    // Once the retry interval (200ms) elapses, the bot tries again.
    nowSpy.mockReturnValue(5201);
    frameCallback!(null, 0.016);
    expect(onFireAtTarget).toHaveBeenCalledTimes(2);
  });

  it("neither moves nor fires while downed in deathmatch", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);

    const { meshRef, onFireAtTarget, onPositionUpdate } = mountHook({
      isIt: false,
      targetIsIt: false,
      isDowned: true,
      gameState: deathmatchState,
      targetPositionRef: { current: [5, 0, 0] },
    });

    frameCallback!(null, 1);

    expect(meshRef.current.position.x).toBe(0);
    expect(onFireAtTarget).not.toHaveBeenCalled();
    expect(onPositionUpdate).not.toHaveBeenCalled();
    // Downed bots pulse in place as a visual cue.
    expect(meshRef.current.scale.set).toHaveBeenCalled();
  });

  it("clamps flee movement to the position returned by collision resolution", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);
    void nowSpy;

    // Simulate a wall blocking all movement - collision resolution returns
    // the bot's current position unchanged instead of the requested newPos.
    const blockingCollision: React.RefObject<CollisionSystem> = {
      current: {
        checkCollision: (from: THREE.Vector3) => ({
          x: from.x,
          y: from.y,
          z: from.z,
        }),
        checkPlayerCollision: () => false,
      } as unknown as CollisionSystem,
    };

    const { meshRef, onPositionUpdate } = mountHook({
      isIt: false,
      targetIsIt: true,
      targetPositionRef: { current: [1, 0, 0] },
      collisionSystem: blockingCollision,
    });

    const before = meshRef.current.position.clone();
    frameCallback!(null, 1);

    // Position is clamped to the collision-resolved value, not the naive
    // flee target, so the bot doesn't clip through the wall.
    expect(meshRef.current.position.x).toBeCloseTo(before.x);
    expect(meshRef.current.position.z).toBeCloseTo(before.z);
    expect(onPositionUpdate).not.toHaveBeenCalled();
  });
});
