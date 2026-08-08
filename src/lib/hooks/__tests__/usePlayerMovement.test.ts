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
      true,
    );
    expect(dir.length()).toBeGreaterThan(0);
  });

  test("computeFacingYaw always returns camera yaw (strafe-independent)", () => {
    const direction = new THREE.Vector3(1, 0, 0);
    const facing = computeFacingYaw(direction, Math.PI / 3);
    expect(facing).toBeCloseTo(Math.PI / 3);
  });

  test("computeFacingYaw returns camera yaw even when strafing sideways", () => {
    const direction = new THREE.Vector3(1, 0, 0);
    const facing = computeFacingYaw(direction, 0);
    expect(facing).toBeCloseTo(0);
  });

  test("computeFacingYaw returns camera yaw with no movement", () => {
    const direction = new THREE.Vector3(0, 0, 0);
    const facing = computeFacingYaw(direction, 0.7);
    expect(facing).toBeCloseTo(0.7);
  });

  test("A key strafes left relative to camera facing -Z", () => {
    const dir = computeDirection(
      0,
      { x: 0, y: 0 },
      { a: true, w: false, s: false, d: false, q: false, e: false },
      false,
    );
    expect(dir.length()).toBeCloseTo(1);
    // camera=0: right=(1,0,0), A subtracts right → direction.x < 0
    expect(dir.x).toBeLessThan(0);
    expect(dir.z).toBeCloseTo(0);
  });

  test("D key strafes right relative to camera facing -Z", () => {
    const dir = computeDirection(
      0,
      { x: 0, y: 0 },
      { d: true, w: false, a: false, s: false, q: false, e: false },
      false,
    );
    expect(dir.length()).toBeCloseTo(1);
    // camera=0: right=(1,0,0), D adds right → direction.x > 0
    expect(dir.x).toBeGreaterThan(0);
    expect(dir.z).toBeCloseTo(0);
  });

  test("A key strafes camera-relative at 90° rotation", () => {
    const cam = Math.PI / 2;
    const dir = computeDirection(
      cam,
      { x: 0, y: 0 },
      { a: true, w: false, s: false, d: false, q: false, e: false },
      false,
    );
    expect(dir.length()).toBeCloseTo(1);
    // camera=PI/2: right=(0,0,-1), A subtracts right → direction.z > 0
    expect(dir.z).toBeGreaterThan(0);
    expect(dir.x).toBeCloseTo(0);
  });
});
