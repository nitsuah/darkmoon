import { describe, it, expect } from "vitest";
import {
  BOT1_CONFIG,
  BOT2_CONFIG,
  BOT3_CONFIG,
  BOT4_CONFIG,
  BOT_CONFIGS,
  ZERO_ROTATION,
} from "../constants/botConfigs";

describe("botConfigs", () => {
  it("ZERO_ROTATION equals [0, 0, 0]", () => {
    expect(ZERO_ROTATION).toEqual([0, 0, 0]);
  });

  it("BOT_CONFIGS has length 4", () => {
    expect(BOT_CONFIGS).toHaveLength(4);
  });

  it("BOT_CONFIGS equals individual configs by identity", () => {
    expect(BOT_CONFIGS[0]).toBe(BOT1_CONFIG);
    expect(BOT_CONFIGS[1]).toBe(BOT2_CONFIG);
    expect(BOT_CONFIGS[2]).toBe(BOT3_CONFIG);
    expect(BOT_CONFIGS[3]).toBe(BOT4_CONFIG);
  });

  it("labels are Bot1..Bot4 and unique", () => {
    const labels = BOT_CONFIGS.map((c) => c.label);
    expect(labels).toEqual(["Bot1", "Bot2", "Bot3", "Bot4"]);
    expect(new Set(labels).size).toBe(4);
  });

  it("roles: Bot1 and Bot2 attacker, Bot3 and Bot4 defender", () => {
    expect(BOT1_CONFIG.role).toBe("attacker");
    expect(BOT2_CONFIG.role).toBe("attacker");
    expect(BOT3_CONFIG.role).toBe("defender");
    expect(BOT4_CONFIG.role).toBe("defender");
  });

  it("every config has positive speeds and valid ranges", () => {
    for (const config of BOT_CONFIGS) {
      expect(config.botSpeed).toBeGreaterThan(0);
      expect(config.sprintSpeed).toBeGreaterThan(0);
      expect(config.fleeSpeed).toBeGreaterThan(0);
      expect(config.chaseRadius).toBeGreaterThan(0);
      expect(config.sprintSpeed).toBeGreaterThanOrEqual(config.botSpeed);

      if (config.missChance !== undefined) {
        expect(config.missChance).toBeGreaterThanOrEqual(0);
        expect(config.missChance).toBeLessThanOrEqual(1);
      }

      if (config.fireRange !== undefined) {
        expect(config.fireRange).toBeGreaterThan(0);
      }

      expect(config.initialPosition).toHaveLength(3);
      expect(config.initialPosition.every((n) => typeof n === "number")).toBe(
        true,
      );
    }
  });

  it("initial positions are unique across the four bots", () => {
    const positions = BOT_CONFIGS.map((c) => JSON.stringify(c.initialPosition));
    expect(new Set(positions).size).toBe(4);
  });
});
