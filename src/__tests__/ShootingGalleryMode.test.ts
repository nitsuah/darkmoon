import { describe, it, expect, beforeEach } from "vitest";
import ShootingGalleryMode, {
  ShootingGalleryMode as NamedShootingGalleryMode,
} from "../components/gameModes/ShootingGalleryMode";
import type { GameAction } from "../components/gameModes/GameModeHandler";
import type { GameState, Player } from "../components/GameManager";

describe("ShootingGalleryMode", () => {
  let mode: ShootingGalleryMode;
  let players: Map<string, Player>;
  let gameState: GameState;

  beforeEach(() => {
    mode = new ShootingGalleryMode();
    players = new Map();
    players.set("p1", {
      id: "p1",
      name: "Player 1",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      health: 100,
      maxHealth: 100,
    });
    players.set("p2", {
      id: "p2",
      name: "Player 2",
      position: [5, 0, 5],
      rotation: [0, 0, 0],
      health: 100,
      maxHealth: 100,
    });
    gameState = {
      mode: "shooting_gallery",
      isActive: true,
      timeRemaining: 60,
      scores: { p1: 7, p2: 9 },
      galleryShots: 4,
      galleryHits: 3,
    };
  });

  it("exports the same class as default and named export", () => {
    expect(NamedShootingGalleryMode).toBe(ShootingGalleryMode);
  });

  it("onStart zeroes scores and gallery stats, overwriting stale values", () => {
    mode.onStart(players, gameState);
    expect(gameState.scores).toEqual({ p1: 0, p2: 0 });
    expect(gameState.galleryShots).toBe(0);
    expect(gameState.galleryHits).toBe(0);
  });

  it("onTick lowers timeRemaining by exactly the delta and nothing else", () => {
    mode.onTick(2, players, gameState);
    expect(gameState.timeRemaining).toBe(58);
    expect(gameState.scores).toEqual({ p1: 7, p2: 9 });
    expect(gameState.galleryShots).toBe(4);
    expect(gameState.galleryHits).toBe(3);
  });

  it("onAction is a no-op returning false for every action type", () => {
    const actions: GameAction[] = [
      { type: "tag", taggerId: "p1", taggedId: "p2" },
      { type: "hit", attackerId: "p1", targetId: "p2", damage: 10 },
      { type: "pickupFlag", playerId: "p1" },
      { type: "captureFlag", playerId: "p1" },
    ];
    const before = JSON.stringify(gameState);
    for (const action of actions) {
      expect(mode.onAction(action, players, gameState)).toBe(false);
    }
    expect(JSON.stringify(gameState)).toBe(before);
  });

  it("onPlayerRemoved does not throw or change scores", () => {
    expect(() => mode.onPlayerRemoved("p1", players, gameState)).not.toThrow();
    expect(gameState.scores).toEqual({ p1: 7, p2: 9 });
  });

  it("onEnd sorts by score descending and defaults missing scores to 0", () => {
    players.set("p3", {
      id: "p3",
      name: "Player 3",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      health: 100,
      maxHealth: 100,
    });
    expect(mode.onEnd(players, gameState)).toEqual([
      { id: "p2", name: "Player 2", score: 9 },
      { id: "p1", name: "Player 1", score: 7 },
      { id: "p3", name: "Player 3", score: 0 },
    ]);
  });
});
