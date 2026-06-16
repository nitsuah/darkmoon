import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameManager, { type Player } from "../components/GameManager";

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  isIt: false,
  timeAsIt: 0,
});

describe("GameManager core", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updatePlayerPosition syncs position without firing update callbacks", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));

    const onPlayerUpdate = vi.fn();
    manager.setCallbacks({ onPlayerUpdate });

    manager.updatePlayerPosition("p1", [1, 2, 3]);
    expect(manager.getPlayers().get("p1")?.position).toEqual([1, 2, 3]);
    expect(onPlayerUpdate).not.toHaveBeenCalled();

    // Unknown player is a safe no-op
    manager.updatePlayerPosition("ghost", [9, 9, 9]);
  });

  it("blocks tag game start with exactly one player", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));

    expect(manager.startTagGame()).toBe(false);
  });

  it("uses dynamic duration for >2 players", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));
    manager.addPlayer(makePlayer("p3", "Player 3"));

    vi.spyOn(Math, "random").mockReturnValue(0);

    const started = manager.startTagGame();
    expect(started).toBe(true);
    // 60 + (3-2)*60
    expect(manager.getGameState().timeRemaining).toBe(120);
  });

  it("reassigns IT when current IT leaves", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.startTagGame(60);

    const currentIt = manager.getGameState().itPlayerId!;
    manager.removePlayer(currentIt);

    expect(manager.getGameState().itPlayerId).toBeDefined();
    expect(manager.getPlayers().has(currentIt)).toBe(false);
  });

  it("rejects invalid tag attempts and enforces cooldown", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame(60);

    // inactive mode path
    manager.endGame();
    expect(manager.tagPlayer("p1", "p2")).toBe(false);

    // active mode path
    manager.startTagGame(60);
    const itId = manager.getGameState().itPlayerId!;
    const otherId = itId === "p1" ? "p2" : "p1";

    vi.spyOn(Date, "now").mockReturnValue(12000);
    expect(manager.tagPlayer(itId, otherId)).toBe(true);

    // immediate tag back should fail due freeze/cooldown
    vi.spyOn(Date, "now").mockReturnValue(12100);
    expect(manager.tagPlayer(otherId, itId)).toBe(false);
  });

  it("updates timer and ends game at zero", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.startTagGame(1);

    manager.updateGameTimer(0.5);
    expect(manager.getGameState().isActive).toBe(true);

    manager.updateGameTimer(1);
    expect(manager.getGameState().isActive).toBe(false);
    expect(manager.getGameState().timeRemaining).toBe(0);
  });

  it("laser-tag: a hit from the IT player transfers IT status (ranged tag)", () => {
    vi.spyOn(Date, "now").mockReturnValue(0);
    vi.spyOn(Math, "random").mockReturnValue(0); // p1 becomes IT

    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));
    manager.startTagGame(60);

    expect(manager.getPlayers().get("p1")?.isIt).toBe(true);

    // p1 (IT) fires laser and hits p2
    vi.spyOn(Date, "now").mockReturnValue(5000);
    const result = manager.hitPlayer("p1", "p2", 10, "laser");

    expect(result).toBe(true);
    expect(manager.getPlayers().get("p1")?.isIt).toBe(false);
    expect(manager.getPlayers().get("p2")?.isIt).toBe(true);
    expect(manager.getGameState().itPlayerId).toBe("p2");
    // No health damage in tag mode
    expect(manager.getPlayers().get("p2")?.health).toBeUndefined();
  });

  it("laser-tag: a hit from a non-IT player does nothing in tag mode", () => {
    vi.spyOn(Date, "now").mockReturnValue(0);
    vi.spyOn(Math, "random").mockReturnValue(0); // p1 becomes IT

    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "Player 1"));
    manager.addPlayer(makePlayer("p2", "Player 2"));
    manager.startTagGame(60);

    // p2 (not IT) fires at p1 — should not transfer IT
    const result = manager.hitPlayer("p2", "p1", 10, "laser");

    expect(result).toBe(false);
    expect(manager.getPlayers().get("p1")?.isIt).toBe(true);
    expect(manager.getPlayers().get("p2")?.isIt).toBe(false);
  });
});
