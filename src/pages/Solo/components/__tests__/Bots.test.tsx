import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Bots from "../Bots";

const botPropsByRender: Array<Record<string, unknown>> = [];

vi.mock("../../../../components/characters/BotCharacter", () => ({
  BotCharacter: (props: Record<string, unknown>) => {
    const index = botPropsByRender.length + 1;
    botPropsByRender.push(props);
    return (
      <button
        data-testid={`bot-${index}`}
        onClick={() => (props.onTagTarget as () => void)?.()}
      >
        Bot {index}
      </button>
    );
  },
}));

describe("Bots", () => {
  beforeEach(() => {
    botPropsByRender.length = 0;
    vi.restoreAllMocks();
  });

  function buildProps(
    overrides: Partial<React.ComponentProps<typeof Bots>> = {},
  ): React.ComponentProps<typeof Bots> {
    const players = new Map<string, { isIt: boolean }>([
      ["bot-1", { isIt: true }],
      ["bot-2", { isIt: false }],
      ["player-1", { isIt: false }],
    ]);

    const tagPlayer = vi.fn(() => true);

    return {
      botDebugMode: false,
      bot1PositionRef: { current: [0, 0, 0] as [number, number, number] },
      bot2PositionRef: { current: [1, 0, 0] as [number, number, number] },
      isPaused: false,
      handleBot1PositionUpdate: vi.fn(),
      handleBot2PositionUpdate: vi.fn(),
      collisionSystemRef: { current: null },
      bot1GotTagged: 0,
      bot2GotTagged: 0,
      BOT1_CONFIG: { label: "Bot1" },
      BOT2_CONFIG: { label: "Bot2" },
      gameManager: {
        getPlayers: () => players,
        tagPlayer,
      } as unknown as React.ComponentProps<typeof Bots>["gameManager"],
      gameState: {
        mode: "tag",
        isActive: true,
        timeRemaining: 10,
        scores: {},
      },
      setBot1GotTagged: vi.fn(),
      setBot2GotTagged: vi.fn(),
      currentPlayerId: "player-1",
      playerIsIt: false,
      playerPositionRef: { current: [2, 0, 0] as [number, number, number] },
      ...overrides,
    };
  }

  it("renders one bot in normal mode and tags current player", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const props = buildProps();

    render(<Bots {...props} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByTestId("bot-1"));

    expect(
      (
        props.gameManager as unknown as {
          tagPlayer: (a: string, b: string) => boolean;
        }
      ).tagPlayer,
    ).toHaveBeenCalledWith("bot-1", "player-1");
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it("prevents tagging when player freeze cooldown is active", () => {
    const props = buildProps();
    (
      window as typeof globalThis & { __playerFreezeUntil?: number }
    ).__playerFreezeUntil = Date.now() + 10000;

    render(<Bots {...props} />);
    fireEvent.click(screen.getByTestId("bot-1"));

    expect(
      (
        props.gameManager as unknown as {
          tagPlayer: (a: string, b: string) => boolean;
        }
      ).tagPlayer,
    ).not.toHaveBeenCalled();
    (
      window as typeof globalThis & { __playerFreezeUntil?: number }
    ).__playerFreezeUntil = 0;
  });

  it("renders two bots in debug mode and allows bot-1 to tag bot-2", () => {
    const setBot2GotTagged = vi.fn();
    const setBot1GotTagged = vi.fn();
    const players = new Map<string, { isIt: boolean }>([
      ["bot-1", { isIt: true }],
      ["bot-2", { isIt: false }],
      ["player-1", { isIt: false }],
    ]);
    const tagPlayer = vi.fn(() => true);

    const props = buildProps({
      botDebugMode: true,
      setBot1GotTagged,
      setBot2GotTagged,
      gameManager: {
        getPlayers: () => players,
        tagPlayer,
      } as unknown as React.ComponentProps<typeof Bots>["gameManager"],
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234);

    render(<Bots {...props} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("bot-1"));
    expect(tagPlayer).toHaveBeenCalledWith("bot-1", "bot-2");
    expect(setBot2GotTagged).toHaveBeenCalledWith(1234);

    nowSpy.mockRestore();
  });

  it("allows bot-2 to tag bot-1 when bot-2 is IT", () => {
    const setBot1GotTagged = vi.fn();
    const players = new Map<string, { isIt: boolean }>([
      ["bot-1", { isIt: false }],
      ["bot-2", { isIt: true }],
      ["player-1", { isIt: false }],
    ]);
    const tagPlayer = vi.fn(() => true);
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234);

    const props = buildProps({
      botDebugMode: true,
      setBot1GotTagged,
      gameManager: {
        getPlayers: () => players,
        tagPlayer,
      } as unknown as React.ComponentProps<typeof Bots>["gameManager"],
    });

    render(<Bots {...props} />);

    fireEvent.click(screen.getByTestId("bot-2"));
    expect(tagPlayer).toHaveBeenCalledWith("bot-2", "bot-1");
    expect(setBot1GotTagged).toHaveBeenCalledWith(1234);

    nowSpy.mockRestore();
  });
});
