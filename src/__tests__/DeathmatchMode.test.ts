import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeathmatchMode } from "../components/gameModes/DeathmatchMode";
import { GameState, Player } from "../components/GameManager";

describe("DeathmatchMode", () => {
  let deathmatchMode: DeathmatchMode;
  let players: Map<string, Player>;
  let gameState: GameState;

  beforeEach(() => {
    deathmatchMode = new DeathmatchMode();
    players = new Map();
    players.set("player1", { id: "player1", name: "Player 1", position: [0, 0, 0], rotation: [0, 0, 0], health: 100, maxHealth: 100 });
    players.set("player2", { id: "player2", name: "Player 2", position: [10, 0, 10], rotation: [0, 0, 0], health: 100, maxHealth: 100 });
    gameState = {
      mode: "deathmatch",
      isActive: true,
      timeRemaining: 60000,
      scores: {},
      killLimit: 10,
    };
  });

  describe("onStart", () => {
    it("should initialize scores and health for all players", () => {
      deathmatchMode.onStart(players, gameState);
      players.forEach((player, id) => {
        expect(gameState.scores[id]).toBe(0);
        expect(player.health).toBe(player.maxHealth);
        expect(player.respawnAt).toBeUndefined();
        expect(player.currentKillStreak).toBe(0);
      });
    });
  });

  describe("onTick", () => {
    it("should decrease timeRemaining", () => {
      const initialTime = gameState.timeRemaining;
      deathmatchMode.onTick(1, players, gameState);
      expect(gameState.timeRemaining).toBe(initialTime - 1);
    });

    it("should respawn players when respawnAt time is reached", () => {
      const now = Date.now();
      const player1 = players.get("player1")!;
      player1.respawnAt = now - 1; // Set respawn time in the past
      player1.health = 0;
      deathmatchMode.onTick(0.016, players, gameState);
      expect(player1.health).toBe(player1.maxHealth);
      expect(player1.respawnAt).toBeUndefined();
      expect(player1.spawnProtectedUntil).toBeGreaterThan(now);
    });

    it("should handle spawn protection", () => {
      const now = Date.now();
      const player1 = players.get("player1")!;
      player1.spawnProtectedUntil = now - 1;
      deathmatchMode.onTick(0.016, players, gameState);
      expect(player1.spawnProtectedUntil).toBeUndefined();
    });

    it("should handle passive health regeneration", () => {
      const player1 = players.get("player1")!;
      player1.health = 20; // Below half health
      player1.lastDamageAt = Date.now() - 6000; // 6 seconds ago
      deathmatchMode.onTick(1, players, gameState);
      expect(player1.health).toBe(25); // 20 + 5 * 1
    });
  });

  describe("onAction", () => {
    it("should apply damage on hit action", () => {
      const player2 = players.get("player2")!;
      const initialHealth = player2.health!;
      deathmatchMode.onAction({ type: "hit", attackerId: "player1", targetId: "player2", damage: 10, weaponId: "laser" }, players, gameState);
      expect(player2.health).toBe(initialHealth - 10);
    });

    it("should not apply damage if target is respawning or spawn protected", () => {
      const player2 = players.get("player2")!;
      const initialHealth = player2.health!;
      player2.respawnAt = Date.now() + 1000;
      deathmatchMode.onAction({ type: "hit", attackerId: "player1", targetId: "player2", damage: 10, weaponId: "laser" }, players, gameState);
      expect(player2.health).toBe(initialHealth);

      player2.respawnAt = undefined;
      player2.spawnProtectedUntil = Date.now() + 1000;
      deathmatchMode.onAction({ type: "hit", attackerId: "player1", targetId: "player2", damage: 10, weaponId: "laser" }, players, gameState);
      expect(player2.health).toBe(initialHealth);
    });

    it("should handle kills", () => {
      const attacker = players.get("player1")!;
      const target = players.get("player2")!;
      target.health = 10;
      deathmatchMode.onAction({ type: "hit", attackerId: "player1", targetId: "player2", damage: 10, weaponId: "laser" }, players, gameState);
      expect(target.health).toBe(0);
      expect(target.respawnAt).toBeGreaterThan(0);
      expect(gameState.scores["player1"]).toBe(1);
      expect(attacker.currentKillStreak).toBe(1);
      expect(target.currentKillStreak).toBe(0);
      expect(gameState.killFeed).toHaveLength(1);
    });

    it("should handle kill streaks and end game on killLimit", () => {
      const attacker = players.get("player1")!;
      gameState.killLimit = 3;
      attacker.currentKillStreak = 2;
      gameState.scores["player1"] = 2; // Seed score
      deathmatchMode.onAction({ type: "hit", attackerId: "player1", targetId: "player2", damage: 100, weaponId: "laser" }, players, gameState);
      expect(attacker.currentKillStreak).toBe(3);
      expect(gameState.streakAnnouncement).toBeDefined();
      expect(gameState.streakAnnouncement?.count).toBe(3);
      expect(gameState.timeRemaining).toBe(0); // Game should end
    });
  });

  describe("onEnd", () => {
    it("should return sorted results and reset player states", () => {
      gameState.scores["player1"] = 5;
      gameState.scores["player2"] = 10;
      const results = deathmatchMode.onEnd(players, gameState);
      expect(results[0].id).toBe("player2");
      expect(results[1].id).toBe("player1");
      players.forEach(player => {
        expect(player.health).toBe(player.maxHealth);
        expect(player.respawnAt).toBeUndefined();
        expect(player.spawnProtectedUntil).toBeUndefined();
        expect(player.currentKillStreak).toBe(0);
      });
      expect(gameState.streakAnnouncement).toBeUndefined();
    });
  });
});
