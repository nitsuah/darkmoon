import { useRef } from "react";
import * as THREE from "three";
import CollisionSystem from "../../components/CollisionSystem";

/**
 * Hook to manage player state (position, freeze, collision, tagging)
 * Handles game state tracking and player status
 */
export function usePlayerState() {
  // Player mesh reference
  const meshRef = useRef<THREE.Group>(null);

  // Collision detection
  const collisionSystemRef = useRef(new CollisionSystem());

  // Position tracking
  const lastReportedPositionRef = useRef(new THREE.Vector3(0, 0, 0));

  // Tag checking
  const lastTagCheckRef = useRef(0);

  // Frame counter for debugging
  const frameCounterRef = useRef(0);

  // Player freeze state when tagged
  const isPlayerFrozenRef = useRef(false);
  const playerFreezeEndTimeRef = useRef(0);

  return {
    meshRef,
    collisionSystemRef,
    lastReportedPositionRef,
    lastTagCheckRef,
    frameCounterRef,
    isPlayerFrozenRef,
    playerFreezeEndTimeRef,
  };
}
