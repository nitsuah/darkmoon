import { describe, it, expect } from "vitest";
import {
  ARENA,
  MAP_PX,
  formatTime,
  toMapCoord,
} from "../components/GameUI/uiFormat";

describe("uiFormat", () => {
  it("exposes the minimap constants", () => {
    expect(MAP_PX).toBe(180);
    expect(ARENA).toBe(50);
  });

  describe("formatTime", () => {
    it.each([
      [0, "00:00"],
      [59, "00:59"],
      [60, "01:00"],
      [125.9, "02:05"],
      [3600, "60:00"],
    ])("formats %s seconds as %s", (seconds, expected) => {
      expect(formatTime(seconds)).toBe(expected);
    });
  });

  describe("toMapCoord", () => {
    it.each([
      [-50, 0],
      [0, 90],
      [50, 180],
      [25, 135],
    ])("maps world %s to map %s", (world, expected) => {
      expect(toMapCoord(world)).toBe(expected);
    });
  });
});
