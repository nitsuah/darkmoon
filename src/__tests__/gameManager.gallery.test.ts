import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameManager, { type Player } from "../components/GameManager";

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
});

describe("GameManager shooting gallery", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // ── startShootingGalleryGame ────────────────────────────────────────────

  it("starts a gallery game with correct initial state", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "Player1"));

    expect(gm.startShootingGalleryGame(90)).toBe(true);

    const s = gm.getGameState();
    expect(s.mode).toBe("shooting_gallery");
    expect(s.isActive).toBe(true);
    expect(s.timeRemaining).toBe(90);
    expect(s.galleryShots).toBe(0);
    expect(s.galleryHits).toBe(0);
    expect(s.scores["p1"]).toBe(0);
  });

  it("uses 90-second default when no duration is supplied", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();
    expect(gm.getGameState().timeRemaining).toBe(90);
  });

  it("starts gallery even with no players (single-player mode, no guard needed)", () => {
    // Unlike deathmatch, gallery is a solo challenge — no player minimum required.
    const gm = new GameManager();
    expect(gm.startShootingGalleryGame()).toBe(true);
    expect(gm.getGameState().mode).toBe("shooting_gallery");
  });

  it("initialises a score entry of 0 for every registered player", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("a", "Alice"));
    gm.addPlayer(makePlayer("b", "Bob"));
    gm.startShootingGalleryGame();

    const scores = gm.getGameState().scores;
    expect(scores["a"]).toBe(0);
    expect(scores["b"]).toBe(0);
  });

  // ── recordGalleryShot ───────────────────────────────────────────────────

  it("a hit (points > 0) increments both galleryShots and galleryHits", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();

    gm.recordGalleryShot("p1", 25);

    const s = gm.getGameState();
    expect(s.galleryShots).toBe(1);
    expect(s.galleryHits).toBe(1);
    expect(s.scores["p1"]).toBe(25);
  });

  it("a miss (points = 0) increments only galleryShots", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();

    gm.recordGalleryShot("p1", 0);

    const s = gm.getGameState();
    expect(s.galleryShots).toBe(1);
    expect(s.galleryHits).toBe(0);
    expect(s.scores["p1"]).toBe(0);
  });

  it("multiple shots accumulate correctly", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();

    gm.recordGalleryShot("p1", 10); // hit
    gm.recordGalleryShot("p1", 0); // miss
    gm.recordGalleryShot("p1", 50); // hit
    gm.recordGalleryShot("p1", 25); // hit
    gm.recordGalleryShot("p1", 0); // miss

    const s = gm.getGameState();
    expect(s.galleryShots).toBe(5);
    expect(s.galleryHits).toBe(3);
    expect(s.scores["p1"]).toBe(85);
  });

  it("ignores shots recorded outside an active gallery game", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    // no game started yet
    gm.recordGalleryShot("p1", 50);

    expect(gm.getGameState().galleryShots).toBeUndefined();
  });

  it("calls onGameStateUpdate on each shot", () => {
    const cb = vi.fn();
    const gm = new GameManager();
    gm.setCallbacks({ onGameStateUpdate: cb });
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();
    cb.mockClear(); // ignore the start call

    gm.recordGalleryShot("p1", 10);
    expect(cb).toHaveBeenCalledTimes(1);
    gm.recordGalleryShot("p1", 0);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  // ── Accuracy helpers ─────────────────────────────────────────────────────

  it("computes accuracy from galleryShots and galleryHits", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "P1"));
    gm.startShootingGalleryGame();

    // 3 hits out of 5 shots = 60%
    gm.recordGalleryShot("p1", 10);
    gm.recordGalleryShot("p1", 0);
    gm.recordGalleryShot("p1", 25);
    gm.recordGalleryShot("p1", 50);
    gm.recordGalleryShot("p1", 0);

    const s = gm.getGameState();
    const acc = Math.round(
      ((s.galleryHits ?? 0) / (s.galleryShots ?? 1)) * 100,
    );
    expect(acc).toBe(60);
  });

  // ── Game results ─────────────────────────────────────────────────────────

  it("endGame returns players sorted by score descending", () => {
    const gm = new GameManager();
    gm.addPlayer(makePlayer("p1", "Alice"));
    gm.addPlayer(makePlayer("p2", "Bob"));
    gm.startShootingGalleryGame();

    gm.recordGalleryShot("p1", 10); // Alice: 10
    gm.recordGalleryShot("p2", 50); // Bob:   50
    gm.recordGalleryShot("p1", 25); // Alice: 35

    const results = gm.endGame();
    expect(results[0].id).toBe("p2"); // Bob wins
    expect(results[0].score).toBe(50);
    expect(results[1].id).toBe("p1"); // Alice second
    expect(results[1].score).toBe(35);
  });
});
