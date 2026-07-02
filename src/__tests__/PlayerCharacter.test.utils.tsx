import { vi } from "vitest";
import React from "react";
import * as THREE from "three";

// Mock @react-three/fiber Canvas / useFrame
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFrame: () => undefined,
}));

// Mock all modular components (except ones that need functional handlers)
vi.mock("../components/characters/player/PlayerMovement", () => ({
  PlayerMovement: () => null,
}));
vi.mock("../components/characters/player/PlayerCamera", () => ({
  PlayerCamera: () => null,
}));
vi.mock("../components/characters/player/PlayerWeapon", () => ({
  PlayerWeapon: () => null,
}));
vi.mock("../components/characters/player/PlayerRespawner", () => ({
  PlayerRespawner: () => null,
}));
vi.mock("../components/characters/player/PlayerJetpack", () => ({
  PlayerJetpack: () => null,
}));
vi.mock("../components/characters/player/PlayerInput", () => ({
  PlayerInput: () => null,
}));
vi.mock("../components/characters/player/PlayerHealth", () => ({
  PlayerHealth: () => null,
}));

// Mock spaceman model
vi.mock("../components/SpacemanModel", () => ({
  default: () => null,
}));

// Mock sound manager
vi.mock("../components/SoundManager", () => ({
  getSoundManager: () => ({
    playWalkSound: vi.fn(),
    playSprintSound: vi.fn(),
    playJumpSound: vi.fn(),
    playLandingSoundScaled: vi.fn(),
    playJetpackActivateSound: vi.fn(),
    playJetpackThrustSound: vi.fn(() => null),
    stopJetpackThrustSound: vi.fn(),
    playRCSSound: vi.fn(),
  }),
}));

// Mock trajectory arc
vi.mock("../world/vfx/TrajectoryArc", () => ({
  default: () => null,
}));

// Mock internal hooks that PlayerCharacter uses
vi.mock("../lib/hooks/usePlayerState", () => ({
  usePlayerState: () => ({
    meshRef: {
      current: {
        position: new THREE.Vector3(0, 0.5, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: { set: vi.fn() },
        clone: vi.fn(() => new THREE.Vector3(0, 0.5, 0)),
      },
    },
    collisionSystemRef: {
      current: {
        checkCollision: (a: unknown, b: unknown) => b,
        checkPlayerCollision: () => false,
      },
    },
    lastReportedPositionRef: { current: new THREE.Vector3(0, 0.5, 0) },
    lastTagCheckRef: { current: 0 },
    frameCounterRef: { current: 0 },
    isPlayerFrozenRef: { current: false },
    playerFreezeEndTimeRef: { current: 0 },
    weaponManagerRef: { current: null },
  }),
}));

vi.mock("../lib/hooks/usePlayerPhysics", () => ({
  PHYSICS_CONSTANTS: {
    GRAVITY: 0.0005,
    GROUND_Y: 0,
    AIR_RESISTANCE: 0.996,
    HORIZONTAL_AIR_CONTROL: 0.5,
    MOMENTUM_PRESERVATION: 0.985,
    JUMP_INITIAL_FORCE: 0.1,
    JETPACK_INITIAL_BOOST: 0.04,
    JETPACK_HOLD_FORCE: 0.05,
    JETPACK_MAX_HOLD_TIME: 2.5,
    RCS_THRUST: 0.05,
    RCS_MAX_DURATION: 3,
    POSITION_UPDATE_THRESHOLD: 0.001,
  },
  usePlayerPhysics: () => ({
    velocityRef: { current: new THREE.Vector3() },
    directionRef: { current: new THREE.Vector3() },
    currentSpeedRef: { current: 0 },
    inputDirectionRef: { current: new THREE.Vector3() },
    finalMovementRef: { current: new THREE.Vector3() },
    isJumpingRef: { current: false },
    verticalVelocityRef: { current: 0 },
    jumpHoldTimeRef: { current: 0 },
    horizontalMomentumRef: { current: new THREE.Vector3() },
    lastJumpTimeRef: { current: 0 },
    jetpackActiveRef: { current: false },
    isUsingRCSRef: { current: false },
    rcsTimeRemainingRef: { current: 0 },
    jetpackThrustSoundRef: { current: null },
    lastRCSSoundTimeRef: { current: 0 },
  }),
}));

vi.mock("../lib/hooks/usePlayerCamera", () => ({
  usePlayerCamera: () => ({
    cameraOffsetRef: { current: new THREE.Vector3(0, 3, -5) },
    cameraRotationRef: { current: { horizontal: 0, vertical: 0 } },
    skycamRef: { current: false },
    previousMouseRef: { current: { x: 0, y: 0 } },
    isFirstMouseRef: { current: true },
    idealCameraPositionRef: { current: new THREE.Vector3() },
    skyTargetRef: { current: null },
  }),
}));

vi.mock("../lib/hooks/usePlayerCollision", () => ({
  resolveMovement: (
    _collisionSystem: unknown,
    _current: unknown,
    next: unknown,
  ) => next,
  detectPlayerCollision: () => false,
}));

// No need to re-import tools, this is just a utility file for mocks
