import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameManager, { type Player } from "../components/GameManager";

// Regression coverage for the Tag-mode rocket/grenade splash-damage fix:
// DeathmatchMode and CTFMode already applied splashRadius/splashDamage to
// bystanders, but TagMode — the only mode live in solo play — silently
// dropped it, so the rocket launcher's headline AOE never worked in the
// shipped game. See src/components/gameModes/TagMode.ts.

const makePlayer = (
  id: string,
  position: [number, number, number] = [0, 0, 0],
): Player => ({
  id,
  name: id,
  position,
  rotation: [0, 0, 0],
});

/**
 * TagMode.onStart picks a random player as IT. When the attacker in these
 * tests happens to be IT, `hitPlayer` takes the instant-tag-transfer branch
 * instead of dealing damage, which would make the assertions below flaky.
 * Force the attacker off IT duty so every test deterministically exercises
 * the "normal damage" (and therefore splash) path.
 */
function forceNotIt(manager: GameManager, playerId: string) {
  const player = manager.getPlayers().get(playerId)!;
  player.isIt = false;
  const state = manager.getGameState();
  if (state.itPlayerId === playerId) {
    const other = Array.from(manager.getPlayers().keys()).find(
      (id) => id !== playerId,
    );
    if (other) {
      manager.getPlayers().get(other)!.isIt = true;
      state.itPlayerId = other;
    }
  }
}

describe("GameManager tag mode splash damage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rocket splash damages bystanders within splashRadius of the target in tag mode", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1"));
    manager.addPlayer(makePlayer("p2", [0, 0, 0]));
    // p3 stands near the direct target (p2), well within the rocket's splashRadius of 5
    manager.addPlayer(makePlayer("p3", [0.5, 0, 0]));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame();
    forceNotIt(manager, "p1");

    // Rocket does 100 direct + 50 splash; p3 should lose 50 HP even though
    // only p2 was directly hit.
    expect(manager.hitPlayer("p1", "p2", 100, "rocket")).toBe(true);

    const p3After = manager.getPlayers().get("p3")!;
    expect(p3After.health).toBe(50);
  });

  it("rocket splash does not damage the attacker or the direct target twice", () => {
    const manager = new GameManager();
    // p1 stands very close to p2 (point-blank rocket)
    manager.addPlayer(makePlayer("p1", [0.1, 0, 0]));
    manager.addPlayer(makePlayer("p2", [0, 0, 0]));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame();
    forceNotIt(manager, "p1");

    manager.hitPlayer("p1", "p2", 100, "rocket");

    expect(manager.getPlayers().get("p1")!.health).toBe(100);
    expect(manager.getPlayers().get("p2")!.health).toBe(0);
  });

  it("grenade splash (radius 7) damages bystanders in range but not those out of range", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1", [0, 0, 0])); // attacker
    manager.addPlayer(makePlayer("p2", [3, 0, 0])); // direct target
    manager.addPlayer(makePlayer("p3", [5, 0, 0])); // 2u from p2 — within splashRadius 7
    manager.addPlayer(makePlayer("p4", [20, 0, 0])); // far — out of range

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame();
    forceNotIt(manager, "p1");

    manager.hitPlayer("p1", "p2", 100, "grenade");

    const players = manager.getPlayers();
    expect(players.get("p2")?.health).toBe(0); // direct hit, killed
    expect(players.get("p3")?.health).toBe(25); // 100 - 75 splash
    expect(players.get("p4")?.health).toBe(100); // out of range, untouched
  });

  it("a bystander killed by splash respawns and generates a kill-feed entry", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1"));
    manager.addPlayer(makePlayer("p2", [0, 0, 0]));
    manager.addPlayer(makePlayer("p3", [0.5, 0, 0]));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame();
    forceNotIt(manager, "p1");

    // Weaken p3 so the 50-damage splash is lethal.
    manager.getPlayers().get("p3")!.health = 40;

    manager.hitPlayer("p1", "p2", 100, "rocket");

    const p3After = manager.getPlayers().get("p3")!;
    expect(p3After.health).toBe(0);
    expect(p3After.respawnAt).toBeDefined();

    const killFeed = manager.getGameState().killFeed;
    expect(
      killFeed?.some((k) => k.targetId === "p3" && k.killerId === "p1"),
    ).toBe(true);
  });

  it("splash does not damage a spawn-protected bystander", () => {
    const manager = new GameManager();
    manager.addPlayer(makePlayer("p1"));
    manager.addPlayer(makePlayer("p2", [0, 0, 0]));
    manager.addPlayer(makePlayer("p3", [0.5, 0, 0]));

    vi.spyOn(Date, "now").mockReturnValue(10000);
    manager.startTagGame();
    forceNotIt(manager, "p1");

    manager.getPlayers().get("p3")!.spawnProtectedUntil = 15000;

    manager.hitPlayer("p1", "p2", 100, "rocket");

    expect(manager.getPlayers().get("p3")!.health).toBe(100);
  });
});
