import { useRef } from "react";
import * as THREE from "three";

/**
 * Physics constants for player movement
 */
export const PHYSICS_CONSTANTS = {
  GRAVITY: 0.0005, // Reduced for floaty moon-like feel
  GROUND_Y: 0.5,
  AIR_RESISTANCE: 0.996, // Slightly more resistance for heavier feel
  HORIZONTAL_AIR_CONTROL: 0.5, // Reduced - less control in air
  MOMENTUM_PRESERVATION: 0.985, // Slightly more decay for heavier feel
  JUMP_INITIAL_FORCE: 0.1, // Reduced for heavier feel
  JETPACK_INITIAL_BOOST: 0.04, // Reduced for slower jetpack
  JETPACK_HOLD_FORCE: 0.05, // Reduced for slower, more controlled thrust
  JETPACK_MAX_HOLD_TIME: 2.5, // Increased - longer duration
  RCS_THRUST: 0.05, // Directional thrust strength
  RCS_MAX_DURATION: 3.0, // Can use RCS for 3 seconds
  POSITION_UPDATE_THRESHOLD: 0.01, // Only update if moved > 1cm
} as const;

/**
 * Hook to manage player physics state (velocity, jumping, jetpack, RCS)
 * Encapsulates all movement and flight mechanics
 */
export function usePlayerPhysics() {
  // Core movement
  const velocityRef = useRef(new THREE.Vector3());
  const directionRef = useRef(new THREE.Vector3());

  // Jump mechanics - True moon-like low gravity physics (1/6 Earth gravity)
  const isJumpingRef = useRef(false);
  const verticalVelocityRef = useRef(0);
  const jumpHoldTimeRef = useRef(0); // Track how long space is held
  const horizontalMomentumRef = useRef(new THREE.Vector3(0, 0, 0)); // Preserve momentum in air
  const lastJumpTimeRef = useRef(0); // For double-jump detection
  const jetpackActiveRef = useRef(false); // Track if jetpack mode is active
  const isUsingRCSRef = useRef(false); // Track if RCS jets are active (SHIFT in air)

  // RCS fuel tracking
  const rcsTimeRemainingRef = useRef(0); // Track RCS fuel

  // Jetpack thrust sound tracking
  const jetpackThrustSoundRef = useRef<{
    osc: OscillatorNode;
    gain: GainNode;
  } | null>(null);
  const lastRCSSoundTimeRef = useRef(0); // Throttle RCS sound

  // Reusable vectors to avoid allocations in animation loop
  const inputDirectionRef = useRef(new THREE.Vector3());
  const finalMovementRef = useRef(new THREE.Vector3());

  return {
    // Core movement refs
    velocityRef,
    directionRef,
    inputDirectionRef,
    finalMovementRef,

    // Jump/jetpack state
    isJumpingRef,
    verticalVelocityRef,
    jumpHoldTimeRef,
    horizontalMomentumRef,
    lastJumpTimeRef,
    jetpackActiveRef,
    isUsingRCSRef,
    rcsTimeRemainingRef,

    // Sound tracking
    jetpackThrustSoundRef,
    lastRCSSoundTimeRef,
  };
}
