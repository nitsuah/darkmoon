import { describe, test, expect } from "vitest";
import {
  computeDirection,
  computeSpeed,
  computeFacingYaw,
} from "../usePlayerMovement";
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
    const dir = computeDirection(
      cam,
      { x: 0, y: 0 },
      { W: false, S: false, Q: false, E: false },
      true
    );
    expect(dir.length()).toBeGreaterThan(0);
  });

  test("computeFacingYaw follows camera yaw while aiming", () => {
    const direction = new THREE.Vector3(1, 0, 0);
    const facing = computeFacingYaw(direction, Math.PI / 3, true, 0);
    expect(facing).toBeCloseTo(Math.PI / 3);
  });

  test("computeFacingYaw follows movement direction when not aiming", () => {
    const direction = new THREE.Vector3(1, 0, 0);
    const facing = computeFacingYaw(direction, 0, false, 0);
    expect(facing).toBeCloseTo(Math.PI / 2);
  });

  test("computeFacingYaw keeps current yaw with no movement", () => {
    const direction = new THREE.Vector3(0, 0, 0);
    const facing = computeFacingYaw(direction, 0.7, false, 1.1);
    expect(facing).toBeCloseTo(1.1);
  });
});
