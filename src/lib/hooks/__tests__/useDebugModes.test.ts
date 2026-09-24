import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useBotDebugMode,
  useGalleryDebugMode,
  useAutoRestart,
} from "../useDebugModes";
import type GameManager from "../../../components/GameManager";
import type { GameState } from "../../../components/GameManager";

const gs = (partial: Partial<GameState>): GameState =>
  ({
    mode: "none",
    isActive: false,
    timeRemaining: 0,
    scores: {},
    ...partial,
  }) as GameState;

function fakeManager(itPlayerId = "bot-1") {
  const players = new Map<string, unknown>([["bot-1", {}]]);
  return {
    players,
    getPlayers: vi.fn(() => players),
    addPlayer: vi.fn((p: { id: string }) => players.set(p.id, p)),
    removePlayer: vi.fn((id: string) => players.delete(id)),
    startTagGame: vi.fn(),
    startShootingGalleryGame: vi.fn(),
    setItPlayer: vi.fn(),
    getGameState: vi.fn(() => gs({ mode: "tag", isActive: true, itPlayerId })),
  };
}

const ref = <T>(current: T) => ({ current });

describe("useDebugModes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("useBotDebugMode", () => {
    function setup(
      opts: {
        itPlayerId?: string;
        state?: GameState;
        noManager?: boolean;
      } = {},
    ) {
      const mgr = fakeManager(opts.itPlayerId);
      const deps = {
        gameManagerRef: ref(
          opts.noManager ? null : (mgr as unknown as GameManager),
        ),
        currentPlayerId: "player-1",
        setGameState: vi.fn(),
        setPlayerIsIt: vi.fn(),
        syncGameState: vi.fn(),
        addNotification: vi.fn(),
        debugRestartTimeoutRef: ref<ReturnType<typeof setTimeout> | null>(null),
      };
      const hook = renderHook(
        ({ on, state }: { on: boolean; state: GameState }) =>
          useBotDebugMode({ ...deps, botDebugMode: on, gameState: state }),
        { initialProps: { on: false, state: opts.state ?? gs({}) } },
      );
      return { mgr, deps, hook };
    }

    it("adds Bot2 and auto-starts a tag game when debug mode turns on", () => {
      const { mgr, deps, hook } = setup();
      expect(mgr.removePlayer).toHaveBeenCalledWith("bot-2"); // initial off state

      hook.rerender({ on: true, state: gs({}) });
      expect(mgr.addPlayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "bot-2", name: "Bot2" }),
      );
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mgr.startTagGame).toHaveBeenCalledTimes(1);
      expect(mgr.setItPlayer).not.toHaveBeenCalled();
      expect(deps.setGameState).toHaveBeenCalled();
      expect(deps.addNotification).toHaveBeenCalledWith(
        "Debug mode: Bot tag game started!",
        "info",
      );
    });

    it("never lets the player be IT in debug mode", () => {
      const { mgr, deps, hook } = setup({ itPlayerId: "player-1" });
      hook.rerender({ on: true, state: gs({}) });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mgr.setItPlayer).toHaveBeenCalledWith("bot-1");
      expect(deps.setPlayerIsIt).toHaveBeenCalledWith(false);
    });

    it("does not re-add Bot2 or auto-start when a game is already running", () => {
      const { mgr, hook } = setup();
      mgr.players.set("bot-2", {});
      hook.rerender({ on: true, state: gs({ mode: "tag", isActive: true }) });
      expect(mgr.addPlayer).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(mgr.startTagGame).not.toHaveBeenCalled();
    });

    it("cancels the pending auto-start and removes Bot2 when debug mode turns off", () => {
      const { mgr, hook } = setup();
      hook.rerender({ on: true, state: gs({}) });
      mgr.removePlayer.mockClear();
      hook.rerender({ on: false, state: gs({}) });
      expect(mgr.removePlayer).toHaveBeenCalledWith("bot-2");
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(mgr.startTagGame).not.toHaveBeenCalled();
    });

    it("restarts a finished game three seconds after it ends", () => {
      const { mgr, deps, hook } = setup({
        state: gs({ mode: "tag", isActive: true }),
      });
      mgr.players.set("bot-2", {});
      hook.rerender({ on: true, state: gs({ mode: "tag", isActive: true }) });
      hook.rerender({ on: true, state: gs({ mode: "tag", isActive: false }) });
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(mgr.startTagGame).toHaveBeenCalled();
      expect(deps.syncGameState).toHaveBeenCalled();
    });

    it("is a no-op without a game manager", () => {
      const { deps, hook } = setup({ noManager: true });
      hook.rerender({ on: true, state: gs({ mode: "tag", isActive: false }) });
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(deps.syncGameState).not.toHaveBeenCalled();
      hook.unmount();
    });

    it("auto-start bails if the manager disappears before the timer fires", () => {
      const { deps, hook } = setup();
      hook.rerender({ on: true, state: gs({}) });
      deps.gameManagerRef.current = null;
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(deps.setGameState).not.toHaveBeenCalled();
    });
  });

  describe("useGalleryDebugMode", () => {
    function setup(noManager = false) {
      const mgr = fakeManager();
      const deps = {
        gameManagerRef: ref(noManager ? null : (mgr as unknown as GameManager)),
        syncGameState: vi.fn(),
        galleryDebugRestartRef: ref<ReturnType<typeof setTimeout> | null>(null),
      };
      const hook = renderHook(
        ({ on, state }: { on: boolean; state: GameState }) =>
          useGalleryDebugMode({
            ...deps,
            galleryDebugMode: on,
            gameState: state,
          }),
        { initialProps: { on: false, state: gs({}) } },
      );
      return { mgr, deps, hook };
    }

    it("starts a gallery game quickly when first enabled", () => {
      const { mgr, deps, hook } = setup();
      hook.rerender({ on: true, state: gs({ mode: "none" }) });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mgr.startShootingGalleryGame).toHaveBeenCalledTimes(1);
      expect(deps.syncGameState).toHaveBeenCalled();
    });

    it("waits three seconds to restart after a gallery game ends", () => {
      const { mgr, hook } = setup();
      hook.rerender({
        on: true,
        state: gs({ mode: "shooting_gallery", isActive: false }),
      });
      act(() => {
        vi.advanceTimersByTime(2_900);
      });
      expect(mgr.startShootingGalleryGame).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(mgr.startShootingGalleryGame).toHaveBeenCalled();
    });

    it("does nothing while a game is active and cancels on disable", () => {
      const { mgr, deps, hook } = setup();
      hook.rerender({
        on: true,
        state: gs({ mode: "shooting_gallery", isActive: true }),
      });
      hook.rerender({ on: true, state: gs({ mode: "none" }) });
      hook.rerender({ on: false, state: gs({ mode: "none" }) });
      expect(deps.galleryDebugRestartRef.current).toBeNull();
      act(() => {
        vi.advanceTimersByTime(5_000);
      });
      expect(mgr.startShootingGalleryGame).not.toHaveBeenCalled();
    });

    it("skips the restart without a game manager", () => {
      const { deps, hook } = setup(true);
      hook.rerender({ on: true, state: gs({}) });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(deps.syncGameState).not.toHaveBeenCalled();
    });
  });

  describe("useAutoRestart", () => {
    const results = [
      { playerId: "p", playerName: "P", score: 3 },
    ] as unknown as GameState["gameResults"];

    function setup(initial: GameState) {
      const deps = {
        autoRestartIntervalRef: ref<ReturnType<typeof setInterval> | null>(
          null,
        ),
        setAutoRestartSecondsLeft: vi.fn(),
        onRestart: vi.fn(),
      };
      const hook = renderHook(
        ({ state, onRestart }: { state: GameState; onRestart: () => void }) =>
          useAutoRestart({ ...deps, gameState: state, onRestart }),
        { initialProps: { state: initial, onRestart: deps.onRestart } },
      );
      return { deps, hook };
    }

    it("counts down seven seconds after a combat game ends, then restarts the same mode", () => {
      const { deps, hook } = setup(
        gs({ mode: "deathmatch", isActive: false, gameResults: results }),
      );
      expect(deps.setAutoRestartSecondsLeft).toHaveBeenLastCalledWith(7);

      // A newer onRestart callback is picked up without restarting the countdown.
      const latest = vi.fn();
      hook.rerender({
        state: gs({
          mode: "deathmatch",
          isActive: false,
          gameResults: results,
        }),
        onRestart: latest,
      });

      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(deps.setAutoRestartSecondsLeft).toHaveBeenLastCalledWith(4);
      act(() => {
        vi.advanceTimersByTime(4_000);
      });
      expect(deps.setAutoRestartSecondsLeft).toHaveBeenLastCalledWith(null);
      expect(latest).toHaveBeenCalledWith("deathmatch");
      expect(deps.onRestart).not.toHaveBeenCalled();
      expect(deps.autoRestartIntervalRef.current).toBeNull();
    });

    it("cancels the countdown when a new game starts", () => {
      const { deps, hook } = setup(
        gs({ mode: "ctf", isActive: false, gameResults: results }),
      );
      hook.rerender({
        state: gs({ mode: "ctf", isActive: true }),
        onRestart: deps.onRestart,
      });
      expect(deps.setAutoRestartSecondsLeft).toHaveBeenLastCalledWith(null);
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(deps.onRestart).not.toHaveBeenCalled();
    });

    it("does not auto-restart non-combat modes", () => {
      const { deps, hook } = setup(
        gs({ mode: "tag", isActive: false, gameResults: results }),
      );
      expect(deps.setAutoRestartSecondsLeft).toHaveBeenLastCalledWith(null);
      // Existing interval is cleared on the non-combat branch too.
      deps.autoRestartIntervalRef.current = setInterval(() => {}, 1_000);
      hook.rerender({
        state: gs({
          mode: "shooting_gallery",
          isActive: false,
          gameResults: results,
        }),
        onRestart: deps.onRestart,
      });
      expect(deps.autoRestartIntervalRef.current).toBeNull();
      hook.unmount();
    });
  });
});
