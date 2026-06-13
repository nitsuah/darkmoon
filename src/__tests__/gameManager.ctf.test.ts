import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameManager, { type Player } from "../components/GameManager";
import { TEAM_A_BASE, TEAM_B_BASE } from "../components/gameModes/CTFMode";

const makePlayer = (
  id: string,
  name: string,
  position: [number, number, number] = [0, 0, 0],
): Player => ({
  id,
  name,
  position,
  rotation: [0, 0, 0],
});

describe("GameManager CTF", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starting CTF assigns alternating teams and spawns each team's flag at its base", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.addPlayer(makePlayer("p3", "P3"));
    manager.addPlayer(makePlayer("p4", "P4"));

    expect(manager.startCTFGame(180)).toBe(true);

    const state = manager.getGameState();
    expect(state.mode).toBe("ctf");
    expect(state.isActive).toBe(true);
    expect(state.scores).toEqual({ a: 0, b: 0 });

    const players = manager.getPlayers();
    expect(players.get("p1")?.team).toBe("a");
    expect(players.get("p2")?.team).toBe("b");
    expect(players.get("p3")?.team).toBe("a");
    expect(players.get("p4")?.team).toBe("b");

    expect(state.flags).toEqual([
      { team: "a", position: TEAM_A_BASE, basePosition: TEAM_A_BASE },
      { team: "b", position: TEAM_B_BASE, basePosition: TEAM_B_BASE },
    ]);
  });

  it("a player can pick up the enemy team's flag when standing near it", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a, standing at team b's base
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    expect(manager.pickupFlag("p1")).toBe(true);

    const flags = manager.getGameState().flags!;
    expect(flags.find((f) => f.team === "b")?.carrierId).toBe("p1");
  });

  it("a player cannot pick up their own team's flag", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_A_BASE)); // team a, standing at their own base
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    expect(manager.pickupFlag("p1")).toBe(false);

    const flags = manager.getGameState().flags!;
    expect(flags.find((f) => f.team === "a")?.carrierId).toBeUndefined();
  });

  it("pickup fails when the player is out of range of the enemy flag", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", [0, 0, 0])); // far from either base
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    expect(manager.pickupFlag("p1")).toBe(false);
  });

  it("a carried flag follows its carrier as the game ticks", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();
    manager.pickupFlag("p1");

    manager.updatePlayerPosition("p1", [3, 0.5, 4]);
    manager.updateGameTimer(0.1);

    const flags = manager.getGameState().flags!;
    expect(flags.find((f) => f.team === "b")?.position).toEqual([3, 0.5, 4]);
  });

  it("capturing the enemy flag at your own base scores a point and returns the flag", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();
    manager.pickupFlag("p1");

    // Carry the flag home to team a's base.
    manager.updatePlayerPosition("p1", TEAM_A_BASE);

    expect(manager.captureFlag("p1")).toBe(true);
    expect(manager.getGameState().scores["a"]).toBe(1);

    const flags = manager.getGameState().flags!;
    const flagB = flags.find((f) => f.team === "b")!;
    expect(flagB.carrierId).toBeUndefined();
    expect(flagB.position).toEqual(TEAM_B_BASE);
  });

  it("capture fails if the player isn't carrying a flag", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_A_BASE));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    expect(manager.captureFlag("p1")).toBe(false);
    expect(manager.getGameState().scores["a"]).toBe(0);
  });

  it("capture fails outside the capture zone", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();
    manager.pickupFlag("p1");

    // Still at team b's base, not home yet.
    expect(manager.captureFlag("p1")).toBe(false);
    expect(manager.getGameState().scores["a"]).toBe(0);
  });

  it("rejects flag actions outside an active CTF game", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE));
    manager.addPlayer(makePlayer("p2", "P2"));

    // Not started yet
    expect(manager.pickupFlag("p1")).toBe(false);
    expect(manager.captureFlag("p1")).toBe(false);

    // Started in tag mode instead
    manager.startTagGame();
    expect(manager.pickupFlag("p1")).toBe(false);
  });

  it("returns a carried flag to base if its carrier is removed mid-game", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();
    manager.pickupFlag("p1");

    manager.removePlayer("p1");

    const flags = manager.getGameState().flags!;
    const flagB = flags.find((f) => f.team === "b")!;
    expect(flagB.carrierId).toBeUndefined();
    expect(flagB.position).toEqual(TEAM_B_BASE);
  });

  it("ends the game with results based on each player's team score", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", TEAM_B_BASE)); // team a
    manager.addPlayer(makePlayer("p2", "P2", TEAM_A_BASE)); // team b
    manager.startCTFGame();

    manager.pickupFlag("p1");
    manager.updatePlayerPosition("p1", TEAM_A_BASE);
    manager.captureFlag("p1"); // team a scores 1

    const results = manager.endGame();
    expect(results).toEqual([
      { id: "p1", name: "P1", score: 1 },
      { id: "p2", name: "P2", score: 0 },
    ]);
  });
});
