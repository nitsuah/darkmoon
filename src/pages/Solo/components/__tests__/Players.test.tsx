import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Players from "../Players";

const MockPlayerCharacter = React.forwardRef<unknown, unknown>((props, ref) => {
  void props;
  void ref;
  return <div data-testid="player-character" />;
});
MockPlayerCharacter.displayName = "MockPlayerCharacter";

vi.mock("../../../../components/characters/PlayerCharacter", () => ({
  PlayerCharacter: MockPlayerCharacter,
}));

vi.mock("../../../../components/SpacemanModel", () => ({
  default: ({ isIt }: { isIt?: boolean }) => (
    <div data-testid={isIt ? "it-model" : "model"} />
  ),
}));

vi.mock("@react-three/drei", () => ({
  Text: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("Players", () => {
  it("renders local PlayerCharacter and filters bot ids", () => {
    const gameManager = {
      getPlayers: () =>
        new Map([
          ["p2", { name: "Player 2", isIt: true }],
          ["bot-1", { name: "Bot 1", isIt: false }],
        ]),
    } as unknown as import("../../../../components/GameManager").GameManager;

    render(
      <Players
        ref={React.createRef()}
        keysPressedRef={{ current: {} }}
        socketClient={null}
        mouseControls={null as unknown as never}
        clients={{
          "bot-1": { position: [0, 0, 0], rotation: [0, 0, 0] },
          p2: { position: [1, 0, 0], rotation: [0, 0, 0] },
        }}
        gameManager={gameManager}
        currentPlayerId="p1"
        joystickMove={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
        onPositionUpdate={vi.fn()}
        playerIsIt={false}
        setPlayerIsIt={vi.fn()}
        setBotIsIt={vi.fn()}
        setBot1GotTagged={vi.fn()}
        setBot2GotTagged={vi.fn()}
        setGameState={
          vi.fn() as unknown as React.Dispatch<
            React.SetStateAction<
              import("../../../../components/GameManager").GameState
            >
          >
        }
      />,
    );

    expect(screen.getByTestId("player-character")).toBeInTheDocument();
    expect(screen.getByText("Player 2")).toBeInTheDocument();
    expect(screen.queryByText("Bot 1")).toBeNull();
  });

  it("falls back to id suffix when player name missing", () => {
    const gameManager = {
      getPlayers: () => new Map(),
    } as unknown as import("../../../../components/GameManager").GameManager;

    render(
      <Players
        ref={React.createRef()}
        keysPressedRef={{ current: {} }}
        socketClient={null}
        mouseControls={{
          mouseX: 0,
          mouseY: 0,
          leftClick: false,
          rightClick: false,
          middleClick: false,
        }}
        clients={{
          "abcd-1234": { position: [1, 0, 0], rotation: [0, 0, 0] },
        }}
        gameManager={gameManager}
        currentPlayerId="p1"
        joystickMove={{ x: 0, y: 0 }}
        lastWalkSoundTimeRef={{ current: 0 }}
        isPaused={false}
        onPositionUpdate={vi.fn()}
        playerIsIt={false}
        setPlayerIsIt={vi.fn()}
        setBotIsIt={vi.fn()}
        setBot1GotTagged={vi.fn()}
        setBot2GotTagged={vi.fn()}
        setGameState={
          vi.fn() as unknown as React.Dispatch<
            React.SetStateAction<
              import("../../../../components/GameManager").GameState
            >
          >
        }
      />,
    );

    expect(screen.getByText("1234")).toBeInTheDocument();
  });
});
