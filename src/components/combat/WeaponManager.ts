export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  /** Maximum effective range in world units. */
  range: number;
  cooldownMs: number;
  /** Maximum ammo capacity. undefined/null means infinite. */
  maxAmmo?: number;
  /** Total reserve ammo beyond the magazine (undefined = unlimited reserves). */
  reserveAmmo?: number;
  /** Reload duration in ms. undefined = instant refill. */
  reloadTimeMs?: number;
  /** If true, weapon reloads automatically when ammo hits 0. */
  autoReload?: boolean;
  /** Area-of-effect radius (world units). Nearby entities within this range of the impact point take splashDamage. */
  splashRadius?: number;
  /** Damage dealt to entities caught in the splash radius (not the direct-hit target). */
  splashDamage?: number;
  /** If true, this weapon can be charged for distance (e.g. grenades). */
  isChargeable?: boolean;
  /** Charge time in ms for maximum throw distance. */
  maxChargeTimeMs?: number;
  /** Number of pellets fired (shotgun cone). Each pellet does damage/pelletCount damage. */
  pelletCount?: number;
  /** Half-angle spread for cone weapons (radians). */
  spreadAngle?: number;
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
    damage: 60,
    range: 10,
    cooldownMs: 1000,
    maxAmmo: 6,
    reserveAmmo: 30,
    reloadTimeMs: 2200,
    pelletCount: 6,
    spreadAngle: 0.28,
  },
  rocket: {
    id: "rocket",
    name: "Rocket Launcher",
    damage: 100,
    range: 12,
    cooldownMs: 2000,
    maxAmmo: 3,
    reserveAmmo: 9,
    reloadTimeMs: 3000,
    splashRadius: 5,
    splashDamage: 50,
  },
  grenade: {
    id: "grenade",
    name: "Frag Grenade",
    damage: 100,
    range: 18,
    cooldownMs: 4000,
    maxAmmo: 3,
    reserveAmmo: 9,
    splashRadius: 7,
    splashDamage: 75,
    isChargeable: true,
    maxChargeTimeMs: 2000,
  },
  smg: {
    id: "smg",
    name: "SMG",
    damage: 12,
    range: 18,
    cooldownMs: 120,
    maxAmmo: 40,
    reserveAmmo: 200,
    reloadTimeMs: 2000,
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
  private reserveAmmoMap: Map<string, number> = new Map();
  private reloadStartAt: Map<string, number> = new Map();
  private chargeStartAt: Map<string, number> = new Map();

  equip(weaponId: string): boolean {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return false;
    this.equippedWeaponId = weaponId;
    // Initialize ammo only if not yet tracked (preserve ammo across weapon switches).
    if (weapon.maxAmmo !== undefined && !this.ammoMap.has(weaponId)) {
      this.ammoMap.set(weaponId, weapon.maxAmmo);
    }
    if (
      weapon.reserveAmmo !== undefined &&
      !this.reserveAmmoMap.has(weaponId)
    ) {
      this.reserveAmmoMap.set(weaponId, weapon.reserveAmmo);
    }
    return true;
  }

  /** Reload from reserves (called when a timed reload completes). */
  refill(weaponId: string): void {
    const weapon = WEAPONS[weaponId];
    if (weapon?.maxAmmo === undefined) return;
    // Lazily initialize reserveAmmo so refill works even if equip() was skipped
    if (
      !this.reserveAmmoMap.has(weaponId) &&
      weapon.reserveAmmo !== undefined
    ) {
      this.reserveAmmoMap.set(weaponId, weapon.reserveAmmo);
    }
    const reserve = this.reserveAmmoMap.get(weaponId);
    if (reserve !== undefined && weapon.reserveAmmo !== undefined) {
      const needed = weapon.maxAmmo - (this.ammoMap.get(weaponId) ?? 0);
      const toLoad = Math.min(needed, reserve);
      this.ammoMap.set(weaponId, (this.ammoMap.get(weaponId) ?? 0) + toLoad);
      this.reserveAmmoMap.set(weaponId, reserve - toLoad);
    } else {
      this.ammoMap.set(weaponId, weapon.maxAmmo);
    }
    this.reloadStartAt.delete(weaponId);
  }

  /** Restore full magazine and full reserves (weapon pickup / respawn). */
  restock(weaponId: string): void {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return;
    if (weapon.maxAmmo !== undefined)
      this.ammoMap.set(weaponId, weapon.maxAmmo);
    if (weapon.reserveAmmo !== undefined)
      this.reserveAmmoMap.set(weaponId, weapon.reserveAmmo);
    this.reloadStartAt.delete(weaponId);
  }

  /** Returns current reserve ammo, null if weapon has unlimited reserves, or undefined if weaponId is unknown. */
  getReserveAmmo(weaponId: string): number | null | undefined {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return undefined;
    if (weapon.reserveAmmo === undefined) return null;
    return this.reserveAmmoMap.get(weaponId) ?? weapon.reserveAmmo;
  }

  /** Begin reloading the weapon. No-op if already reloading, at full ammo, or no reserves. */
  startReload(weaponId: string, now: number = Date.now()): boolean {
    const weapon = WEAPONS[weaponId];
    if (!weapon?.reloadTimeMs) return false;
    if (this.reloadStartAt.has(weaponId)) return false; // already reloading
    const current = this.ammoMap.get(weaponId) ?? weapon.maxAmmo ?? 0;
    if (current >= (weapon.maxAmmo ?? 0)) return false; // already full
    // Need reserve ammo to reload (if reserves are tracked)
    if (weapon.reserveAmmo !== undefined) {
      const reserve = this.reserveAmmoMap.get(weaponId) ?? weapon.reserveAmmo;
      if (reserve <= 0) return false; // no ammo left to reload with
    }
    this.reloadStartAt.set(weaponId, now);
    return true;
  }

  /** Returns 0–1 reload progress, or null if not reloading. 1 = complete. */
  getReloadProgress(weaponId: string, now: number = Date.now()): number | null {
    const weapon = WEAPONS[weaponId];
    if (!weapon?.reloadTimeMs) return null;
    const start = this.reloadStartAt.get(weaponId);
    if (start === undefined) return null;
    return Math.min(1, (now - start) / weapon.reloadTimeMs);
  }

  isReloading(weaponId: string, now: number = Date.now()): boolean {
    const progress = this.getReloadProgress(weaponId, now);
    return progress !== null && progress < 1;
  }

  isCharging(weaponId: string): boolean {
    return this.chargeStartAt.has(weaponId);
  }

  startCharge(weaponId: string, now: number = Date.now()): void {
    if (WEAPONS[weaponId]?.isChargeable) {
      this.chargeStartAt.set(weaponId, now);
    }
  }

  stopCharge(weaponId: string): number | null {
    const start = this.chargeStartAt.get(weaponId);
    this.chargeStartAt.delete(weaponId);
    if (start === undefined) return null;
    return Date.now() - start;
  }

  getChargeProgress(weaponId: string, now: number = Date.now()): number {
    const weapon = WEAPONS[weaponId];
    if (!weapon?.isChargeable || !weapon.maxChargeTimeMs) return 0;
    const start = this.chargeStartAt.get(weaponId);
    if (start === undefined) return 0;
    return Math.min(1, (now - start) / weapon.maxChargeTimeMs);
  }

  /** Completes a finished reload, refilling ammo. Called from canFire/fire checks. */
  private completeReloadIfDone(weaponId: string, now: number): void {
    const progress = this.getReloadProgress(weaponId, now);
    if (progress !== null && progress >= 1) {
      this.refill(weaponId);
    }
  }

  /** Force-completes a reload instantly (precision reload mechanic). */
  completeReloadNow(weaponId: string): void {
    if (!this.reloadStartAt.has(weaponId)) return;
    const weapon = WEAPONS[weaponId];
    if (!weapon) return;
    this.refill(weaponId);
  }

  unequip(): void {
    if (this.equippedWeaponId) {
      this.stopCharge(this.equippedWeaponId);
    }
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

    // Complete a finished reload before checking ammo.
    this.completeReloadIfDone(weapon.id, now);

    // Block firing while reloading.
    if (this.isReloading(weapon.id, now)) return false;

    const last = this.lastFiredAt.get(shooterId);
    if (last !== undefined && now - last < weapon.cooldownMs) return false;

    // Ammo check.
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
      const next = Math.max(0, current - 1);
      this.ammoMap.set(weapon.id, next);
      // Auto-reload weapons start reloading immediately when emptied.
      if (next === 0 && weapon.autoReload) {
        this.startReload(weapon.id, now);
      }
    }

    return weapon;
  }
}

export default WeaponManager;
