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
  onPositionUpdate: (position: [number, number, number]) => void;
  gameState: {
    mode: "tag" | "none";
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
  const onPositionUpdate = vi.fn();

  const baseProps = {
    targetPositionRef: { current: [1, 0, 0] as [number, number, number] },
    isPaused: false,
    isIt: true,
    targetIsIt: false,
    onTagTarget,
    onPositionUpdate,
    gameState: { mode: "tag", isActive: true, timeRemaining: 0, scores: {} },
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
    onPositionUpdate,
  };
}

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
});
