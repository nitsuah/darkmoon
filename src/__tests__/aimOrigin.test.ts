import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { shotOriginOnAimRay } from "../lib/aimOrigin";

// The default follow camera: it looks at the player + 0.5, the muzzle is at + 1.
const camera = new THREE.Vector3(0, 3.596, 2.94);
const lookAt = new THREE.Vector3(0, 0.5, 0);
const muzzle = new THREE.Vector3(0, 1, 0);
const dir = lookAt.clone().sub(camera).normalize();

describe("shotOriginOnAimRay", () => {
  it("starts the shot on the reticle ray", () => {
    const ray = new THREE.Ray(camera, dir);
    const origin = shotOriginOnAimRay(muzzle, camera, dir);
    expect(ray.distanceToPoint(origin)).toBeLessThan(1e-9);
    expect(ray.distanceToPoint(muzzle)).toBeGreaterThan(0.3);
  });

  it("is the point on the ray closest to the muzzle", () => {
    const origin = shotOriginOnAimRay(muzzle, camera, dir);
    expect(Math.abs(muzzle.clone().sub(origin).dot(dir))).toBeLessThan(1e-9);
  });

  it("does not modify its arguments", () => {
    const d = dir.clone().multiplyScalar(2);
    shotOriginOnAimRay(muzzle, camera, d);
    expect(d.length()).toBeCloseTo(2);
    expect(muzzle.toArray()).toEqual([0, 1, 0]);
    expect(camera.toArray()).toEqual([0, 3.596, 2.94]);
  });
});
