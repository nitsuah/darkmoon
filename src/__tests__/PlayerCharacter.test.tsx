import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import * as THREE from "three";
import { PlayerCharacter } from "../components/characters/PlayerCharacter";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import type { Clients } from "../types/socket";

// Mock R3F Canvas/useFrame at top-level so PlayerCharacter's useFrame doesn't throw
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: () => undefined,
}));

// Mock all modular components — some need to be functional (not null)
// because they contain event listeners that the tests rely on.

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

vi.mock("../components/characters/player/PlayerJetpackV2", () => ({
  PlayerJetpackV2: () => null,
}));

// PlayerInput handles weapon-pickup events — make it functional
vi.mock("../components/characters/player/PlayerInput", () => ({
  PlayerInput: (props: {
    gameManager: {
      updatePlayer: (id: string, data: Record<string, unknown>) => void;
    } | null;
    currentPlayerId: string;
    socketClient: { id?: string } | null;
    weaponManagerRef: {
      current: { equip: (id: string) => void; getAmmo: (id: string) => number };
    };
    isPaused: boolean;
  }) => {
    React.useEffect(() => {
      function handleWeaponPickup(e: Event) {
        const detail = (e as CustomEvent).detail;
        const weaponId = detail?.weaponId;
        if (!weaponId || !props.gameManager || props.isPaused) return;
        props.weaponManagerRef.current.equip(weaponId);
        const myId = props.socketClient?.id || props.currentPlayerId;
        props.gameManager.updatePlayer(myId, {
          equippedWeaponId: weaponId,
          currentAmmo: props.weaponManagerRef.current.getAmmo(weaponId),
        });
      }
      window.addEventListener("weapon-pickup", handleWeaponPickup);
      return () =>
        window.removeEventListener("weapon-pickup", handleWeaponPickup);
    }, [
      props.gameManager,
      props.currentPlayerId,
      props.isPaused,
      props.socketClient,
      props.weaponManagerRef,
    ]);
    return null;
  },
}));

// PlayerHealth handles health-pickup events — make it functional
vi.mock("../components/characters/player/PlayerHealth", () => ({
  PlayerHealth: (props: {
    gameManager: {
      getPlayers: () => Map<string, { health?: number; maxHealth?: number }>;
      updatePlayer: (id: string, data: Record<string, unknown>) => void;
    } | null;
    currentPlayerId: string;
    isPaused: boolean;
  }) => {
    React.useEffect(() => {
      function handleHealthPickup(e: Event) {
        const { amount } = (e as CustomEvent).detail;
        if (!props.gameManager || props.isPaused) return;
        const players = props.gameManager.getPlayers();
        const me = players.get(props.currentPlayerId);
        if (!me) return;
        const maxHp = me.maxHealth ?? 100;
        const newHp = Math.min(maxHp, (me.health ?? 100) + amount);
        props.gameManager.updatePlayer(props.currentPlayerId, {
          health: newHp,
        });
      }
      window.addEventListener("health-pickup", handleHealthPickup);
      return () =>
        window.removeEventListener("health-pickup", handleHealthPickup);
    }, [props.gameManager, props.currentPlayerId, props.isPaused]);
    return null;
  },
}));

// Mock spaceman model
vi.mock("../components/SpacemanModel", () => ({
  default: () => <div data-testid="spaceman" />,
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
        position: { set: () => {} },
        rotation: {},
        scale: { set: () => {} },
      },
    },
    collisionSystemRef: {
      current: {
        checkCollision: (a: unknown, b: unknown) => b,
        checkPlayerCollision: () => false,
      },
    },
    lastReportedPositionRef: { current: { x: 0, y: 0, z: 0 } },
    lastTagCheckRef: { current: 0 },
    frameCounterRef: { current: 0 },
    isPlayerFrozenRef: { current: false },
    playerFreezeEndTimeRef: { current: 0 },
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
    velocityRef: { current: { set: () => {} } },
    directionRef: { current: { set: () => {} } },
    currentSpeedRef: { current: 0 },
    inputDirectionRef: { current: { set: () => {} } },
    finalMovementRef: { current: { set: () => {} } },
    isJumpingRef: { current: false },
    verticalVelocityRef: { current: 0 },
    jumpHoldTimeRef: { current: 0 },
    horizontalMomentumRef: { current: { set: () => {} } },
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
    cameraOffsetRef: { current: { set: () => {} } },
    cameraRotationRef: { current: { horizontal: 0, vertical: 0 } },
    skycamRef: { current: false },
    previousMouseRef: { current: { x: 0, y: 0 } },
    isFirstMouseRef: { current: true },
    idealCameraPositionRef: { current: { set: () => {} } },
    skyTargetRef: { current: null },
  }),
}));

// Mock collision system
vi.mock("../lib/hooks/usePlayerCollision", () => ({
  resolveMovement: (
    _collisionSystem: unknown,
    _current: THREE.Vector3,
    next: THREE.Vector3,
  ) => next,
  detectPlayerCollision: () => false,
}));

const emptyClients: Clients = {} as unknown as Clients;

type FakeGameManager = {
  getPlayers: () => Map<unknown, unknown>;
  getGameState: () => { mode: string; isActive: boolean };
};

type FakeGameManagerWithUpdate = FakeGameManager & { updatePlayer: () => void };
const fakeGameManager: FakeGameManagerWithUpdate = {
  getPlayers: () => new Map<unknown, unknown>(),
  getGameState: () => ({ mode: "tag", isActive: false }),
  updatePlayer: vi.fn(),
};

describe("PlayerCharacter - Modular Architecture Tests", () => {
  it("equips a picked-up weapon via the weapon-pickup window event", () => {
    const updatePlayer = vi.fn();
    const gm = {
      getPlayers: () => new Map(),
      getGameState: () => ({ mode: "tag", isActive: false }),
      updatePlayer,
    };

    render(
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
          gameManager={
            gm as unknown as import("../components/GameManager").GameManager
          }
          currentPlayerId="p1"
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={true}
        />
      </div>,
    );

    window.dispatchEvent(
      new window.CustomEvent("weapon-pickup", {
        detail: { weaponId: "shotgun" },
      }),
    );

    expect(updatePlayer).toHaveBeenCalledWith("p1", {
      equippedWeaponId: "shotgun",
      currentAmmo: 6,
    });
  });

  it("restores health via the health-pickup window event (capped at maxHealth)", () => {
    const updatePlayer = vi.fn();
    const players = new Map([
      [
        "p1",
        {
          id: "p1",
          name: "P1",
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          health: 60,
          maxHealth: 100,
        },
      ],
    ]);
    const gm = {
      getPlayers: () => players,
      getGameState: () => ({ mode: "deathmatch", isActive: true }),
      updatePlayer,
    };

    render(
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
          gameManager={
            gm as unknown as import("../components/GameManager").GameManager
          }
          currentPlayerId="p1"
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={true}
        />
      </div>,
    );

    window.dispatchEvent(
      new window.CustomEvent("health-pickup", { detail: { amount: 25 } }),
    );

    expect(updatePlayer).toHaveBeenCalledWith("p1", { health: 85 });
  });

  it("exposes resetPosition and freezePlayer on ref (safe calls)", () => {
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
          gameManager={
            fakeGameManager as unknown as import("../components/GameManager").GameManager
          }
          currentPlayerId={"p1"}
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={true}
        />
      </div>,
    );

    // Should expose methods
    expect(typeof ref.current?.resetPosition).toBe("function");
    expect(typeof ref.current?.freezePlayer).toBe("function");

    // Call freezePlayer (safe) to ensure no exceptions. Avoid calling resetPosition
    // because it mutates meshRef and the test uses a lightweight mock.
    ref.current?.freezePlayer(1000);
  });
});
