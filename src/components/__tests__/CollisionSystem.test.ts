import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CollisionSystem } from "../CollisionSystem";
import type { Player } from "../GameManager";

const makePlayer = (
  id: string,
  position: [number, number, number],
): Player => ({
  id,
  name: id,
  position,
  rotation: [0, 0, 0],
});

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

  describe("checkProjectileHit", () => {
    it("hits a player directly ahead within range", () => {
      const system = new CollisionSystem();
      const players = new Map([
        ["shooter", makePlayer("shooter", [0, 0, 0])],
        ["target", makePlayer("target", [5, 0, 0])],
      ]);

      const hit = system.checkProjectileHit(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        30,
        players,
        "shooter",
      );

      expect(hit).toEqual({ hitPlayerId: "target", distance: 5 });
    });

    it("misses a player outside the weapon's range", () => {
      const system = new CollisionSystem();
      const players = new Map([
        ["shooter", makePlayer("shooter", [0, 0, 0])],
        ["target", makePlayer("target", [50, 0, 0])],
      ]);

      const hit = system.checkProjectileHit(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        30,
        players,
        "shooter",
      );

      expect(hit).toBeNull();
    });

    it("misses a player off to the side of the ray", () => {
      const system = new CollisionSystem();
      const players = new Map([
        ["shooter", makePlayer("shooter", [0, 0, 0])],
        ["target", makePlayer("target", [5, 0, 5])],
      ]);

      const hit = system.checkProjectileHit(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        30,
        players,
        "shooter",
      );

      expect(hit).toBeNull();
    });

    it("ignores players behind the shooter", () => {
      const system = new CollisionSystem();
      const players = new Map([
        ["shooter", makePlayer("shooter", [0, 0, 0])],
        ["target", makePlayer("target", [-5, 0, 0])],
      ]);

      const hit = system.checkProjectileHit(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        30,
        players,
        "shooter",
      );

      expect(hit).toBeNull();
    });

    it("excludes the shooter and returns the closest of multiple hits", () => {
      const system = new CollisionSystem();
      const players = new Map([
        ["shooter", makePlayer("shooter", [0, 0, 0])],
        ["near", makePlayer("near", [3, 0, 0])],
        ["far", makePlayer("far", [10, 0, 0])],
      ]);

      const hit = system.checkProjectileHit(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        30,
        players,
        "shooter",
      );

      expect(hit).toEqual({ hitPlayerId: "near", distance: 3 });
    });
  });
});
