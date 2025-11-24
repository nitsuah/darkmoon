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

const fakeGameManager: FakeGameManager = {
  getPlayers: () => new Map<unknown, unknown>(),
  getGameState: () => ({ mode: "tag", isActive: false }),
};

describe("PlayerCharacter imperative handle", () => {
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
          gameManager={fakeGameManager}
          currentPlayerId={"p1"}
          joystickMove={{ x: 0, y: 0 }}
          joystickCamera={{ x: 0, y: 0 }}
          lastWalkSoundTimeRef={{ current: 0 }}
          isPaused={true}
        />
      </div>
    );

    // Should expose methods
    expect(typeof ref.current?.resetPosition).toBe("function");
    expect(typeof ref.current?.freezePlayer).toBe("function");

    // Call freezePlayer (safe) to ensure no exceptions. Avoid calling resetPosition
    // because it mutates meshRef and the test uses a lightweight mock.
    ref.current?.freezePlayer(1000);
  });
});
