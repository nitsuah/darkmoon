import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CollisionSystem } from "../CollisionSystem";

describe("CollisionSystem", () => {
  it("allows movement when no boundaries are hit", () => {
    const system = new CollisionSystem();
    const current = new THREE.Vector3(0, 0, 0);
    const next = new THREE.Vector3(1, 0, 1);

    const resolved = system.checkCollision(current, next);
    expect(resolved.x).toBe(1);
    expect(resolved.z).toBe(1);
  });

  it("blocks movement into world boundary", () => {
    const system = new CollisionSystem();
    const current = new THREE.Vector3(49, 0, 0);
    const next = new THREE.Vector3(50.5, 0, 0);

    const resolved = system.checkCollision(current, next);
    expect(resolved.x).toBe(49);
  });

  it("allows movement over an obstacle when player is above it", () => {
    const system = new CollisionSystem();
    const current = new THREE.Vector3(4, 3.5, 4);
    const next = new THREE.Vector3(5, 3.5, 5);

    const resolved = system.checkCollision(current, next);
    expect(resolved.x).toBe(5);
    expect(resolved.z).toBe(5);
  });

  it("checks player collision distance", () => {
    const system = new CollisionSystem();

    expect(
      system.checkPlayerCollision(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 0, 0.2),
      ),
    ).toBe(true);

    expect(
      system.checkPlayerCollision(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 10),
      ),
    ).toBe(false);
  });

  it("provides boundary geometries for debugging", () => {
    const system = new CollisionSystem();
    const geometries = system.getBoundaryGeometry();

    expect(geometries.length).toBeGreaterThan(0);
    expect(geometries[0].type).toBe("BoxGeometry");
  });
});
