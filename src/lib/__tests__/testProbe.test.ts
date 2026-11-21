import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installTestProbe } from "../testProbe";
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

const mockSnapshot = {
  position: { x: 1, y: 2, z: 3 },
  health: 100,
  ammo: 50,
  score: 0,
  targets: [{ id: "bot-1", position: { x: 4, y: 5, z: 6 }, health: 80 }],
};

const getSnapshot = vi.fn(() => mockSnapshot);

beforeEach(() => {
  vi.stubGlobal("window", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("installTestProbe", () => {
  it("returns a no-op cleanup function when disabled", () => {
    const cleanup = installTestProbe(getSnapshot, false);
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
    expect(window.__darkmoonTest).toBeUndefined();
  });

  it("returns a no-op cleanup function when window is undefined", () => {
    vi.unstubAllGlobals();
    const cleanup = installTestProbe(getSnapshot);
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });

  it("installs a test probe when enabled and window is defined", () => {
    const cleanup = installTestProbe(getSnapshot);
    expect(window.__darkmoonTest).toBeDefined();
    expect(window.__darkmoonTest?.getSnapshot()).toEqual({
      position: { x: 1, y: 2, z: 3 },
      health: 100,
      ammo: 50,
      score: 0,
      targets: [{ id: "bot-1", position: { x: 4, y: 5, z: 6 }, health: 80 }],
    });
    cleanup();
    expect(window.__darkmoonTest).toBeUndefined();
  });

  it("returns a snapshot copy", () => {
    const cleanup = installTestProbe(getSnapshot);
    const snap = window.__darkmoonTest?.getSnapshot();
    if (snap && snap.position) snap.position.x = 10;
    if (snap?.targets[0]) {
      snap.targets[0].id = "mutated";
      snap.targets[0].position.x = 99;
    }
    const next = window.__darkmoonTest?.getSnapshot();
    expect(next?.position?.x).toBe(1);
    expect(next?.targets).toEqual([
      { id: "bot-1", position: { x: 4, y: 5, z: 6 }, health: 80 },
    ]);
    cleanup();
  });

  it("cleans up only its own probe instance", () => {
    const cleanup1 = installTestProbe(getSnapshot);
    const cleanup2 = installTestProbe(getSnapshot);
    cleanup1();
    expect(window.__darkmoonTest).toBeDefined();
    cleanup2();
    expect(window.__darkmoonTest).toBeUndefined();
  });

  describe("aimAt", () => {
    it("is installed on the probe when enabled", () => {
      const cleanup = installTestProbe(getSnapshot);
      expect(typeof window.__darkmoonTest?.aimAt).toBe("function");
      cleanup();
    });

    it("calculates correct yaw and pitch to face target", () => {
      const cleanup = installTestProbe(getSnapshot);

      // Capture console.log to verify the calculated values
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
      };

      window.__darkmoonTest?.aimAt("bot-1");

      console.log = originalLog;

      // Verify the log contains the expected yaw/pitch calculation
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("Setting camera orientation:");
      expect(logs[0]).toContain("yaw=");
      expect(logs[0]).toContain("pitch=");

      cleanup();
    });

    it("does nothing when target not found", () => {
      const cleanup = installTestProbe(getSnapshot);

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
      };

      // Try to aim at non-existent target
      window.__darkmoonTest?.aimAt("non-existent");

      console.log = originalLog;

      // Should not log anything since target not found
      expect(logs.length).toBe(0);

      cleanup();
    });

    it("works with createSoloProbeSnapshot targets", () => {
      // Use the real createSoloProbeSnapshot to generate a snapshot
      const players = [
        player({ id: "self" }),
        player({ id: "bot-1", position: [10, 0, 10], health: 100 }),
      ];
      const snapshot = createSoloProbeSnapshot([0, 0, 0], "self", manager(players));

      const getSnapshotFn = vi.fn(() => snapshot);
      const cleanup = installTestProbe(getSnapshotFn);

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
      };

      window.__darkmoonTest?.aimAt("bot-1");

      console.log = originalLog;

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain("Setting camera orientation:");

      cleanup();
    });
  });
});