import * as THREE from "three";

export interface KeysMap {
  [key: string]: boolean;
}

export interface JoystickInput {
  x: number;
  y: number;
}

/**
 * Compute a movement direction Vector3 based on camera horizontal rotation,
 * keyboard keys (W/A/S/D/Q/E), joystick input and whether both mouse buttons
 * (auto-run) are active. This mirrors the logic used in PlayerCharacter.
 */
export function computeDirection(
  cameraHorizontal: number,
  joystick: JoystickInput,
  keysPressed: KeysMap,
  bothMouseButtons: boolean
): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, 0);

  const forward = new THREE.Vector3(
    -Math.sin(cameraHorizontal),
    0,
    -Math.cos(cameraHorizontal)
  );
  const right = new THREE.Vector3(
    Math.cos(cameraHorizontal),
    0,
    -Math.sin(cameraHorizontal)
  );

  if (bothMouseButtons) {
    direction.add(forward);
  }

  if (keysPressed["W"]) direction.add(forward);
  if (keysPressed["S"]) direction.sub(forward);
  if (keysPressed["Q"]) direction.sub(right);
  if (keysPressed["E"]) direction.add(right);

  const hasJoystickInput = joystick.x !== 0 || joystick.y !== 0;
  if (hasJoystickInput) {
    // NOTE: keep the original sign convention from PlayerCharacter: joystick.y
    // is inverted when applied to forward.
    direction.add(forward.clone().multiplyScalar(-joystick.y));
    direction.add(right.clone().multiplyScalar(joystick.x));
  }

  if (direction.length() > 0) direction.normalize();

  return direction;
}

/**
 * Compute movement speed given whether jetpack is active and the shift (sprint) key.
 */
export function computeSpeed(jetpackActive: boolean, shiftPressed: boolean) {
  if (jetpackActive) return 1.5;
  return shiftPressed ? 5 : 2;
}

export default function usePlayerMovement() {
  // This module currently exports pure helpers; the default export is a small
  // object to make imports ergonomic if a hook shape is preferred later.
  return { computeDirection, computeSpeed };
}
