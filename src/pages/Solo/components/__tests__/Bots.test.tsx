import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Bots from "../Bots";
import GameManager, { type Player } from "../../../../components/GameManager";

const makeBotPlayer = (id: string, name: string): Player => ({
  id,
  name,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
});

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
      handleBot3PositionUpdate: vi.fn(),
      handleBot4PositionUpdate: vi.fn(),
      collisionSystemRef: { current: null },
      bot1GotTagged: 0,
      bot2GotTagged: 0,
      bot3GotTagged: 0,
      bot4GotTagged: 0,
      BOT1_CONFIG: { label: "Bot1" },
      BOT2_CONFIG: { label: "Bot2" },
      BOT3_CONFIG: { label: "Bot3" },
      BOT4_CONFIG: { label: "Bot4" },
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

  it("renders two bots in tag mode and bot-1 tags current player", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const props = buildProps();

    render(<Bots {...props} />);
    // tag mode now shows bot-1 + bot-2
    expect(screen.getAllByRole("button")).toHaveLength(2);

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

  it("bot-2 tags player in non-debug tag mode when IT", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const players = new Map<string, { isIt: boolean }>([
      ["bot-1", { isIt: false }],
      ["bot-2", { isIt: true }],
      ["player-1", { isIt: false }],
    ]);
    const tagPlayer = vi.fn(() => true);
    const props = buildProps({
      gameManager: {
        getPlayers: () => players,
        tagPlayer,
      } as unknown as React.ComponentProps<typeof Bots>["gameManager"],
    });

    render(<Bots {...props} />);
    // tag mode shows bot-1 and bot-2
    expect(screen.getAllByRole("button")).toHaveLength(2);

    // Click bot-2's onTagTarget
    fireEvent.click(screen.getByTestId("bot-2"));

    expect(tagPlayer).toHaveBeenCalledWith("bot-2", "player-1");
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it("blocks an immediate IT ping-pong when bot-2 tries to tag bot-1 right back", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);
    vi.spyOn(Math, "random").mockReturnValue(0); // bot-1 becomes IT

    const gm = new GameManager();
    gm.addPlayer(makeBotPlayer("bot-1", "Bot1"));
    gm.addPlayer(makeBotPlayer("bot-2", "Bot2"));
    gm.addPlayer(makeBotPlayer("player-1", "Player1"));
    gm.startTagGame(60);

    const tagPlayerSpy = vi.spyOn(gm, "tagPlayer");

    const props = buildProps({
      botDebugMode: true,
      gameManager: gm as unknown as React.ComponentProps<
        typeof Bots
      >["gameManager"],
      gameState: gm.getGameState(),
    });

    const { rerender } = render(<Bots {...props} />);

    // Bot-1 (IT) tags bot-2 - bot-2 becomes the new IT.
    fireEvent.click(screen.getByTestId("bot-1"));
    expect(gm.getPlayers().get("bot-2")?.isIt).toBe(true);
    expect(gm.getPlayers().get("bot-1")?.isIt).toBe(false);

    // Re-render so bot1IsIt/bot2IsIt are recomputed from the mutated GameManager.
    rerender(<Bots {...props} />);

    // Bot-2 (freshly IT) immediately tries to tag bot-1 back.
    fireEvent.click(screen.getByTestId("bot-4"));

    expect(tagPlayerSpy).toHaveBeenCalledTimes(2);
    expect(tagPlayerSpy).toHaveLastReturnedWith(false);

    // Only one IT transfer occurred - no ping-pong back to bot-1.
    expect(gm.getPlayers().get("bot-2")?.isIt).toBe(true);
    expect(gm.getPlayers().get("bot-1")?.isIt).toBe(false);
  });

  it("routes bot fire through hitPlayer with the weapon cooldown in deathmatch", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);

    const gm = new GameManager();
    gm.addPlayer(makeBotPlayer("bot-1", "Bot1"));
    gm.addPlayer(makeBotPlayer("player-1", "Player1"));
    gm.startDeathmatchGame(120, 10);

    const props = buildProps({
      gameManager: gm as unknown as React.ComponentProps<
        typeof Bots
      >["gameManager"],
      gameState: gm.getGameState(),
    });

    render(<Bots {...props} />);
    const fire = botPropsByRender[0].onFireAtTarget as () => void;

    // bot-1 uses the SMG (damage 12, cooldown 120ms)
    fire();
    expect(gm.getPlayers().get("player-1")?.health).toBe(88);

    // Still within the SMG's 120ms cooldown - the shot is gated.
    fire();
    expect(gm.getPlayers().get("player-1")?.health).toBe(88);

    // Cooldown elapsed - the next shot lands.
    nowSpy.mockReturnValue(6001);
    fire();
    expect(gm.getPlayers().get("player-1")?.health).toBe(76);
  });

  it("marks a bot as downed while it awaits respawn in deathmatch", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);

    const gm = new GameManager();
    gm.addPlayer(makeBotPlayer("bot-1", "Bot1"));
    gm.addPlayer(makeBotPlayer("player-1", "Player1"));
    gm.startDeathmatchGame(120, 10);
    gm.hitPlayer("player-1", "bot-1", 1000); // down the bot

    const props = buildProps({
      gameManager: gm as unknown as React.ComponentProps<
        typeof Bots
      >["gameManager"],
      gameState: gm.getGameState(),
    });

    render(<Bots {...props} />);
    expect(botPropsByRender[0].isDowned).toBe(true);
  });

  it("passes team assignment and carried-flag status to bots during CTF", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);

    const gm = new GameManager();
    gm.addPlayer(makeBotPlayer("bot-1", "Bot1"));
    gm.addPlayer(makeBotPlayer("bot-2", "Bot2"));
    gm.addPlayer(makeBotPlayer("player-1", "Player1"));
    gm.startCTFGame();

    // Mark bot-1 as carrying the enemy team's flag.
    const flags = gm.getGameState().flags!;
    const enemyFlag = flags.find(
      (f) => f.team !== gm.getPlayers().get("bot-1")?.team,
    )!;
    enemyFlag.carrierId = "bot-1";

    const props = buildProps({
      botDebugMode: true,
      gameManager: gm as unknown as React.ComponentProps<
        typeof Bots
      >["gameManager"],
      gameState: gm.getGameState(),
    });

    render(<Bots {...props} />);

    expect(botPropsByRender[0].team).toBe(gm.getPlayers().get("bot-1")?.team);
    expect(botPropsByRender[0].isCarryingFlag).toBe(true);
    expect(botPropsByRender[0].targetTeam).toBe(
      gm.getPlayers().get("bot-2")?.team,
    );
    expect(botPropsByRender[1].team).toBe(gm.getPlayers().get("bot-2")?.team);
    expect(botPropsByRender[1].isCarryingFlag).toBe(false);
    expect(botPropsByRender[1].targetTeam).toBe(
      gm.getPlayers().get("bot-1")?.team,
    );
  });

  it("routes bot laser fire through hitPlayer during CTF", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(5000);

    const gm = new GameManager();
    gm.addPlayer(makeBotPlayer("bot-1", "Bot1"));
    gm.addPlayer(makeBotPlayer("player-1", "Player1"));
    gm.startCTFGame();

    const props = buildProps({
      gameManager: gm as unknown as React.ComponentProps<
        typeof Bots
      >["gameManager"],
      gameState: gm.getGameState(),
    });

    render(<Bots {...props} />);
    const fire = botPropsByRender[0].onFireAtTarget as () => void;

    fire();
    // bot-1 equips the SMG (damage 12), so 100 - 12 = 88
    expect(gm.getPlayers().get("player-1")?.health).toBe(88);

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
