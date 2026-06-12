export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  /** Maximum effective range in world units. */
  range: number;
  cooldownMs: number;
}

export const WEAPONS: Record<string, WeaponConfig> = {
  laser: {
    id: "laser",
    name: "Laser Blaster",
    damage: 10,
    range: 30,
    cooldownMs: 500,
  },
};

/**
 * Tracks the equipped weapon and per-shooter fire cooldowns. Pure data/logic
 * - scene mutation (projectile visuals, hit VFX) stays in the React layer.
 */
export class WeaponManager {
  private equippedWeaponId: string | null = null;
  private lastFiredAt: Map<string, number> = new Map();

  equip(weaponId: string): boolean {
    if (!WEAPONS[weaponId]) return false;
    this.equippedWeaponId = weaponId;
    return true;
  }

  unequip(): void {
    this.equippedWeaponId = null;
  }

  getEquipped(): WeaponConfig | null {
    return this.equippedWeaponId ? WEAPONS[this.equippedWeaponId] : null;
  }

  canFire(shooterId: string, now: number = Date.now()): boolean {
    const weapon = this.getEquipped();
    if (!weapon) return false;

    const last = this.lastFiredAt.get(shooterId);
    return last === undefined || now - last >= weapon.cooldownMs;
  }

  /**
   * Attempt to fire the equipped weapon for the given shooter. Returns the
   * weapon config if the shot is allowed (a weapon is equipped and the
   * shooter is off cooldown), or null otherwise. On success, records the
   * fire time so subsequent calls respect the weapon's cooldown.
   */
  fire(shooterId: string, now: number = Date.now()): WeaponConfig | null {
    if (!this.canFire(shooterId, now)) return null;

    const weapon = this.getEquipped();
    if (!weapon) return null;

    this.lastFiredAt.set(shooterId, now);
    return weapon;
  }
}

export default WeaponManager;
