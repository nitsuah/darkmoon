import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installTestProbe } from "../testProbe";
import { testControl, resetTestControl } from "../gameInput";

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
  resetTestControl();
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

describe("test probe controls (#497)", () => {
  it("aimAt returns false for an unknown target and leaves aim unset", () => {
    const cleanup = installTestProbe(getSnapshot, true);
    expect(window.__darkmoonTest?.aimAt("nobody")).toBe(false);
    expect(testControl.aimPoint).toBeNull();
    cleanup();
  });

  it("aimAt tracks the target's live position every frame", () => {
    let x = 4;
    const live = () => ({
      ...mockSnapshot,
      targets: [{ id: "bot-1", position: { x, y: 5, z: 6 }, health: 80 }],
    });
    const cleanup = installTestProbe(live, true);
    expect(window.__darkmoonTest?.aimAt("bot-1")).toBe(true);
    expect(testControl.aimPoint?.()).toEqual({ x: 4, y: 5, z: 6 });
    x = 9;
    expect(testControl.aimPoint?.()).toEqual({ x: 9, y: 5, z: 6 });
    cleanup();
  });

  it("aimAtPoint copies the point, and clearAim removes the aim", () => {
    const cleanup = installTestProbe(getSnapshot, true);
    const point = { x: 1, y: 2, z: 3 };
    window.__darkmoonTest?.aimAtPoint(point);
    point.x = 99;
    expect(testControl.aimPoint?.()).toEqual({ x: 1, y: 2, z: 3 });
    window.__darkmoonTest?.clearAim();
    expect(testControl.aimPoint).toBeNull();
    cleanup();
  });

  it("setLoadout, fire and freezeBots set the one-shot controls", () => {
    const cleanup = installTestProbe(getSnapshot, true);
    window.__darkmoonTest?.setLoadout("smg");
    window.__darkmoonTest?.fire();
    window.__darkmoonTest?.freezeBots(true);
    expect(testControl).toMatchObject({ equip: "smg", fire: true, botsFrozen: true });
    cleanup();
  });

  it("placeTarget delegates to the game action, or returns false without one", () => {
    const placeTarget = vi.fn(() => true);
    const cleanup = installTestProbe(getSnapshot, true, { placeTarget });
    expect(window.__darkmoonTest?.placeTarget("bot-1", { x: 0, y: 1, z: 2 })).toBe(true);
    expect(placeTarget).toHaveBeenCalledWith("bot-1", { x: 0, y: 1, z: 2 });
    cleanup();

    const cleanupBare = installTestProbe(getSnapshot, true);
    expect(window.__darkmoonTest?.placeTarget("bot-1", { x: 0, y: 1, z: 2 })).toBe(false);
    cleanupBare();
  });

  it("cleanup resets every control so nothing leaks past the probe", () => {
    const cleanup = installTestProbe(getSnapshot, true);
    window.__darkmoonTest?.aimAt("bot-1");
    window.__darkmoonTest?.setLoadout("smg");
    window.__darkmoonTest?.fire();
    window.__darkmoonTest?.freezeBots(true);
    cleanup();
    expect(testControl).toEqual({ aimPoint: null, equip: null, fire: false, botsFrozen: false });
  });

  it("disabled probe never touches the controls", () => {
    installTestProbe(getSnapshot, false);
    expect(window.__darkmoonTest).toBeUndefined();
    expect(testControl.botsFrozen).toBe(false);
  });
});
