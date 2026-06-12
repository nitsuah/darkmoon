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
});
