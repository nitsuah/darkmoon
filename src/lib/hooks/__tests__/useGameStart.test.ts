import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGameStart } from "../useGameStart";
import { useBotPositionHandlers } from "../useBotPositionHandlers";
import GameManager from "../../../components/GameManager";
import type { BotConfig } from "../../../components/characters/useBotAI";
import type { Clients } from "../../../types/socket";

const bot = (label: string, x: number): BotConfig =>
  ({ label, initialPosition: [x, 0.5, 0] }) as unknown as BotConfig;

function setup(currentPlayerId = "player-1") {
  const mgr = new GameManager();
  mgr.addPlayer({
    id: "player-1",
    name: "You",
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
  });
  mgr.addPlayer({
    id: "bot-1",
    name: "Bot1",
    position: [5, 0.5, 5],
    rotation: [0, 0, 0],
  });
  const deps = {
    gameManagerRef: { current: mgr as GameManager | null },
    setGameState: vi.fn(),
    syncGameState: vi.fn(),
    addNotification: vi.fn(),
    currentPlayerId,
    BOT2_CONFIG: bot("Bot2", 2),
    BOT3_CONFIG: bot("", 3),
    BOT4_CONFIG: bot("Bot4", 4),
  };
  const { result } = renderHook(() => useGameStart(deps));
  return { mgr, deps, start: result.current };
}

describe("useGameStart", () => {
  it("does nothing without a game manager", () => {
    const { deps, start } = setup();
    deps.gameManagerRef.current = null;
    start("tag");
    expect(deps.setGameState).not.toHaveBeenCalled();
  });

  it("starts the shooting gallery", () => {
    const { mgr, deps, start } = setup();
    start("shooting_gallery");
    expect(mgr.getGameState().mode).toBe("shooting_gallery");
    expect(deps.syncGameState).toHaveBeenCalled();
    expect(deps.addNotification).toHaveBeenCalledWith(
      expect.stringContaining("Shooting Gallery"),
      "info",
    );
  });

  it("adds the bot roster and starts deathmatch", () => {
    const { mgr, deps, start } = setup();
    start("deathmatch");
    const players = mgr.getPlayers();
    expect(players.get("bot-2")?.name).toBe("Bot2");
    expect(players.get("bot-3")?.name).toBe("bot-3"); // empty label falls back to id
    expect(players.get("bot-4")?.position).toEqual([4, 0.5, 0]);
    expect(mgr.getGameState().mode).toBe("deathmatch");
    expect(deps.setGameState).toHaveBeenCalled();
    expect(deps.addNotification).toHaveBeenCalledWith(
      expect.stringMatching(/^Deathmatch started! First to \d+ kills wins!$/),
      "warning",
    );
  });

  it("starts capture the flag without duplicating existing bots", () => {
    const { mgr, deps, start } = setup();
    start("deathmatch");
    const count = mgr.getPlayers().size;
    start("ctf");
    expect(mgr.getPlayers().size).toBe(count);
    expect(mgr.getGameState().mode).toBe("ctf");
    expect(deps.addNotification).toHaveBeenLastCalledWith(
      expect.stringContaining("Capture the Flag"),
      "warning",
    );
  });

  it("starts tag with Bot2 and announces who is IT", () => {
    const named = setup();
    vi.spyOn(named.mgr, "getGameState").mockReturnValue({
      ...named.mgr.getGameState(),
      itPlayerId: "bot-1",
    });
    named.start("tag");
    expect(named.mgr.getPlayers().has("bot-2")).toBe(true);
    expect(named.deps.setGameState).toHaveBeenCalled();
    expect(named.deps.addNotification).toHaveBeenCalledWith(
      "Tag game started! Bot1 is IT!",
      "info",
    );

    const you = setup();
    vi.spyOn(you.mgr, "getGameState").mockReturnValue({
      ...you.mgr.getGameState(),
      itPlayerId: "player-1",
    });
    you.start("tag");
    expect(you.deps.addNotification).toHaveBeenCalledWith(
      "Tag game started! You're IT!",
      "warning",
    );

    const someone = setup();
    vi.spyOn(someone.mgr, "getGameState").mockReturnValue({
      ...someone.mgr.getGameState(),
      itPlayerId: undefined,
    });
    someone.start("tag");
    expect(someone.deps.addNotification).toHaveBeenCalledWith(
      "Tag game started! Someone is IT!",
      "info",
    );
  });
});

describe("useBotPositionHandlers", () => {
  function setupHandlers(withManager = true) {
    const mgr = {
      updatePlayerPosition: vi.fn(),
      getGameState: vi.fn(() => ({ mode: "ctf", isActive: true })),
      pickupFlag: vi.fn(() => false),
      captureFlag: vi.fn(() => false),
    };
    const deps = {
      gameManagerRef: {
        current: (withManager ? mgr : null) as unknown as GameManager | null,
      },
      clientsRef: { current: {} as Clients },
      addNotification: vi.fn(),
    };
    const refs = [0, 1, 2, 3].map(() => ({
      current: [0, 0, 0] as [number, number, number],
    }));
    const { result } = renderHook(() =>
      useBotPositionHandlers(deps, refs[0], refs[1], refs[2], refs[3]),
    );
    return { mgr, deps, refs, handlers: result.current };
  }

  it("records each bot's position locally and in the game manager", () => {
    const { mgr, deps, refs, handlers } = setupHandlers();
    const updates = [
      handlers.handleBot1PositionUpdate,
      handlers.handleBot2PositionUpdate,
      handlers.handleBot3PositionUpdate,
      handlers.handleBot4PositionUpdate,
    ];
    updates.forEach((update, i) => update([i, 0, i]));
    refs.forEach((r, i) => expect(r.current).toEqual([i, 0, i]));
    expect(Object.keys(deps.clientsRef.current)).toEqual([
      "bot-1",
      "bot-2",
      "bot-3",
      "bot-4",
    ]);
    expect(mgr.updatePlayerPosition).toHaveBeenCalledWith("bot-3", [2, 0, 2]);
  });

  it("announces CTF flag pickups and captures", () => {
    const { mgr, deps, handlers } = setupHandlers();
    mgr.pickupFlag.mockReturnValueOnce(true);
    handlers.handleBot2PositionUpdate([1, 0, 1]);
    expect(deps.addNotification).toHaveBeenLastCalledWith(
      "Bot2 grabbed a flag!",
      "warning",
    );

    mgr.captureFlag.mockReturnValueOnce(true);
    handlers.handleBot4PositionUpdate([1, 0, 1]);
    expect(deps.addNotification).toHaveBeenLastCalledWith(
      "Bot4 captured a flag for their team!",
      "warning",
    );

    handlers.handleBot1PositionUpdate([1, 0, 1]);
    expect(deps.addNotification).toHaveBeenCalledTimes(2);
  });

  it("skips flag logic outside an active CTF game and without a manager", () => {
    const { mgr, handlers } = setupHandlers();
    mgr.getGameState.mockReturnValue({ mode: "deathmatch", isActive: true });
    handlers.handleBot1PositionUpdate([0, 0, 0]);
    expect(mgr.pickupFlag).not.toHaveBeenCalled();

    const none = setupHandlers(false);
    none.handlers.handleBot1PositionUpdate([9, 9, 9]);
    expect(none.refs[0].current).toEqual([9, 9, 9]);
  });
});
