import React from "react";
import { render } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import { PlayerCharacter } from "../components/characters/PlayerCharacter";
import type { Clients } from "../types/socket";

// Mock R3F Canvas/useFrame at top-level so PlayerCharacter's useFrame doesn't throw
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: () => undefined,
}));

// Minimal mocks for internal hooks so the imperative handle is available.
vi.mock("../../lib/hooks/usePlayerState", () => ({
  usePlayerState: () => ({
    meshRef: {
      current: {
        position: {
          set: (..._args: unknown[]) => {
            void _args;
          },
        },
        rotation: {},
        scale: { set: () => {} },
      },
    },
    collisionSystemRef: {
      current: {
        checkCollision: () => ({ x: 0, y: 0, z: 0 }),
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

vi.mock("../../lib/hooks/usePlayerPhysics", () => ({
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

vi.mock("../../lib/hooks/usePlayerCamera", () => ({
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

// Mock the modular components that PlayerCharacter imports
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

vi.mock("../components/characters/player/PlayerJetpackV2", () => ({
  PlayerJetpackV2: () => null,
}));

// Mock the modular components that PlayerCharacter imports
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

vi.mock("../components/characters/player/PlayerJetpackV2", () => ({
  PlayerJetpackV2: () => null,
}));

vi.mock("../../lib/hooks/usePlayerPhysics", () => ({
  usePlayerPhysics: () => ({
    velocityRef: {
      current: {
        set: (..._args: unknown[]) => {
          void _args;
        },
      },
    },
    directionRef: {
      current: {
        set: (..._args: unknown[]) => {
          void _args;
        },
      },
    },
    inputDirectionRef: { current: { set: () => {} } },
    finalMovementRef: { current: { set: () => {} } },
    isJumpingRef: { current: false },
    verticalVelocityRef: { current: 0 },
    jumpHoldTimeRef: { current: 0 },
    horizontalMomentumRef: { current: 0 },
    lastJumpTimeRef: { current: 0 },
    jetpackActiveRef: { current: false },
    isUsingRCSRef: { current: false },
    rcsTimeRemainingRef: { current: 0 },
    jetpackThrustSoundRef: { current: null },
    lastRCSSoundTimeRef: { current: 0 },
  }),
}));

vi.mock("../../lib/hooks/usePlayerCamera", () => ({
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

// Minimal dependencies for PlayerCharacter
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

describe("PlayerCharacter imperative handle", () => {
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
