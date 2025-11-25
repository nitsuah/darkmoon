import * as THREE from "three";

export interface CollisionSystem {
  checkCollision: (
    current: THREE.Vector3,
    next: THREE.Vector3
  ) => THREE.Vector3;
  checkPlayerCollision: (a: THREE.Vector3, b: THREE.Vector3) => boolean;
}

/**
 * Small wrapper around collision operations so they can be unit tested
 * independently of the PlayerCharacter component.
 */
export function resolveMovement(
  collisionSystem: CollisionSystem,
  currentPosition: THREE.Vector3,
  desiredPosition: THREE.Vector3
): THREE.Vector3 {
  return collisionSystem.checkCollision(currentPosition, desiredPosition);
}

export function detectPlayerCollision(
  collisionSystem: CollisionSystem,
  a: THREE.Vector3,
  b: THREE.Vector3
): boolean {
  return collisionSystem.checkPlayerCollision(a, b);
}

export default function usePlayerCollision() {
  return { resolveMovement, detectPlayerCollision };
}
