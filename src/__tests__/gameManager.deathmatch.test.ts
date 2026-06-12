import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameManager, { type Player } from "../components/GameManager";

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
});

describe("GameManager deathmatch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starting deathmatch initializes health, maxHealth, and scores for all players", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    expect(manager.startDeathmatchGame(120, 5)).toBe(true);

    const state = manager.getGameState();
    expect(state.mode).toBe("deathmatch");
    expect(state.isActive).toBe(true);
    expect(state.killLimit).toBe(5);

    for (const player of manager.getPlayers().values()) {
      expect(player.health).toBe(100);
      expect(player.maxHealth).toBe(100);
      expect(state.scores[player.id]).toBe(0);
    }
  });

  it("a hit reduces the target's health", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startDeathmatchGame();

    expect(manager.hitPlayer("p1", "p2", 30)).toBe(true);
    expect(manager.getPlayers().get("p2")?.health).toBe(70);
  });

  it("a lethal hit awards the attacker a kill and starts the target's respawn timer", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    expect(manager.hitPlayer("p1", "p2", 150)).toBe(true);

    const target = manager.getPlayers().get("p2")!;
    expect(target.health).toBe(0);
    expect(target.respawnAt).toBe(13000);
    expect(manager.getGameState().scores["p1"]).toBe(1);
  });

  it("restores health and clears respawnAt once the respawn delay elapses", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();
    manager.hitPlayer("p1", "p2", 1000);

    const target = manager.getPlayers().get("p2")!;
    expect(target.health).toBe(0);
    expect(target.respawnAt).toBe(13000);

    vi.spyOn(Date, "now").mockReturnValue(13001);
    manager.updateGameTimer(0.1);

    expect(target.health).toBe(target.maxHealth);
    expect(target.respawnAt).toBeUndefined();
  });

  it("rejects self-hits", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.startDeathmatchGame();

    expect(manager.hitPlayer("p1", "p1", 10)).toBe(false);
  });

  it("rejects hits outside an active deathmatch", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    // Not started yet
    expect(manager.hitPlayer("p1", "p2", 10)).toBe(false);

    // Started in tag mode instead
    manager.startTagGame();
    expect(manager.hitPlayer("p1", "p2", 10)).toBe(false);
  });

  it("rejects hits on a player who is awaiting respawn", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();
    manager.hitPlayer("p1", "p2", 1000); // p2 downed, awaiting respawn

    expect(manager.hitPlayer("p1", "p2", 10)).toBe(false);
  });

  it("ends the game once a player reaches the kill limit, with results sorted by kills", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame(120, 1);

    manager.hitPlayer("p1", "p2", 1000); // p1 reaches the kill limit of 1
    expect(manager.getGameState().timeRemaining).toBeLessThanOrEqual(0);

    manager.updateGameTimer(0.1);
    expect(manager.getGameState().isActive).toBe(false);

    const results = manager.endGame();
    expect(results).toEqual([
      { id: "p1", name: "P1", score: 1 },
      { id: "p2", name: "P2", score: 0 },
    ]);
  });
});
