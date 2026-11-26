import * as THREE from "three";

/**
 * Moves a shot's start onto the camera ray through the reticle: the point on
 * that ray closest to the muzzle. Shots then travel along the line the reticle
 * shows, instead of a parallel line above it (#482).
 */
export function shotOriginOnAimRay(
  muzzle: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  aimDirection: THREE.Vector3,
): THREE.Vector3 {
  const dir = aimDirection.clone().normalize();
  const along = muzzle.clone().sub(cameraPosition).dot(dir);
  return dir.multiplyScalar(along).add(cameraPosition);
}
