import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import usePlayerWeapon, { processFiring } from "../usePlayerWeapon";
import type GameManager from "../../../components/GameManager";
import type {
  CollisionSystem,
  ProjectileHit,
} from "../../../components/CollisionSystem";
import { WeaponManager } from "../../../components/combat/WeaponManager";

const sound = {
  playWeaponFireSound: vi.fn(),
  playHitSound: vi.fn(),
};
let soundThrows = false;

vi.mock("../../../components/SoundManager", () => ({
  getSoundManager: () => {
    if (soundThrows) throw new Error("audio unavailable");
    return sound;
  },
}));

const hit = (id: string, distance: number): ProjectileHit =>
  ({ hitPlayerId: id, distance }) as ProjectileHit;

function setup(opts: { isActive?: boolean; hitApplied?: boolean } = {}) {
  const gameManager = {
    getGameState: vi.fn(() => ({ isActive: opts.isActive ?? true })),
    getPlayers: vi.fn(() => new Map()),
    hitPlayer: vi.fn(() => opts.hitApplied ?? true),
  };
  const collisionSystem = {
    checkProjectileHit: vi.fn(() => null as ProjectileHit | null),
  };
  const weaponManager = new WeaponManager();
  const fire = (weaponId: string, now = 1_000) => {
    weaponManager.equip(weaponId);
    return processFiring({
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      shooterId: "me",
      gameManager: gameManager as unknown as GameManager,
      weaponManager,
      collisionSystem: collisionSystem as unknown as CollisionSystem,
      now,
    });
  };
  return { gameManager, collisionSystem, fire };
}

describe("processFiring — shotgun pellets and sound failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    soundThrows = false;
  });

  it("exposes processFiring through the hook", () => {
    expect(usePlayerWeapon().processFiring).toBe(processFiring);
  });

  it("fires one ray per pellet, applies per-pellet damage and reports the closest hit", () => {
    const { gameManager, collisionSystem, fire } = setup();
    collisionSystem.checkProjectileHit
      .mockReturnValueOnce(hit("a", 8))
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(hit("b", 3))
      .mockReturnValueOnce(hit("a", 9));

    const result = fire("shotgun");
    expect(collisionSystem.checkProjectileHit).toHaveBeenCalledTimes(6);
    expect(gameManager.hitPlayer).toHaveBeenCalledTimes(3);
    expect(gameManager.hitPlayer).toHaveBeenCalledWith(
      "me",
      "b",
      10,
      "shotgun",
    );
    expect(result?.hit).toEqual(hit("b", 3));
    expect(sound.playHitSound).toHaveBeenCalledTimes(1);

    // Pellets are spread: not every ray goes straight down -z.
    const dirs = collisionSystem.checkProjectileHit.mock.calls.map(
      (c) => (c as unknown as [THREE.Vector3, THREE.Vector3])[1],
    );
    expect(dirs.some((d) => Math.abs(d.x) > 1e-6 || Math.abs(d.y) > 1e-6)).toBe(
      true,
    );
  });

  it("does not damage or play hit sounds when pellets land outside an active game", () => {
    const { gameManager, collisionSystem, fire } = setup({ isActive: false });
    collisionSystem.checkProjectileHit.mockReturnValue(hit("a", 4));
    const result = fire("shotgun");
    expect(gameManager.hitPlayer).not.toHaveBeenCalled();
    expect(sound.playHitSound).not.toHaveBeenCalled();
    expect(result?.hit).toEqual(hit("a", 4));
  });

  it("does not play a hit sound when the game rejects pellet damage", () => {
    const { collisionSystem, fire } = setup({ hitApplied: false });
    collisionSystem.checkProjectileHit.mockReturnValue(hit("a", 4));
    fire("shotgun");
    expect(sound.playHitSound).not.toHaveBeenCalled();
  });

  it("keeps firing when the sound system throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    soundThrows = true;

    const shotgun = setup();
    shotgun.collisionSystem.checkProjectileHit.mockReturnValue(hit("a", 2));
    expect(shotgun.fire("shotgun")?.weapon.id).toBe("shotgun");

    const laser = setup();
    laser.collisionSystem.checkProjectileHit.mockReturnValue(hit("a", 2));
    expect(laser.fire("laser")?.hit).toEqual(hit("a", 2));
    expect(laser.gameManager.hitPlayer).toHaveBeenCalledWith(
      "me",
      "a",
      10,
      "laser",
    );

    // Fire sound + hit sound failures for each weapon are all reported in dev.
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });
});
