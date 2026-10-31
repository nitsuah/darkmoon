import { describe, it, expect } from "vitest";
import { createSoloProbeSnapshot } from "./soloProbeSnapshot";
import type { Player, GameState } from "../components/GameManager";

describe("soloProbeSnapshot", () => {
  const mockPlayers = new Map<string, Player>();
  const mockGameState: GameState = {
    mode: "tag",
    isActive: true,
    timeRemaining: 60,
    scores: { "player-1": 5, "player-2": 3 },
  };

  const mockGameManager = {
    getGameState: () => mockGameState,
    getPlayers: () => mockPlayers,
  };

  it("returns null position when playerPosition is undefined", () => {
    const snap = createSoloProbeSnapshot(
      undefined,
      "player-1",
      mockGameManager,
    );
    expect(snap.position).toBeNull();
  });

  it("returns null position when coordinates are not finite", () => {
    const snap = createSoloProbeSnapshot(
      [NaN, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.position).toBeNull();
    const snap2 = createSoloProbeSnapshot(
      [Infinity, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap2.position).toBeNull();
  });

  it("maps valid position tuple to {x,y,z}", () => {
    const snap = createSoloProbeSnapshot(
      [1.5, 2.5, -3.5],
      "player-1",
      mockGameManager,
    );
    expect(snap.position).toEqual({ x: 1.5, y: 2.5, z: -3.5 });
  });

  it("returns null health when player has no health property", () => {
    mockPlayers.set("player-1", { id: "player-1", name: "Test" } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.health).toBeNull();
  });

  it("maps player health when present", () => {
    mockPlayers.set("player-1", {
      id: "player-1",
      name: "Test",
      health: 75,
    } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.health).toBe(75);
  });

  it("returns null ammo when currentAmmo is undefined", () => {
    mockPlayers.set("player-1", { id: "player-1", name: "Test" } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.ammo).toBeNull();
  });

  it("preserves explicit null ammo (infinite ammo)", () => {
    mockPlayers.set("player-1", {
      id: "player-1",
      name: "Test",
      currentAmmo: null,
    } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.ammo).toBeNull();
  });

  it("maps numeric currentAmmo when present", () => {
    mockPlayers.set("player-1", {
      id: "player-1",
      name: "Test",
      currentAmmo: 30,
    } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.ammo).toBe(30);
  });

  it("returns null score when player not in scores", () => {
    mockPlayers.set("player-1", { id: "player-1", name: "Test" } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "unknown-player",
      mockGameManager,
    );
    expect(snap.score).toBeNull();
  });

  it("maps score keyed by currentPlayerId", () => {
    mockPlayers.set("player-1", { id: "player-1", name: "Test" } as Player);
    const snap = createSoloProbeSnapshot(
      [0, 0, 0],
      "player-1",
      mockGameManager,
    );
    expect(snap.score).toBe(5);
  });

  it("returns all nulls when gameManager is null", () => {
    const snap = createSoloProbeSnapshot([1, 2, 3], "player-1", null);
    expect(snap).toEqual({
      position: { x: 1, y: 2, z: 3 },
      health: null,
      ammo: null,
      score: null,
    });
  });

  it("returns all nulls when currentPlayerId is undefined", () => {
    const snap = createSoloProbeSnapshot([1, 2, 3], undefined, mockGameManager);
    expect(snap).toEqual({
      position: { x: 1, y: 2, z: 3 },
      health: null,
      ammo: null,
      score: null,
    });
  });

  it("returns all nulls when player not found in manager", () => {
    mockPlayers.set("other-player", {
      id: "other-player",
      name: "Other",
    } as Player);
    const snap = createSoloProbeSnapshot(
      [1, 2, 3],
      "missing-player",
      mockGameManager,
    );
    expect(snap).toEqual({
      position: { x: 1, y: 2, z: 3 },
      health: null,
      ammo: null,
      score: null,
    });
  });
});
