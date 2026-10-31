import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installTestProbe } from "../testProbe";

interface TestProbe {
  getSnapshot: () => {
    position: { x: number; y: number; z: number } | null;
    health: number | null;
    ammo: number | null;
    score: number | null;
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
    });
    cleanup();
    expect(window.__darkmoonTest).toBeUndefined();
  });

  it("returns a snapshot copy", () => {
    const cleanup = installTestProbe(getSnapshot);
    const snap = window.__darkmoonTest?.getSnapshot();
    if (snap && snap.position) snap.position.x = 10;
    expect(window.__darkmoonTest?.getSnapshot()?.position?.x).toBe(1);
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