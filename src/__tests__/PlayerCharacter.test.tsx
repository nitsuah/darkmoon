import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import * as THREE from "three";
import { PlayerCharacter } from "../components/characters/PlayerCharacter";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import type { Clients } from "../types/socket";

// Mock R3F Canvas/useFrame at top-level
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: () => undefined,
}));

// Mock all modular components as null — they have their own tests
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

// Mock spaceman model - return null to avoid Three.js rendering issues in DOM tests
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
  usePlayerState: () => {
    const mockWeaponManager = {
      equip: vi.fn(),
      unequip: vi.fn(),
      refill: vi.fn(),
      getAmmo: vi.fn(() => 6),
      getEquipped: vi.fn(() => ({ id: "laser" })),
      isCharging: vi.fn(() => false),
      startCharge: vi.fn(),
      stopCharge: vi.fn(),
      getChargeProgress: vi.fn(() => 0),
      startReload: vi.fn(),
      getReloadProgress: vi.fn(() => 0),
    };
    return {
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
      weaponManagerRef: { current: mockWeaponManager },
    };
  },
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

// Mock collision system
vi.mock("../lib/hooks/usePlayerCollision", () => ({
  resolveMovement: (
    _collisionSystem: unknown,
    _current: unknown,
    next: unknown,
  ) => next,
  detectPlayerCollision: () => false,
}));

const emptyClients: Clients = {} as unknown as Clients;

describe("PlayerCharacter - Orchestrator Tests", () => {
  it("exposes resetPosition and freezePlayer on ref", () => {
    const ref = React.createRef<PlayerCharacterHandle>();

    render(
      <div data-testid="canvas">
        <PlayerCharacter
          ref={ref}
          keysPressedRef={{ current: {} }}
          socketClient={null}
          mouseControls={{
            leftClick: false,
            rightClick: false,
            middleClick: false,
            mouseX: 0,
            mouseY: 0,
          }}
          clients={emptyClients}
          gameManager={null}
          currentPlayerId="p1"
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={false}
        />
      </div>,
    );

    expect(typeof ref.current?.resetPosition).toBe("function");
    expect(typeof ref.current?.freezePlayer).toBe("function");

    // Call freezePlayer to ensure no exceptions
    ref.current?.freezePlayer(1000);
  });

  it("renders PlayerCharacter without errors", () => {
    const { container } = render(
      <div data-testid="canvas">
        <PlayerCharacter
          keysPressedRef={{ current: {} }}
          socketClient={null}
          mouseControls={{
            leftClick: false,
            rightClick: false,
            middleClick: false,
            mouseX: 0,
            mouseY: 0,
          }}
          clients={emptyClients}
          gameManager={null}
          currentPlayerId="p1"
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={false}
        />
      </div>,
    );

    // Component should render without throwing
    expect(container).toBeTruthy();
  });
});
