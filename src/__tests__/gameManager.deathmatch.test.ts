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

  it("rejects hits when no game is active", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    // Not started yet (mode = "none", isActive = false)
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

  it("records a kill event in the kill feed on a lethal hit", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    manager.hitPlayer("p1", "p2", 1000, "rocket");

    const { killFeed } = manager.getGameState();
    expect(killFeed).toHaveLength(1);
    expect(killFeed![0].killerId).toBe("p1");
    expect(killFeed![0].killerName).toBe("P1");
    expect(killFeed![0].targetId).toBe("p2");
    expect(killFeed![0].targetName).toBe("P2");
    expect(killFeed![0].weaponId).toBe("rocket");
  });

  it("grants spawn protection after respawn and rejects hits during that window", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();
    manager.hitPlayer("p1", "p2", 1000); // p2 downed

    // Advance past the 3-second respawn delay; onTick sets spawnProtectedUntil = now + 2000
    vi.spyOn(Date, "now").mockReturnValue(13100);
    manager.updateGameTimer(0.1);

    const p2 = manager.getPlayers().get("p2")!;
    expect(p2.health).toBe(p2.maxHealth); // respawned
    expect(p2.spawnProtectedUntil).toBe(15100); // 13100 + 2000

    // Hit during protection window is rejected
    expect(manager.hitPlayer("p1", "p2", 30)).toBe(false);
    expect(p2.health).toBe(p2.maxHealth);
  });

  it("clears spawn protection after the window elapses and allows hits again", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();
    manager.hitPlayer("p1", "p2", 1000); // p2 downed

    // Respawn
    vi.spyOn(Date, "now").mockReturnValue(13100);
    manager.updateGameTimer(0.1);

    // Advance past protection window; next tick clears spawnProtectedUntil
    vi.spyOn(Date, "now").mockReturnValue(15200);
    manager.updateGameTimer(0.1);

    const p2 = manager.getPlayers().get("p2")!;
    expect(p2.spawnProtectedUntil).toBeUndefined();

    // Hit after protection is accepted
    expect(manager.hitPlayer("p1", "p2", 30)).toBe(true);
    expect(p2.health).toBe((p2.maxHealth ?? 100) - 30);
  });

  it("clears spawnProtectedUntil for all players on game end", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();
    manager.hitPlayer("p1", "p2", 1000); // p2 downed

    vi.spyOn(Date, "now").mockReturnValue(13100);
    manager.updateGameTimer(0.1); // p2 respawns, gets protection

    manager.endGame();

    for (const player of manager.getPlayers().values()) {
      expect(player.spawnProtectedUntil).toBeUndefined();
    }
  });

  it("tracks kill streak and announces on threshold kills", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    const p1 = manager.getPlayers().get("p1")!;

    // 2 kills — no threshold yet
    manager.hitPlayer("p1", "p2", 1000);
    expect(p1.currentKillStreak).toBe(1);
    expect(manager.getGameState().streakAnnouncement).toBeUndefined();

    // Respawn p2
    manager.getPlayers().get("p2")!.respawnAt = undefined;
    manager.getPlayers().get("p2")!.health = 100;
    manager.hitPlayer("p1", "p2", 1000);
    expect(p1.currentKillStreak).toBe(2);

    // Third kill hits the threshold → announcement
    manager.getPlayers().get("p2")!.respawnAt = undefined;
    manager.getPlayers().get("p2")!.health = 100;
    manager.hitPlayer("p1", "p2", 1000);
    expect(p1.currentKillStreak).toBe(3);

    const ann = manager.getGameState().streakAnnouncement;
    expect(ann).toBeDefined();
    expect(ann!.killerName).toBe("P1");
    expect(ann!.count).toBe(3);
  });

  it("resets kill streak to 0 when a player dies", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    const p1 = manager.getPlayers().get("p1")!;
    const p2 = manager.getPlayers().get("p2")!;

    // p1 gets 2 kills
    manager.hitPlayer("p1", "p2", 1000);
    p2.respawnAt = undefined;
    p2.health = 100;
    manager.hitPlayer("p1", "p2", 1000);
    expect(p1.currentKillStreak).toBe(2);

    // p2 kills p1 — streak resets
    p2.respawnAt = undefined;
    p2.health = 100;
    manager.hitPlayer("p2", "p1", 1000);
    expect(p1.currentKillStreak).toBe(0);
  });

  it("streak announcement is cleared by onTick after the display window", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    // Force a 3-kill streak
    for (let i = 0; i < 3; i++) {
      manager.getPlayers().get("p2")!.respawnAt = undefined;
      manager.getPlayers().get("p2")!.health = 100;
      manager.hitPlayer("p1", "p2", 1000);
    }
    expect(manager.getGameState().streakAnnouncement).toBeDefined();

    // Advance past the 3-second display window
    vi.spyOn(Date, "now").mockReturnValue(13100);
    manager.updateGameTimer(0.1);
    expect(manager.getGameState().streakAnnouncement).toBeUndefined();
  });

  it("rocket splash damages bystanders within splashRadius of the target", () => {
    const manager = new GameManager();
    // p3 stands near the target (p2); p1 fires a rocket at p2
    const p3: Player = { ...makePlayer("p3", "P3"), position: [0.5, 0, 0] };
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer({ ...makePlayer("p2", "P2"), position: [0, 0, 0] });
    manager.addPlayer(p3);

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    // Rocket does 100 direct + 50 splash; p3 should lose 50 HP
    expect(manager.hitPlayer("p1", "p2", 100, "rocket")).toBe(true);

    const p3After = manager.getPlayers().get("p3")!;
    expect(p3After.health).toBe(50); // 100 - 50 splash
  });

  it("rocket splash does not damage the attacker", () => {
    const manager = new GameManager();
    // p1 stands very close to p2 (point-blank rocket)
    manager.addPlayer({ ...makePlayer("p1", "P1"), position: [0.1, 0, 0] });
    manager.addPlayer({ ...makePlayer("p2", "P2"), position: [0, 0, 0] });

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    manager.hitPlayer("p1", "p2", 100, "rocket");

    // Attacker should not take splash damage
    expect(manager.getPlayers().get("p1")!.health).toBe(100);
  });

  it("rocket splash awards kill and updates streak if bystander is lethal-hit by splash", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer({ ...makePlayer("p2", "P2"), position: [0, 0, 0] });
    // p3 is at 10HP and within splash radius
    manager.addPlayer({ ...makePlayer("p3", "P3"), position: [0.5, 0, 0] });

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame();

    // Manually set p3 health low so splash kills it
    manager.getPlayers().get("p3")!.health = 40;
    manager.getPlayers().get("p3")!.maxHealth = 100;

    manager.hitPlayer("p1", "p2", 100, "rocket"); // p2 direct kill, p3 splash kill

    const state = manager.getGameState();
    expect(state.scores["p1"]).toBe(2); // 2 kills: direct + splash
    const p1 = manager.getPlayers().get("p1")!;
    expect(p1.currentKillStreak).toBe(2);
  });

  it("grenade splash (radius 7) damages all bystanders in range and awards kills", () => {
    const makeP = (id: string, pos: [number, number, number]): Player => ({
      id,
      name: id,
      position: pos,
      rotation: [0, 0, 0],
    });

    const manager = new GameManager();
    manager.addPlayer(makeP("p1", [0, 0, 0])); // attacker
    manager.addPlayer(makeP("p2", [3, 0, 0])); // direct target
    manager.addPlayer(makeP("p3", [5, 0, 0])); // 2u from p2 → within splashRadius 7
    manager.addPlayer(makeP("p4", [20, 0, 0])); // far — out of range

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame(120, 10);

    // grenade: 100 dmg direct, splashRadius 7, splashDamage 75
    manager.hitPlayer("p1", "p2", 100, "grenade");

    const players = manager.getPlayers();
    expect(players.get("p2")?.health).toBe(0); // direct kill
    expect(players.get("p3")?.health).toBe(25); // 100 - 75 splash
    expect(players.get("p4")?.health).toBe(100); // out of range
    expect(manager.getGameState().scores["p1"]).toBe(1); // direct kill credited
  });

  it("ends the game once a player reaches the kill limit, with results sorted by kills", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startDeathmatchGame(120, 1);

    manager.hitPlayer("p1", "p2", 1000, "laser"); // p1 reaches the kill limit of 1
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
