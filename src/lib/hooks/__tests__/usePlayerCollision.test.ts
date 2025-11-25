import {
  resolveMovement,
  detectPlayerCollision,
  CollisionSystem,
} from "../usePlayerCollision";
import * as THREE from "three";
import { describe, test, expect } from "vitest";

describe("usePlayerCollision helpers", () => {
  test("resolveMovement delegates to collision system and returns resolved position", () => {
    const collisionSystem: CollisionSystem = {
      checkCollision: (current: THREE.Vector3, next: THREE.Vector3) => {
        // simple clamp: disallow movement beyond x>1
        const resolved = next.clone();
        if (resolved.x > 1) resolved.x = 1;
        return resolved;
      },
      checkPlayerCollision: (_a: THREE.Vector3, _b: THREE.Vector3) => {
        void _a;
        void _b;
        return false;
      },
    };

    const current = new THREE.Vector3(0, 0, 0);
    const desired = new THREE.Vector3(2, 0, 0);
    const resolved = resolveMovement(collisionSystem, current, desired);
    expect(resolved.x).toBe(1);
  });

  test("detectPlayerCollision forwards to collision system", () => {
    const collisionSystem: CollisionSystem = {
      checkCollision: (_current: THREE.Vector3, _next: THREE.Vector3) => {
        void _current;
        void _next;
        return new THREE.Vector3();
      },
      checkPlayerCollision: (a: THREE.Vector3, b: THREE.Vector3) =>
        a.distanceTo(b) < 1,
    };

    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(0.5, 0, 0);
    expect(detectPlayerCollision(collisionSystem, a, b)).toBe(true);
  });
});
