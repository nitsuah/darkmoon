import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { CharacterControls } from "../characterControls";

const makeAction = () => ({
  play: vi.fn(),
  fadeOut: vi.fn(),
  reset: vi.fn().mockReturnThis(),
  fadeIn: vi.fn().mockReturnThis(),
});

describe("CharacterControls", () => {
  it("initializes with current action and toggles run", () => {
    const model = new THREE.Group();
    const mixer = { update: vi.fn() } as unknown as THREE.AnimationMixer;
    const idle = makeAction();
    const walk = makeAction();
    const run = makeAction();

    const actions = new Map<string, unknown>([
      ["Idle", idle],
      ["Walk", walk],
      ["Run", run],
    ]) as unknown as Map<string, THREE.AnimationAction>;

    const orbit = {
      target: new THREE.Vector3(),
    } as unknown as import("three/examples/jsm/controls/OrbitControls").OrbitControls;
    const camera = new THREE.PerspectiveCamera();

    const controls = new CharacterControls(
      model,
      mixer,
      actions,
      orbit,
      camera,
      "Idle",
    );

    expect(idle.play).toHaveBeenCalled();
    expect(controls.toggleRun).toBe(true);
    controls.switchRunToggle();
    expect(controls.toggleRun).toBe(false);
  });

  it("switches between run/walk/idle and updates movement", () => {
    const model = new THREE.Group();
    model.position.set(0, 0, 0);

    const mixer = { update: vi.fn() } as unknown as THREE.AnimationMixer;
    const idle = makeAction();
    const walk = makeAction();
    const run = makeAction();

    const actions = new Map<string, unknown>([
      ["Idle", idle],
      ["Walk", walk],
      ["Run", run],
    ]) as unknown as Map<string, THREE.AnimationAction>;

    const orbit = {
      target: new THREE.Vector3(),
    } as unknown as import("three/examples/jsm/controls/OrbitControls").OrbitControls;
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1, 5);

    const controls = new CharacterControls(
      model,
      mixer,
      actions,
      orbit,
      camera,
      "Idle",
    );

    controls.update(0.016, { w: true });
    expect(run.reset).toHaveBeenCalled();
    expect(run.play).toHaveBeenCalled();
    expect(mixer.update).toHaveBeenCalled();
    expect(model.position.length()).toBeGreaterThan(0);

    controls.switchRunToggle();
    controls.update(0.016, { w: true, a: true });
    expect(walk.reset).toHaveBeenCalled();

    controls.update(0.016, {});
    expect(idle.reset).toHaveBeenCalled();
  });

  it("handles all direction combinations without throwing", () => {
    const model = new THREE.Group();
    const mixer = { update: vi.fn() } as unknown as THREE.AnimationMixer;
    const idle = makeAction();
    const walk = makeAction();
    const run = makeAction();

    const actions = new Map<string, unknown>([
      ["Idle", idle],
      ["Walk", walk],
      ["Run", run],
    ]) as unknown as Map<string, THREE.AnimationAction>;

    const orbit = {
      target: new THREE.Vector3(),
    } as unknown as import("three/examples/jsm/controls/OrbitControls").OrbitControls;
    const camera = new THREE.PerspectiveCamera();

    const controls = new CharacterControls(
      model,
      mixer,
      actions,
      orbit,
      camera,
      "Idle",
    );

    const inputs = [
      { w: true, a: true },
      { w: true, d: true },
      { s: true, a: true },
      { s: true, d: true },
      { s: true },
      { a: true },
      { d: true },
    ];

    for (const keyMap of inputs) {
      expect(() => controls.update(0.016, keyMap)).not.toThrow();
    }
  });
});
