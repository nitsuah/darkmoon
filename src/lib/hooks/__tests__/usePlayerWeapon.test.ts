import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { processFiring } from "../usePlayerWeapon";
import GameManager from "../../../components/GameManager";
import { CollisionSystem } from "../../../components/CollisionSystem";
import { WeaponManager } from "../../../components/combat/WeaponManager";

const playWeaponFireSound = vi.fn();
const playHitSound = vi.fn();

vi.mock("../../../components/SoundManager", () => ({
  getSoundManager: () => ({
    playWeaponFireSound,
    playHitSound,
  }),
}));

describe("usePlayerWeapon.processFiring", () => {
  let gameManager: GameManager;
  let collisionSystem: CollisionSystem;
  let weaponManager: WeaponManager;
  const origin = new THREE.Vector3(0, 0, 0);
  const direction = new THREE.Vector3(0, 0, -1);

  beforeEach(() => {
    vi.clearAllMocks();
    gameManager = new GameManager();
    collisionSystem = new CollisionSystem();
    weaponManager = new WeaponManager();

    gameManager.addPlayer({
      id: "shooter",
      name: "Shooter",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    });
    gameManager.addPlayer({
      id: "target",
      name: "Target",
      position: [0, 0, -5],
      rotation: [0, 0, 0],
    });
  });

  it("returns null when gameManager is null", () => {
    weaponManager.equip("laser");

    const result = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager: null,
      weaponManager,
      collisionSystem,
    });

    expect(result).toBeNull();
  });

  it("returns null when no weapon is equipped", () => {
    const result = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
    });

    expect(result).toBeNull();
    expect(playWeaponFireSound).not.toHaveBeenCalled();
  });

  it("fires and reports a miss when nothing is in range", () => {
    weaponManager.equip("laser");

    const result = processFiring({
      origin,
      direction: new THREE.Vector3(1, 0, 0), // points away from "target"
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1000,
    });

    expect(result?.hit).toBeNull();
    expect(playWeaponFireSound).toHaveBeenCalled();
    expect(playHitSound).not.toHaveBeenCalled();
    expect(gameManager.getPlayers().get("target")?.health).toBeUndefined();
  });

  it("fires, hits a target, and applies damage", () => {
    weaponManager.equip("laser");

    const result = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1000,
    });

    expect(result?.hit?.hitPlayerId).toBe("target");
    expect(playWeaponFireSound).toHaveBeenCalled();
    expect(playHitSound).toHaveBeenCalled();

    const target = gameManager.getPlayers().get("target");
    expect(target?.maxHealth).toBe(100);
    expect(target?.health).toBe(90);
  });

  it("clamps health at 0 instead of going negative", () => {
    weaponManager.equip("laser");
    gameManager.updatePlayer("target", { health: 5, maxHealth: 100 });

    const result = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1000,
    });

    expect(result?.hit?.hitPlayerId).toBe("target");
    expect(gameManager.getPlayers().get("target")?.health).toBe(0);
  });

  it("enforces the weapon cooldown across repeated calls", () => {
    weaponManager.equip("laser");

    const first = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1000,
    });
    expect(first).not.toBeNull();

    // Still within the laser's 500ms cooldown - no shot fired.
    const second = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1200,
    });
    expect(second).toBeNull();

    // Cooldown has elapsed - shot fires again.
    const third = processFiring({
      origin,
      direction,
      shooterId: "shooter",
      gameManager,
      weaponManager,
      collisionSystem,
      now: 1600,
    });
    expect(third).not.toBeNull();
  });
});
