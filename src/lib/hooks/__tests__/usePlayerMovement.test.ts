import { computeDirection, computeSpeed } from "../usePlayerMovement";
import * as THREE from "three";

describe("usePlayerMovement helpers", () => {
  test("computeSpeed returns jetpack speed when active", () => {
    expect(computeSpeed(true, false)).toBeCloseTo(1.5);
  });

  test("computeSpeed returns sprint speed when shift pressed", () => {
    expect(computeSpeed(false, true)).toBe(5);
  });

  test("computeSpeed returns walk speed by default", () => {
    expect(computeSpeed(false, false)).toBe(2);
  });

  test("computeDirection combines keyboard and joystick inputs", () => {
    const cam = 0; // facing -Z
    const joystick = { x: 0.5, y: -0.5 };
    const keys = { W: true, S: false, Q: false, E: false };

    const dir = computeDirection(cam, joystick, keys, false);
    // direction should be a normalized vector
    expect(dir).toBeInstanceOf(THREE.Vector3);
    expect(dir.length()).toBeGreaterThan(0);
    // forward (-Z) component should be negative when W is pressed
    expect(dir.z).toBeLessThanOrEqual(0.001);
  });

  test("computeDirection respects bothMouseButtons auto-run", () => {
    const cam = Math.PI / 4; // 45 deg
    const dir = computeDirection(cam, { x: 0, y: 0 }, { W: false, S: false, Q: false, E: false }, true);
    expect(dir.length()).toBeGreaterThan(0);
  });
});
