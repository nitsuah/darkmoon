import * as THREE from "three";
import type GameManager from "../../components/GameManager";
import type {
  CollisionSystem,
  ProjectileHit,
} from "../../components/CollisionSystem";
import type {
  WeaponConfig,
  WeaponManager,
} from "../../components/combat/WeaponManager";
import { getSoundManager } from "../../components/SoundManager";

export interface FireParams {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  shooterId: string;
  gameManager: GameManager | null;
  weaponManager: WeaponManager;
  collisionSystem: CollisionSystem;
  now?: number;
}

export interface FireResult {
  weapon: WeaponConfig;
  hit: ProjectileHit | null;
}

/**
 * Attempt to fire the shooter's equipped weapon along `direction` from
 * `origin`. Returns null if no shot was fired (no weapon equipped, or the
 * shooter is still on cooldown). On a hit, applies the weapon's damage to
 * the target's health via GameManager and plays fire/hit SFX.
 */
const _pelletDir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function spreadDirection(
  baseDir: THREE.Vector3,
  spreadAngle: number,
): THREE.Vector3 {
  _right.crossVectors(baseDir, _up).normalize();
  const yaw = (Math.random() - 0.5) * 2 * spreadAngle;
  const pitch = (Math.random() - 0.5) * 2 * spreadAngle * 0.5;
  _pelletDir
    .copy(baseDir)
    .addScaledVector(_right, Math.tan(yaw))
    .addScaledVector(_up, Math.tan(pitch))
    .normalize();
  return _pelletDir;
}

export function processFiring(params: FireParams): FireResult | null {
  const {
    origin,
    direction,
    shooterId,
    gameManager,
    weaponManager,
    collisionSystem,
    now = Date.now(),
  } = params;

  if (!gameManager) return null;

  const weapon = weaponManager.fire(shooterId, now);
  if (!weapon) return null;

  try {
    const soundMgr = getSoundManager();
    if (soundMgr) soundMgr.playWeaponFireSound();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("Failed to play weapon fire sound:", e);
    }
  }

  const gameState = gameManager.getGameState();

  // Cone shotgun: fire multiple pellets, each doing damage/pelletCount
  if (weapon.pelletCount && weapon.pelletCount > 1 && weapon.spreadAngle) {
    // Use floor so total damage never exceeds weapon.damage
    const pelletDamage = Math.floor(weapon.damage / weapon.pelletCount);
    let bestHit: ProjectileHit | null = null;
    let hitLanded = false;

    for (let i = 0; i < weapon.pelletCount; i++) {
      const pelletDir = spreadDirection(direction, weapon.spreadAngle).clone();
      const hit = collisionSystem.checkProjectileHit(
        origin,
        pelletDir,
        weapon.range,
        gameManager.getPlayers(),
        shooterId,
      );
      if (hit) {
        if (!bestHit || hit.distance < bestHit.distance) bestHit = hit;
        if (gameState.isActive) {
          const applied = gameManager.hitPlayer(
            shooterId,
            hit.hitPlayerId,
            pelletDamage,
            weapon.id,
          );
          if (applied) hitLanded = true;
        }
      }
    }

    if (hitLanded) {
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) soundMgr.playHitSound();
      } catch (e) {
        if (import.meta.env.DEV) console.warn("Failed to play hit sound:", e);
      }
    }

    return { weapon, hit: bestHit };
  }

  // Standard single-ray weapon
  const hit = collisionSystem.checkProjectileHit(
    origin,
    direction,
    weapon.range,
    gameManager.getPlayers(),
    shooterId,
  );

  if (hit) {
    let damageApplied = false;
    if (gameState.isActive) {
      damageApplied = gameManager.hitPlayer(
        shooterId,
        hit.hitPlayerId,
        weapon.damage,
        weapon.id,
      );
    }

    if (damageApplied) {
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) soundMgr.playHitSound();
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn("Failed to play hit sound:", e);
        }
      }
    }
  }

  return { weapon, hit };
}

export default function usePlayerWeapon() {
  return { processFiring };
}
