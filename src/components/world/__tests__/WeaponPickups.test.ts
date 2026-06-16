import { describe, it, expect } from "vitest";
import { PICKUP_DEFS } from "../WeaponPickups";
import { WEAPONS } from "../../combat/WeaponManager";

describe("WeaponPickups pickup definitions", () => {
  it("every pickup references a valid weapon", () => {
    for (const def of PICKUP_DEFS) {
      expect(WEAPONS[def.weaponId]).toBeDefined();
    }
  });

  it("has at least one pickup for each weapon type", () => {
    const weaponIds = new Set(PICKUP_DEFS.map((d) => d.weaponId));
    expect(weaponIds.has("laser")).toBe(true);
    expect(weaponIds.has("shotgun")).toBe(true);
  });

  it("pickup positions have non-negative Y (above ground)", () => {
    for (const def of PICKUP_DEFS) {
      expect(def.position[1]).toBeGreaterThan(0);
    }
  });

  it("all pickup ids are unique", () => {
    const ids = PICKUP_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
