import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as THREE from "three";
import { PlayerCharacter } from "../components/characters/PlayerCharacter";

const emitMock = vi.fn();
const playWalkSound = vi.fn();
const playJumpSound = vi.fn();
const playLandingSoundScaled = vi.fn();
const playJetpackActivateSound = vi.fn();
const playJetpackThrustSound = vi.fn(() => null);
const stopJetpackThrustSound = vi.fn();
const playRCSSound = vi.fn();

let mockMesh: {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: { set: ReturnType<typeof vi.fn> };
};

let frameCallback:
  | ((
      state: {
        camera: { position: THREE.Vector3; lookAt: ReturnType<typeof vi.fn> };
      },
      delta: number,
    ) => void)
  | null = null;

vi.mock("@react-three/fiber", () => ({
  useFrame: (
    cb: (
      state: {
        camera: { position: THREE.Vector3; lookAt: ReturnType<typeof vi.fn> };
      },
      delta: number,
    ) => void,
  ) => {
    frameCallback = cb;
  },
}));

vi.mock("../components/SpacemanModel", () => ({
  default: () => <div data-testid="spaceman" />,
}));

vi.mock("../components/SoundManager", () => ({
  getSoundManager: () => ({
    playWalkSound,
    playSprintSound: vi.fn(),
    playJumpSound,
    playLandingSoundScaled,
    playJetpackActivateSound,
    playJetpackThrustSound,
    stopJetpackThrustSound,
    playRCSSound,
  }),
}));

vi.mock("../lib/hooks/usePlayerCollision", () => ({
  resolveMovement: (
    _collisionSystem: unknown,
    _current: THREE.Vector3,
    next: THREE.Vector3,
  ) => next,
  detectPlayerCollision: () => false,
}));

vi.mock("../lib/hooks/usePlayerTagging", () => ({
  processTagging: vi.fn(() => false),
}));

vi.mock("../lib/hooks/usePlayerState", () => ({
  usePlayerState: () => {
    const meshRef: { current: unknown } = {} as { current: unknown };
    Object.defineProperty(meshRef, "current", {
      configurable: true,
      get: () => mockMesh,
      set: () => {
        // Ignore DOM assignment from React renderer; keep three-like mock object.
      },
    });

    return {
      meshRef,
      collisionSystemRef: {
        current: {
          checkCollision: (_a: THREE.Vector3, b: THREE.Vector3) => b,
          checkPlayerCollision: () => false,
        },
      },
      lastReportedPositionRef: { current: new THREE.Vector3(0, 0, 0) },
      lastTagCheckRef: { current: 0 },
      frameCounterRef: { current: 0 },
      isPlayerFrozenRef: { current: false },
      playerFreezeEndTimeRef: { current: 0 },
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
    POSITION_UPDATE_THRESHOLD: 0.01,
  },
  usePlayerPhysics: () => ({
    velocityRef: { current: new THREE.Vector3() },
    directionRef: { current: new THREE.Vector3() },
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

describe("PlayerCharacter frame behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameCallback = null;
    mockMesh = {
      position: new THREE.Vector3(0, 0.5, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: { set: vi.fn() },
    };
  });

  it("processes movement/jump frame and emits socket updates", () => {
    const onPositionUpdate = vi.fn();

    render(
      <PlayerCharacter
        keysPressedRef={{ current: { w: true, shift: true, " ": true } }}
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
        gameManager={
          {
            getPlayers: () => new Map([["socket-1", { isIt: false }]]),
            getGameState: () => ({
              mode: "tag",
              isActive: true,
              scores: {},
              timeRemaining: 10,
            }),
          } as unknown as import("../components/GameManager").GameManager
        }
        currentPlayerId="socket-1"
        joystickMove={{ x: 0, y: 0 }}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
        onPositionUpdate={onPositionUpdate}
        mobileJetpackTrigger={{ current: true }}
        playerIsIt={false}
      />,
    );

    expect(frameCallback).toBeTruthy();

    const state = {
      camera: {
        position: new THREE.Vector3(0, 5, 8),
        lookAt: vi.fn(),
      },
    };

    act(() => {
      frameCallback?.(state, 0.016);
    });

    expect(emitMock).toHaveBeenCalledWith(
      "move",
      expect.objectContaining({
        position: expect.any(Array),
        rotation: expect.any(Array),
      }),
    );
    expect(onPositionUpdate).toHaveBeenCalled();
    expect(mockMesh.scale.set).toHaveBeenCalled();
  });

  it("freezes player on bot-tag event and skips movement while frozen", () => {
    render(
      <PlayerCharacter
        keysPressedRef={{ current: { w: true } }}
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
        gameManager={
          {
            getPlayers: () => new Map([["socket-1", { isIt: false }]]),
            getGameState: () => ({
              mode: "tag",
              isActive: true,
              scores: {},
              timeRemaining: 10,
            }),
          } as unknown as import("../components/GameManager").GameManager
        }
        currentPlayerId="socket-1"
        joystickMove={{ x: 0, y: 0 }}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
      />,
    );

    act(() => {
      window.dispatchEvent(new window.Event("player-tagged-by-bot"));
    });

    emitMock.mockClear();
    act(() => {
      frameCallback?.(
        {
          camera: {
            position: new THREE.Vector3(0, 5, 8),
            lookAt: vi.fn(),
          },
        },
        0.016,
      );
    });

    // Frozen branch pulses scale and avoids emitting move updates.
    expect(mockMesh.scale.set).toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("supports imperative resetPosition and freezePlayer", () => {
    const ref =
      React.createRef<
        import("../components/characters/PlayerCharacter").PlayerCharacterHandle
      >();

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
        gameManager={
          {
            getPlayers: () => new Map([["socket-1", { isIt: false }]]),
            getGameState: () => ({
              mode: "tag",
              isActive: true,
              scores: {},
              timeRemaining: 10,
            }),
          } as unknown as import("../components/GameManager").GameManager
        }
        currentPlayerId="socket-1"
        joystickMove={{ x: 0, y: 0 }}
        joystickCamera={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
      />,
    );

    expect(typeof ref.current?.resetPosition).toBe("function");
    expect(typeof ref.current?.freezePlayer).toBe("function");

    act(() => {
      ref.current?.resetPosition();
      ref.current?.freezePlayer(500);
    });

    expect(mockMesh.position.toArray()).toEqual([0, 0, 0]);
  });
});
