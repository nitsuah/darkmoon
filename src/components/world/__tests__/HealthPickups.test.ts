import { describe, it, expect } from "vitest";
import { HEALTH_PICKUP_DEFS } from "../HealthPickups";

describe("HealthPickups pickup definitions", () => {
  it("has at least 2 health pickups", () => {
    expect(HEALTH_PICKUP_DEFS.length).toBeGreaterThanOrEqual(2);
  });

  it("all pickup ids are unique", () => {
    const ids = HEALTH_PICKUP_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pickup positions have positive Y (above ground)", () => {
    for (const def of HEALTH_PICKUP_DEFS) {
      expect(def.position[1]).toBeGreaterThan(0);
    }
  });

  it("pickups are spread across the arena (not all stacked at origin)", () => {
    const positions = HEALTH_PICKUP_DEFS.map(
      (d) => `${d.position[0]},${d.position[2]}`,
    );
    expect(new Set(positions).size).toBe(positions.length);
  });
});
