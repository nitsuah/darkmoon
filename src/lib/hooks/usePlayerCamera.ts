import { useRef } from "react";
import * as THREE from "three";

/**
 * Hook to manage player camera state (position, rotation, skycam mode)
 * Handles third-person camera controls and perspective
 */
export function usePlayerCamera() {
  // Camera position relative to player
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 3, -5));

  // Track camera rotation (horizontal yaw, vertical pitch)
  const cameraRotationRef = useRef({ horizontal: 0, vertical: 0.2 });

  // Skycam mode toggle
  const skycamRef = useRef(false);

  // Mouse tracking for camera controls
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const isFirstMouseRef = useRef(true);

  // Reusable vectors for camera calculations
  const idealCameraPositionRef = useRef(new THREE.Vector3());
  const skyTargetRef = useRef(new THREE.Vector3());

  return {
    cameraOffsetRef,
    cameraRotationRef,
    skycamRef,
    previousMouseRef,
    isFirstMouseRef,
    idealCameraPositionRef,
    skyTargetRef,
  };
}
