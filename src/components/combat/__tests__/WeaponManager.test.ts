import { describe, it, expect } from "vitest";
import WeaponManager, { WEAPONS } from "../WeaponManager";

describe("WeaponManager", () => {
  it("has no weapon equipped by default", () => {
    const manager = new WeaponManager();
    expect(manager.getEquipped()).toBeNull();
    expect(manager.canFire("p1")).toBe(false);
    expect(manager.fire("p1")).toBeNull();
  });

  it("rejects equipping an unknown weapon", () => {
    const manager = new WeaponManager();
    expect(manager.equip("plasma-cannon")).toBe(false);
    expect(manager.getEquipped()).toBeNull();
  });

  it("equips a known weapon and allows firing", () => {
    const manager = new WeaponManager();
    expect(manager.equip("laser")).toBe(true);
    expect(manager.getEquipped()).toEqual(WEAPONS.laser);

    const fired = manager.fire("p1", 1000);
    expect(fired).toEqual(WEAPONS.laser);
  });

  it("enforces per-shooter cooldown between shots", () => {
    const manager = new WeaponManager();
    manager.equip("laser");

    expect(manager.fire("p1", 1000)).toEqual(WEAPONS.laser);
    // Still within cooldownMs (500ms)
    expect(manager.canFire("p1", 1200)).toBe(false);
    expect(manager.fire("p1", 1200)).toBeNull();

    // Cooldown elapsed
    expect(manager.canFire("p1", 1500)).toBe(true);
    expect(manager.fire("p1", 1500)).toEqual(WEAPONS.laser);
  });

  it("tracks cooldowns independently per shooter", () => {
    const manager = new WeaponManager();
    manager.equip("laser");

    expect(manager.fire("p1", 1000)).toEqual(WEAPONS.laser);
    // p2 hasn't fired yet, so they're unaffected by p1's cooldown
    expect(manager.canFire("p2", 1000)).toBe(true);
    expect(manager.fire("p2", 1000)).toEqual(WEAPONS.laser);
  });

  it("unequip clears the active weapon", () => {
    const manager = new WeaponManager();
    manager.equip("laser");
    manager.unequip();

    expect(manager.getEquipped()).toBeNull();
    expect(manager.fire("p1", 1000)).toBeNull();
  });

  it("shotgun has higher damage and shorter range than laser", () => {
    expect(WEAPONS.shotgun).toBeDefined();
    expect(WEAPONS.shotgun.damage).toBeGreaterThan(WEAPONS.laser.damage);
    expect(WEAPONS.shotgun.range).toBeLessThan(WEAPONS.laser.range);
    expect(WEAPONS.shotgun.cooldownMs).toBeGreaterThan(
      WEAPONS.laser.cooldownMs,
    );
  });

  it("can switch between laser and shotgun", () => {
    const manager = new WeaponManager();
    manager.equip("laser");
    expect(manager.getEquipped()?.id).toBe("laser");

    manager.equip("shotgun");
    expect(manager.getEquipped()?.id).toBe("shotgun");
    expect(manager.getEquipped()).toEqual(WEAPONS.shotgun);
  });

  it("shotgun enforces its own cooldown independently", () => {
    const manager = new WeaponManager();
    manager.equip("shotgun");

    expect(manager.fire("p1", 1000)).toEqual(WEAPONS.shotgun);
    // Still in cooldown (shotgun cooldownMs = 1000)
    expect(manager.canFire("p1", 1500)).toBe(false);
    // After cooldown
    expect(manager.canFire("p1", 2001)).toBe(true);
    expect(manager.fire("p1", 2001)).toEqual(WEAPONS.shotgun);
  });

  describe("ammo system", () => {
    it("laser has no ammo limit (getAmmo returns null)", () => {
      const manager = new WeaponManager();
      manager.equip("laser");
      // Laser has no maxAmmo defined, so getAmmo returns null for infinite ammo
      expect(manager.getAmmo("laser")).toBeNull();
    });

    it("shotgun starts with full ammo on first equip", () => {
      const manager = new WeaponManager();
      manager.equip("shotgun");
      expect(manager.getAmmo("shotgun")).toBe(WEAPONS.shotgun.maxAmmo);
    });

    it("shotgun ammo decrements on each shot", () => {
      const manager = new WeaponManager();
      manager.equip("shotgun");
      const max = WEAPONS.shotgun.maxAmmo!;

      manager.fire("p1", 1000);
      expect(manager.getAmmo("shotgun")).toBe(max - 1);

      manager.fire("p1", 2001);
      expect(manager.getAmmo("shotgun")).toBe(max - 2);
    });

    it("shotgun cannot fire when ammo is empty", () => {
      const manager = new WeaponManager();
      manager.equip("shotgun");
      const max = WEAPONS.shotgun.maxAmmo!;

      let t = 1000;
      for (let i = 0; i < max; i++) {
        expect(manager.fire("p1", t)).not.toBeNull();
        t += 1001; // past cooldown
      }

      expect(manager.getAmmo("shotgun")).toBe(0);
      expect(manager.fire("p1", t)).toBeNull();
    });

    it("refill restores ammo to maximum", () => {
      const manager = new WeaponManager();
      manager.equip("shotgun");
      manager.fire("p1", 1000);
      manager.fire("p1", 2001);
      expect(manager.getAmmo("shotgun")).toBe(WEAPONS.shotgun.maxAmmo! - 2);

      manager.refill("shotgun");
      expect(manager.getAmmo("shotgun")).toBe(WEAPONS.shotgun.maxAmmo);
    });

    it("ammo persists across weapon switches", () => {
      const manager = new WeaponManager();
      manager.equip("shotgun");
      manager.fire("p1", 1000); // uses 1 shotgun ammo

      manager.equip("laser"); // switch away
      manager.equip("shotgun"); // switch back

      expect(manager.getAmmo("shotgun")).toBe(WEAPONS.shotgun.maxAmmo! - 1);
    });

    it("rocket launcher has correct stats and starts with 3 ammo", () => {
      expect(WEAPONS.rocket).toBeDefined();
      expect(WEAPONS.rocket.damage).toBe(100);
      expect(WEAPONS.rocket.maxAmmo).toBe(3);
      expect(WEAPONS.rocket.splashRadius).toBeDefined();
      expect(WEAPONS.rocket.splashDamage).toBeDefined();

      const manager = new WeaponManager();
      manager.equip("rocket");
      expect(manager.getAmmo("rocket")).toBe(3);
    });

    it("rocket fires 3 times then is empty", () => {
      const manager = new WeaponManager();
      manager.equip("rocket");

      expect(manager.fire("p1", 1000)).not.toBeNull(); // 2 left
      expect(manager.fire("p1", 3001)).not.toBeNull(); // 1 left
      expect(manager.fire("p1", 5001)).not.toBeNull(); // 0 left
      expect(manager.fire("p1", 7001)).toBeNull(); // empty
      expect(manager.getAmmo("rocket")).toBe(0);
    });
  });
});
