import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as THREE from "three";
import { PlayerCharacter } from "../components/characters/PlayerCharacter";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";

const emitMock = vi.fn();

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFrame: () => undefined,
}));

vi.mock("../components/SpacemanModel", () => ({
  default: () => <div data-testid="spaceman" />,
}));

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

vi.mock("../world/vfx/TrajectoryArc", () => ({
  default: () => null,
}));

// Mock internal hooks
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
    cameraRotationRef: { current: { horizontal: 0, vertical: 0.2 } },
    skycamRef: { current: false },
    previousMouseRef: { current: { x: 0, y: 0 } },
    isFirstMouseRef: { current: true },
    idealCameraPositionRef: { current: new THREE.Vector3() },
    skyTargetRef: { current: new THREE.Vector3() },
  }),
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
vi.mock("../components/characters/player/PlayerHealth", () => ({
  PlayerHealth: () => null,
}));
vi.mock("../components/characters/player/PlayerRespawner", () => ({
  PlayerRespawner: () => null,
}));
vi.mock("../components/characters/player/PlayerInput", () => ({
  PlayerInput: () => null,
}));
vi.mock("../components/characters/player/PlayerJetpack", () => ({
  PlayerJetpack: () => null,
}));

vi.mock("../lib/hooks/usePlayerCollision", () => ({
  resolveMovement: () => new THREE.Vector3(),
  detectPlayerCollision: () => false,
}));

describe("PlayerCharacter orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports imperative resetPosition and freezePlayer via ref", () => {
    const ref = React.createRef<PlayerCharacterHandle>();

    render(
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
        clients={{}}
        gameManager={null}
        currentPlayerId="p1"
        joystickMove={{ x: 0, y: 0 }}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={true}
      />,
    );

    expect(typeof ref.current?.resetPosition).toBe("function");
    expect(typeof ref.current?.freezePlayer).toBe("function");

    act(() => {
      ref.current?.freezePlayer(500);
    });
  });

  it("renders SpacemanModel and TrajectoryArc as children", () => {
    const { container } = render(
      <PlayerCharacter
        keysPressedRef={{ current: {} }}
        socketClient={
          {
            emit: emitMock,
            id: "socket-1",
          } as unknown as import("socket.io-client").Socket
        }
        mouseControls={{
          leftClick: false,
          rightClick: false,
          middleClick: false,
          mouseX: 0,
          mouseY: 0,
        }}
        clients={{}}
        gameManager={null}
        currentPlayerId="socket-1"
        joystickMove={{ x: 0, y: 0 }}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
      />,
    );

    expect(container.querySelector('[data-testid="spaceman"]')).toBeTruthy();
  });
});
