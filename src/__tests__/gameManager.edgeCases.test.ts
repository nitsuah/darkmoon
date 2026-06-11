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

describe("GameManager edge cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows a freshly-tagged IT player to tag a different player immediately", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.addPlayer(makePlayer("p3", "P3"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame(60);

    const itId = manager.getGameState().itPlayerId!; // "p1"
    const [target, third] = ["p1", "p2", "p3"].filter((id) => id !== itId);

    // p1 tags p2 - p2 is now IT
    expect(manager.tagPlayer(itId, target)).toBe(true);

    // p2 (freshly IT) immediately tags p3 (an uninvolved player) - should
    // succeed without waiting out the tag-back cooldown.
    vi.spyOn(Date, "now").mockReturnValue(10100);
    expect(manager.tagPlayer(target, third)).toBe(true);
    expect(manager.getGameState().itPlayerId).toBe(third);
  });

  it("blocks an immediate tag-back of your tagger, then allows it once the cooldown elapses", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));
    manager.addPlayer(makePlayer("p3", "P3"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame(60);

    const itId = manager.getGameState().itPlayerId!; // "p1"
    const [target] = ["p1", "p2", "p3"].filter((id) => id !== itId);

    // p1 tags target - target is now IT and was tagged by p1
    expect(manager.tagPlayer(itId, target)).toBe(true);

    // Immediately tagging back p1 (the tagger) should be blocked
    vi.spyOn(Date, "now").mockReturnValue(10100);
    expect(manager.tagPlayer(target, itId)).toBe(false);
    expect(manager.getGameState().itPlayerId).toBe(target);

    // Once the tag-back cooldown (2000ms) has elapsed, the tag-back succeeds
    vi.spyOn(Date, "now").mockReturnValue(12001);
    expect(manager.tagPlayer(target, itId)).toBe(true);
    expect(manager.getGameState().itPlayerId).toBe(itId);
  });

  it("rejects self-tag attempts", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.startTagGame(60);

    const itId = manager.getGameState().itPlayerId!;
    expect(manager.tagPlayer(itId, itId)).toBe(false);
  });

  it("never awards a negative score even when timeAsIt exceeds MAX_TAG_SCORE", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Date, "now").mockReturnValue(0);
    manager.startTagGame(60);

    const itId = manager.getGameState().itPlayerId!;
    const otherId = itId === "p1" ? "p2" : "p1";

    // Simulate a very slow tag, well past MAX_TAG_SCORE seconds
    vi.spyOn(Date, "now").mockReturnValue(400000);
    expect(manager.tagPlayer(itId, otherId)).toBe(true);
    expect(manager.getGameState().scores[itId]).toBeGreaterThanOrEqual(0);
  });

  it("endGame is safe to call when the game was never started", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));

    const results = manager.endGame();
    expect(results).toEqual([{ id: "p1", name: "P1", score: 0 }]);
    expect(manager.getGameState().isActive).toBe(false);
  });

  it("endGame is safe to call with no players", () => {
    const manager = new GameManager();
    expect(manager.endGame()).toEqual([]);
  });

  it("resets game state when the last player is removed during an active game", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    manager.startTagGame(60);

    manager.removePlayer("p1");
    manager.removePlayer("p2");

    const state = manager.getGameState();
    expect(state.isActive).toBe(false);
    expect(state.itPlayerId).toBeUndefined();
    expect(state.mode).toBe("none");
  });

  it("resets lastTagTime and lastTaggedById when restarting mid-game", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", "P1"));
    manager.addPlayer(makePlayer("p2", "P2"));

    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(Date, "now").mockReturnValue(1000);
    manager.startTagGame(60);

    const itId = manager.getGameState().itPlayerId!;
    const otherId = itId === "p1" ? "p2" : "p1";
    manager.tagPlayer(itId, otherId);

    // Restart mid-game
    manager.startTagGame(60);

    for (const player of manager.getPlayers().values()) {
      expect(player.lastTagTime).toBeUndefined();
      expect(player.lastTaggedById).toBeUndefined();
    }
  });
});
