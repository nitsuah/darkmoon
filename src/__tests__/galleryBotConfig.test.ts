/**
 * Sanity-checks for the GalleryBotConfig presets.
 * Ensures the tunable difficulty ladder is internally consistent:
 * each harder preset must have faster reactions, tighter aim, and
 * lower miss chance than the preset below it.
 */
import { describe, it, expect } from "vitest";
import { GALLERY_BOT_PRESETS } from "../pages/Solo/components/GalleryBotConfig";

const { easy, medium, hard, perfect } = GALLERY_BOT_PRESETS;

describe("GalleryBotConfig presets — difficulty ladder", () => {
  it("reaction time decreases as difficulty increases", () => {
    expect(easy.reactionMs).toBeGreaterThan(medium.reactionMs);
    expect(medium.reactionMs).toBeGreaterThan(hard.reactionMs);
    expect(hard.reactionMs).toBeGreaterThan(perfect.reactionMs);
  });

  it("aim jitter decreases as difficulty increases", () => {
    expect(easy.aimJitterRad).toBeGreaterThan(medium.aimJitterRad);
    expect(medium.aimJitterRad).toBeGreaterThan(hard.aimJitterRad);
    expect(hard.aimJitterRad).toBeGreaterThan(perfect.aimJitterRad);
  });

  it("miss chance decreases as difficulty increases", () => {
    expect(easy.missChance).toBeGreaterThan(medium.missChance);
    expect(medium.missChance).toBeGreaterThan(hard.missChance);
    expect(hard.missChance).toBeGreaterThan(perfect.missChance);
  });

  it("shot interval decreases as difficulty increases", () => {
    expect(easy.shotIntervalMs).toBeGreaterThan(medium.shotIntervalMs);
    expect(medium.shotIntervalMs).toBeGreaterThan(hard.shotIntervalMs);
    expect(hard.shotIntervalMs).toBeGreaterThan(perfect.shotIntervalMs);
  });

  it("perfect bot has zero jitter and zero miss chance", () => {
    expect(perfect.aimJitterRad).toBe(0);
    expect(perfect.missChance).toBe(0);
  });

  it("all presets have valid ranges for numeric fields", () => {
    for (const [name, cfg] of Object.entries(GALLERY_BOT_PRESETS)) {
      expect(cfg.reactionMs, `${name}.reactionMs`).toBeGreaterThan(0);
      expect(cfg.shotIntervalMs, `${name}.shotIntervalMs`).toBeGreaterThan(0);
      expect(cfg.aimJitterRad, `${name}.aimJitterRad`).toBeGreaterThanOrEqual(
        0,
      );
      expect(cfg.missChance, `${name}.missChance`).toBeGreaterThanOrEqual(0);
      expect(cfg.missChance, `${name}.missChance`).toBeLessThanOrEqual(1);
    }
  });

  it("all presets have a non-empty name string", () => {
    for (const [key, cfg] of Object.entries(GALLERY_BOT_PRESETS)) {
      expect(typeof cfg.name, key).toBe("string");
      expect(cfg.name.length, key).toBeGreaterThan(0);
    }
  });

  it("all presets have a valid targetStrategy", () => {
    const valid = new Set([
      "random",
      "highest_value",
      "nearest",
      "front_first",
    ]);
    for (const [key, cfg] of Object.entries(GALLERY_BOT_PRESETS)) {
      expect(
        valid.has(cfg.targetStrategy),
        `${key}.targetStrategy="${cfg.targetStrategy}"`,
      ).toBe(true);
    }
  });
});
