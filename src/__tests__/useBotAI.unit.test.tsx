import { vi } from "vitest";
// Mock R3F hooks so useFrame/useStore calls inside hooks don't error in tests
vi.mock("@react-three/fiber", () => ({
  useFrame: () => undefined,
}));

import React from "react";
import { describe, it, expect } from "vitest";
import { useBotAI } from "../components/characters/useBotAI";
import * as THREE from "three";
import type CollisionSystem from "../components/CollisionSystem";

// Minimal mesh ref mock
const makeMesh = () => ({
  current: {
    position: new THREE.Vector3(0, 0, 0),
    rotation: { y: 0 },
    scale: { set: () => {} },
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

function mountHook() {
  const meshRef = makeMesh();
  // Capture refs returned from the hook using a properly typed ref
  const capturedRef = React.createRef<ReturnType<typeof useBotAI> | null>();

  const TestComp = () => {
    const refs = useBotAI({
      targetPosition: [1, 0, 0],
      isPaused: false,
      isIt: true,
      targetIsIt: false,
      onTagTarget: () => {},
      onPositionUpdate: () => {},
      gameState: { mode: "tag", isActive: true } as unknown as Record<
        string,
        unknown
      >,
      collisionSystem: fakeCollision,
      gotTaggedTimestamp: undefined,
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
        initialPosition: [0, 0, 0],
        label: "TestBot",
      },
      meshRef: meshRef as unknown as React.RefObject<THREE.Group | null>,
    });

    // store refs in a local effect to avoid mutating outer scope during render
    React.useEffect(() => {
      capturedRef.current = refs;
    }, [refs]);

    return null;
  };

  render(<TestComp />);
  return capturedRef.current as ReturnType<typeof useBotAI>;
}

describe("useBotAI smoke", () => {
  it("returns velocity and sprint refs", () => {
    const refs = mountHook();
    expect(refs).toHaveProperty("velocity");
    expect(refs).toHaveProperty("isSprinting");
    expect(Array.isArray(refs.velocity.current)).toBeTruthy();
  });
});
