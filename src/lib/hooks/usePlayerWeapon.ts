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

const DEFAULT_MAX_HEALTH = 100;

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

  const hit = collisionSystem.checkProjectileHit(
    origin,
    direction,
    weapon.range,
    gameManager.getPlayers(),
    shooterId,
  );

  try {
    const soundMgr = getSoundManager();
    if (soundMgr) soundMgr.playWeaponFireSound();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("Failed to play weapon fire sound:", e);
    }
  }

  if (hit) {
    const gameState = gameManager.getGameState();
    let damageApplied = false;

    if (
      (gameState.mode === "deathmatch" || gameState.mode === "ctf") &&
      gameState.isActive
    ) {
      // Deathmatch/CTF: the active mode applies damage and starts respawn
      // timers (and, in CTF, drops any carried flag). Rejected hits (e.g. a
      // downed target) deal no damage.
      damageApplied = gameManager.hitPlayer(
        shooterId,
        hit.hitPlayerId,
        weapon.damage,
      );
    } else {
      const target = gameManager.getPlayers().get(hit.hitPlayerId);
      if (target) {
        const maxHealth = target.maxHealth ?? DEFAULT_MAX_HEALTH;
        const currentHealth = target.health ?? maxHealth;
        gameManager.updatePlayer(hit.hitPlayerId, {
          maxHealth,
          health: Math.max(0, currentHealth - weapon.damage),
        });
        damageApplied = true;
      }
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
