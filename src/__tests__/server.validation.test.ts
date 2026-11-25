import { describe, it, expect } from "vitest";
import {
  validatePosition,
  validateRotation,
  validateChatMessage,
  VALID_GAME_MODES,
  validateGameMode,
} from "../../server/validation.js";

describe("validatePosition", () => {
  it("validates correct positions", () => {
    expect(validatePosition([0, 0, 0])).toBe(true);
    expect(validatePosition([50, 20, -50])).toBe(true);
    expect(validatePosition([0, -5, 0])).toBe(true);
  });

  it("rejects out of bounds positions", () => {
    expect(validatePosition([51, 0, 0])).toBe(false);
    expect(validatePosition([0, 0, -51])).toBe(false);
    expect(validatePosition([0, 21, 0])).toBe(false);
    expect(validatePosition([0, -6, 0])).toBe(false);
  });

  it("rejects wrong length arrays", () => {
    expect(validatePosition([0, 0])).toBe(false);
    expect(validatePosition([0, 0, 0, 0])).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(validatePosition("0,0,0")).toBe(false);
    expect(validatePosition(null)).toBe(false);
  });

  it("rejects invalid number types", () => {
    expect(validatePosition([0, "0", 0])).toBe(false);
    expect(validatePosition([NaN, 0, 0])).toBe(false);
    expect(validatePosition([0, Infinity, 0])).toBe(false);
  });
});

describe("validateRotation", () => {
  it("validates correct rotation", () => {
    expect(validateRotation([0, 1.5, -3])).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(validateRotation([0, 1])).toBe(false);
    expect(validateRotation([0, 1, 2, 3])).toBe(false);
  });

  it("rejects non-number entries", () => {
    expect(validateRotation([0, "1.5", -3])).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(validateRotation([NaN, 0, 0])).toBe(false);
    expect(validateRotation([0, Infinity, 0])).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(validateRotation("0,1.5,-3")).toBe(false);
    expect(validateRotation(null)).toBe(false);
    expect(validateRotation({ x: 0, y: 1.5, z: -3 })).toBe(false);
  });
});

describe("validateChatMessage", () => {
  it("validates correct message", () => {
    expect(
      validateChatMessage({ message: "hi", playerId: "p1", playerName: "Ann" }),
    ).toBe(true);
  });

  it("validates message at max length (500 chars)", () => {
    const msg500 = "a".repeat(500);
    expect(
      validateChatMessage({
        message: msg500,
        playerId: "p1",
        playerName: "Ann",
      }),
    ).toBe(true);
  });

  it("rejects message over max length (501 chars)", () => {
    const msg501 = "a".repeat(501);
    expect(
      validateChatMessage({
        message: msg501,
        playerId: "p1",
        playerName: "Ann",
      }),
    ).toBe(false);
  });

  it("rejects empty message", () => {
    expect(
      validateChatMessage({ message: "", playerId: "p1", playerName: "Ann" }),
    ).toBe(false);
  });

  it("validates player name at max length (50 chars)", () => {
    const name50 = "a".repeat(50);
    expect(
      validateChatMessage({
        message: "hi",
        playerId: "p1",
        playerName: name50,
      }),
    ).toBe(true);
  });

  it("rejects player name over max length (51 chars)", () => {
    const name51 = "a".repeat(51);
    expect(
      validateChatMessage({
        message: "hi",
        playerId: "p1",
        playerName: name51,
      }),
    ).toBe(false);
  });

  it("rejects empty player name", () => {
    expect(
      validateChatMessage({ message: "hi", playerId: "p1", playerName: "" }),
    ).toBe(false);
  });

  it("rejects missing or non-string playerId", () => {
    expect(
      validateChatMessage({ message: "hi", playerId: 123, playerName: "Ann" }),
    ).toBe(false);
    expect(validateChatMessage({ message: "hi", playerName: "Ann" })).toBe(
      false,
    );
  });

  it("rejects null input", () => {
    expect(validateChatMessage(null)).toBe(false);
  });

  it("rejects string input", () => {
    expect(validateChatMessage("hi")).toBe(false);
  });
});

describe("VALID_GAME_MODES", () => {
  it("equals expected array", () => {
    expect(VALID_GAME_MODES).toEqual(["tag", "collectible", "race", "solo"]);
  });
});

describe("validateGameMode", () => {
  it("returns true for valid game modes", () => {
    expect(validateGameMode("tag")).toBe(true);
    expect(validateGameMode("collectible")).toBe(true);
    expect(validateGameMode("race")).toBe(true);
    expect(validateGameMode("solo")).toBe(true);
  });

  it("returns false for invalid game modes", () => {
    expect(validateGameMode("deathmatch")).toBe(false);
    expect(validateGameMode("")).toBe(false);
    expect(validateGameMode(null)).toBe(false);
    expect(validateGameMode(1)).toBe(false);
  });
});
