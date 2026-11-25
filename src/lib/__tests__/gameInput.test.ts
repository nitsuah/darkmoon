import { describe, it, expect, beforeEach } from "vitest";
import * as gameInput from "../gameInput";

beforeEach(() => {
  gameInput.resetTransientInput();
  gameInput.resetTestControl();
});

describe("resetTransientInput", () => {
  it("zeroes mouseMovement, cameraZoom and weaponScrollInput", () => {
    gameInput.mouseMovement.dx = 5;
    gameInput.mouseMovement.dy = -3;
    gameInput.cameraZoom.delta = 2;
    gameInput.weaponScrollInput.direction = 1;

    gameInput.resetTransientInput();

    expect(gameInput.mouseMovement.dx).toBe(0);
    expect(gameInput.mouseMovement.dy).toBe(0);
    expect(gameInput.cameraZoom.delta).toBe(0);
    expect(gameInput.weaponScrollInput.direction).toBe(0);
  });

  it("sets pointerLocked back to false", () => {
    gameInput.setPointerLocked(true);

    gameInput.resetTransientInput();

    expect(gameInput.pointerLocked).toBe(false);
  });

  it("does not change isMobile", () => {
    gameInput.setIsMobile(true);

    gameInput.resetTransientInput();

    expect(gameInput.isMobile).toBe(true);

    gameInput.setIsMobile(false);
  });
});

describe("resetTestControl", () => {
  it("restores all defaults", () => {
    gameInput.testControl.aimPoint = () => ({ x: 1, y: 2, z: 3 });
    gameInput.testControl.equip = "shotgun";
    gameInput.testControl.fire = true;
    gameInput.testControl.botsFrozen = true;
    gameInput.testControl.pickupsDisabled = true;
    gameInput.testControl.camera = {} as import("three").Camera;

    gameInput.resetTestControl();

    expect(gameInput.testControl.aimPoint).toBeNull();
    expect(gameInput.testControl.equip).toBeNull();
    expect(gameInput.testControl.fire).toBe(false);
    expect(gameInput.testControl.botsFrozen).toBe(false);
    expect(gameInput.testControl.pickupsDisabled).toBe(false);
    expect(gameInput.testControl.camera).toBeNull();
  });
});