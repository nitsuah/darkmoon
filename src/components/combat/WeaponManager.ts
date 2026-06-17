export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  /** Maximum effective range in world units. */
  range: number;
  cooldownMs: number;
  /** Maximum ammo capacity. undefined/null means infinite. */
  maxAmmo?: number;
  /** Area-of-effect radius (world units). Nearby entities within this range of the impact point take splashDamage. */
  splashRadius?: number;
  /** Damage dealt to entities caught in the splash radius (not the direct-hit target). */
  splashDamage?: number;
}

export const WEAPONS: Record<string, WeaponConfig> = {
  laser: {
    id: "laser",
    name: "Laser Blaster",
    damage: 10,
    range: 30,
    cooldownMs: 500,
  },
  shotgun: {
    id: "shotgun",
    name: "Pulse Shotgun",
    damage: 25,
    range: 8,
    cooldownMs: 1000,
    maxAmmo: 6,
  },
  rocket: {
    id: "rocket",
    name: "Rocket Launcher",
    damage: 100,
    range: 12,
    cooldownMs: 2000,
    maxAmmo: 3,
    splashRadius: 5,
    splashDamage: 50,
  },
  grenade: {
    id: "grenade",
    name: "Frag Grenade",
    damage: 100,
    range: 18,
    cooldownMs: 4000,
    maxAmmo: 2,
    splashRadius: 7,
    splashDamage: 75,
  },
  smg: {
    id: "smg",
    name: "SMG",
    damage: 12,
    range: 18,
    cooldownMs: 120,
    maxAmmo: 40,
  },
};

/**
 * Tracks the equipped weapon, per-shooter fire cooldowns, and per-weapon ammo.
 * Pure data/logic — scene mutation stays in the React layer.
 */
export class WeaponManager {
  private equippedWeaponId: string | null = null;
  private lastFiredAt: Map<string, number> = new Map();
  private ammoMap: Map<string, number> = new Map();

  equip(weaponId: string): boolean {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return false;
    this.equippedWeaponId = weaponId;
    // Initialize ammo only if not yet tracked (preserve ammo across weapon switches).
    if (weapon.maxAmmo !== undefined && !this.ammoMap.has(weaponId)) {
      this.ammoMap.set(weaponId, weapon.maxAmmo);
    }
    return true;
  }

  /** Refill a weapon's ammo to its maximum (call this when picking up a crate). */
  refill(weaponId: string): void {
    const weapon = WEAPONS[weaponId];
    if (weapon?.maxAmmo !== undefined) {
      this.ammoMap.set(weaponId, weapon.maxAmmo);
    }
  }

  unequip(): void {
    this.equippedWeaponId = null;
  }

  getEquipped(): WeaponConfig | null {
    return this.equippedWeaponId ? WEAPONS[this.equippedWeaponId] : null;
  }

  /** Returns current ammo for the given weapon, or null if the weapon has infinite ammo. */
  getAmmo(weaponId: string): number | null {
    const weapon = WEAPONS[weaponId];
    if (!weapon || weapon.maxAmmo === undefined) return null;
    return this.ammoMap.get(weaponId) ?? weapon.maxAmmo;
  }

  canFire(shooterId: string, now: number = Date.now()): boolean {
    const weapon = this.getEquipped();
    if (!weapon) return false;

    const last = this.lastFiredAt.get(shooterId);
    if (last !== undefined && now - last < weapon.cooldownMs) return false;

    // Ammo check
    if (weapon.maxAmmo !== undefined) {
      const ammo = this.ammoMap.get(weapon.id) ?? weapon.maxAmmo;
      if (ammo <= 0) return false;
    }
    return true;
  }

  /**
   * Attempt to fire the equipped weapon for the given shooter. Returns the
   * weapon config if the shot is allowed, or null otherwise (on cooldown or
   * out of ammo). On success, records the fire time and decrements ammo.
   */
  fire(shooterId: string, now: number = Date.now()): WeaponConfig | null {
    if (!this.canFire(shooterId, now)) return null;

    const weapon = this.getEquipped();
    if (!weapon) return null;

    this.lastFiredAt.set(shooterId, now);

    if (weapon.maxAmmo !== undefined) {
      const current = this.ammoMap.get(weapon.id) ?? weapon.maxAmmo;
      this.ammoMap.set(weapon.id, Math.max(0, current - 1));
    }

    return weapon;
  }
}

export default WeaponManager;
