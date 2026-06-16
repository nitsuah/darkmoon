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

  it("starting CTF initializes health and maxHealth for all players", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    for (const player of manager.getPlayers().values()) {
      expect(player.health).toBe(100);
      expect(player.maxHealth).toBe(100);
    }
  });

  it("a hit during CTF reduces the target's health without affecting team scores", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    expect(manager.hitPlayer("p1", "p2", 30)).toBe(true);
    expect(manager.getPlayers().get("p2")?.health).toBe(70);
    expect(manager.getGameState().scores).toEqual({ a: 0, b: 0 });
  });

  it("a lethal hit downs the target, starts a respawn timer, and drops their carried flag", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1")); // team a
    manager.addPlayer(makePlayer("p2", "P2", TEAM_A_BASE)); // team b, picks up team a's flag

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startCTFGame();
    manager.pickupFlag("p2");
    expect(
      manager.getGameState().flags!.find((f) => f.team === "a")?.carrierId,
    ).toBe("p2");

    expect(manager.hitPlayer("p1", "p2", 1000)).toBe(true);

    const target = manager.getPlayers().get("p2")!;
    expect(target.health).toBe(0);
    expect(target.respawnAt).toBe(13000);

    const flagA = manager.getGameState().flags!.find((f) => f.team === "a")!;
    expect(flagA.carrierId).toBeUndefined();
    expect(flagA.position).toEqual(TEAM_A_BASE);
  });

  it("restores health and clears respawnAt once the CTF respawn delay elapses", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startCTFGame();
    manager.hitPlayer("p1", "p2", 1000);

    const target = manager.getPlayers().get("p2")!;
    expect(target.health).toBe(0);
    expect(target.respawnAt).toBe(13000);

    vi.spyOn(Date, "now").mockReturnValue(13001);
    manager.updateGameTimer(0.1);

    expect(target.health).toBe(target.maxHealth);
    expect(target.respawnAt).toBeUndefined();
  });

  it("rejects hits on a player who is awaiting respawn in CTF", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startCTFGame();
    manager.hitPlayer("p1", "p2", 1000); // p2 downed, awaiting respawn

    expect(manager.hitPlayer("p1", "p2", 10)).toBe(false);
  });

  it("rejects hits when no game is active", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    // Not started yet (mode = "none", isActive = false)
    expect(manager.hitPlayer("p1", "p2", 10)).toBe(false);
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

  it("a 3-kill streak in CTF triggers a streakAnnouncement", () => {
    const manager = new GameManager();
    // 4 players so p1 has multiple targets
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.addPlayer(makePlayer("p3", "P3"));
    manager.addPlayer(makePlayer("p4", "P4"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startCTFGame();

    expect(manager.getGameState().streakAnnouncement).toBeUndefined();

    manager.hitPlayer("p1", "p2", 1000);
    expect(manager.getGameState().streakAnnouncement).toBeUndefined(); // 1 kill

    vi.spyOn(Date, "now").mockReturnValue(13001); // p2 respawns
    manager.updateGameTimer(0.1);
    vi.spyOn(Date, "now").mockReturnValue(15001); // p2 spawn protection expires
    manager.updateGameTimer(0.1);

    manager.hitPlayer("p1", "p3", 1000);
    expect(manager.getGameState().streakAnnouncement).toBeUndefined(); // 2 kills

    vi.spyOn(Date, "now").mockReturnValue(20000);
    manager.hitPlayer("p1", "p4", 1000);
    expect(manager.getGameState().streakAnnouncement).toEqual({
      killerName: "P1",
      count: 3,
      timestamp: 20000,
    });
  });

  it("kill streak resets on death in CTF", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.startCTFGame();

    manager.hitPlayer("p1", "p2", 1000); // p1 streak = 1
    expect(manager.getPlayers().get("p1")?.currentKillStreak).toBe(1);

    vi.spyOn(Date, "now").mockReturnValue(13001);
    manager.updateGameTimer(0.1); // p2 respawns
    vi.spyOn(Date, "now").mockReturnValue(15001);
    manager.updateGameTimer(0.1); // spawn protection expires

    manager.hitPlayer("p2", "p1", 1000); // p2 kills p1 — p1 streak resets
    expect(manager.getPlayers().get("p1")?.currentKillStreak).toBe(0);
    expect(manager.getPlayers().get("p2")?.currentKillStreak).toBe(1);
  });

  it("rocket splash in CTF damages bystanders within radius and awards kill credit to attacker", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1", [0, 0, 0])); // attacker
    manager.addPlayer(makePlayer("p2", "P2", [3, 0, 0])); // direct target
    manager.addPlayer(makePlayer("p3", "P3", [5, 0, 0])); // bystander 2u from target → within splashRadius 5
    manager.addPlayer(makePlayer("p4", "P4", [20, 0, 0])); // far bystander → outside splash

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startCTFGame();

    // rocket: 100 dmg direct, splashRadius 5, splashDamage 50
    manager.hitPlayer("p1", "p2", 100, "rocket");

    const players = manager.getPlayers();
    expect(players.get("p2")?.health).toBe(0); // direct kill
    expect(players.get("p3")?.health).toBe(50); // splash hit (100 - 50)
    expect(players.get("p4")?.health).toBe(100); // out of range
    expect(players.get("p1")?.currentKillStreak).toBe(1); // kill credited
  });
});
