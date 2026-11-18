import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installTestProbe } from "../testProbe";

interface TestProbe {
  getSnapshot: () => {
    position: { x: number; y: number; z: number } | null;
    health: number | null;
    ammo: number | null;
    score: number | null;
    targets: {
      id: string;
      position: { x: number; y: number; z: number };
      health: number | null;
    }[];
  };
}

declare global {
  interface Window {
    __darkmoonTest?: TestProbe;
  }
}

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
});
