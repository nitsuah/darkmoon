import { describe, it, expect, vi } from "vitest";
import { createSoloProbeSnapshot } from "../soloProbeSnapshot";
import type { GameState, Player } from "../../components/GameManager";

const player = (overrides: Partial<Player> = {}): Player => ({
  id: "player",
  name: "Player",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  ...overrides,
});

const manager = (players: Player[]) => ({
  getGameState: vi.fn(
    () =>
      ({
        mode: "solo",
        isActive: true,
        timeRemaining: 0,
        scores: { self: 7 },
      }) as GameState,
  ),
  getPlayers: vi.fn(
    () =>
      new Map<string, Player>(
        players.map((item): [string, Player] => [item.id, item]),
      ),
  ),
});

describe("createSoloProbeSnapshot targets", () => {
  it("excludes self and includes other players with health", () => {
    const snapshot = createSoloProbeSnapshot(
      [0, 1, 2],
      "self",
      manager([player({ id: "self" }), player({ id: "bot-1", position: [3, 4, 5], health: 65 })]),
    );
    expect(snapshot.targets).toEqual([
      { id: "bot-1", position: { x: 3, y: 4, z: 5 }, health: 65 },
    ]);
  });

  it("uses null health when a target has no health value", () => {
    const snapshot = createSoloProbeSnapshot(
      [0, 0, 0],
      "self",
      manager([player({ id: "self" }), player({ id: "bot" })]),
    );
    expect(snapshot.targets).toEqual([
      { id: "bot", position: { x: 0, y: 0, z: 0 }, health: null },
    ]);
  });

  it("skips targets with non-finite positions", () => {
    const snapshot = createSoloProbeSnapshot(
      [0, 0, 0],
      "self",
      manager([
        player({ id: "self" }),
        player({ id: "bad", position: [Number.NaN, 1, 2] }),
        player({ id: "good", position: [1, 2, 3] }),
      ]),
    );
    expect(snapshot.targets.map((target) => target.id)).toEqual(["good"]);
  });

  it("returns no targets without a manager or current player id", () => {
    expect(createSoloProbeSnapshot([0, 0, 0], "self", null).targets).toEqual([]);
    expect(createSoloProbeSnapshot([0, 0, 0], undefined, manager([player()])).targets).toEqual([]);
  });

  it("sorts targets by id for deterministic snapshots", () => {
    const snapshot = createSoloProbeSnapshot(
      [0, 0, 0],
      "self",
      manager([
        player({ id: "self" }),
        player({ id: "zeta" }),
        player({ id: "alpha" }),
        player({ id: "beta" }),
      ]),
    );
    expect(snapshot.targets.map((target) => target.id)).toEqual([
      "alpha",
      "beta",
      "zeta",
    ]);
  });

  it("returns target and position objects that do not alias live players", () => {
    const bot = player({ id: "bot", position: [7, 8, 9], health: 50 });
    const snapshot = createSoloProbeSnapshot(
      [0, 0, 0],
      "self",
      manager([player({ id: "self" }), bot]),
    );
    snapshot.targets[0].position.x = 99;
    snapshot.targets[0].id = "mutated";
    expect(bot.position).toEqual([7, 8, 9]);
    expect(bot.id).toBe("bot");
  });
});
