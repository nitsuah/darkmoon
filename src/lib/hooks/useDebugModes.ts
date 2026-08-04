import { useEffect, useRef, MutableRefObject } from "react";
import GameManager, { GameState, Player } from "../../components/GameManager";
import { createTagLogger } from "../utils/logger";
import type { Notification } from "./useNotifications";

type AddNotification = (msg: string, type?: Notification["type"]) => void;

const tagDebug = createTagLogger("Solo");
const ZERO_ROTATION: [number, number, number] = [0, 0, 0];

interface BotDebugDeps {
  botDebugMode: boolean;
  gameState: GameState;
  gameManagerRef: MutableRefObject<GameManager | null>;
  currentPlayerId: string;
  setGameState: (s: GameState) => void;
  setPlayerIsIt: (v: boolean) => void;
  syncGameState: () => void;
  addNotification: AddNotification;
  debugRestartTimeoutRef: MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
}

export function useBotDebugMode({
  botDebugMode,
  gameState,
  gameManagerRef,
  currentPlayerId,
  setGameState,
  setPlayerIsIt,
  syncGameState,
  addNotification,
  debugRestartTimeoutRef,
}: BotDebugDeps) {
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-restart when game ends in debug mode
  useEffect(() => {
    if (botDebugMode && !gameState.isActive && gameState.mode !== "none") {
      tagDebug("🔄 Bot debug mode: Game ended, restarting in 3 seconds...");
      if (debugRestartTimeoutRef.current) {
        clearTimeout(debugRestartTimeoutRef.current);
      }
      debugRestartTimeoutRef.current = setTimeout(() => {
        if (gameManagerRef.current) {
          tagDebug("🎮 Bot debug mode: Starting new tag game!");
          gameManagerRef.current.startTagGame();
          syncGameState();
        }
      }, 3000);
    }
    return () => {
      if (debugRestartTimeoutRef.current) {
        clearTimeout(debugRestartTimeoutRef.current);
        debugRestartTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botDebugMode, gameState.isActive, gameState.mode]);

  // Add/remove Bot2 when debug mode toggles
  useEffect(() => {
    const mgr = gameManagerRef.current;
    if (!mgr) return;

    if (botDebugMode) {
      const bot2: Player = {
        id: "bot-2",
        name: "Bot2",
        position: [8, 0.5, -8],
        rotation: ZERO_ROTATION,
        isIt: false,
      };
      mgr.addPlayer(bot2);
      tagDebug("🤖 Bot2 added to game (debug mode)");

      if (!gameState.isActive) {
        initTimerRef.current = setTimeout(() => {
          if (!gameManagerRef.current) return;
          gameManagerRef.current.startTagGame();
          const state = gameManagerRef.current.getGameState();

          // Force a bot to be IT in debug mode (never the player)
          if (state.itPlayerId === currentPlayerId) {
            state.itPlayerId = "bot-1";
            (gameManagerRef.current as unknown as Record<string, unknown>)[
              "gameState"
            ] = state;
            gameManagerRef.current.updatePlayer(currentPlayerId, {
              isIt: false,
            });
            gameManagerRef.current.updatePlayer("bot-1", { isIt: true });
            setPlayerIsIt(false);
            tagDebug("🎮 Forced bot-1 to be IT (debug mode)");
          }

          setGameState(state);
          addNotification("Debug mode: Bot tag game started!", "info");
          tagDebug("🎮 Auto-started tag game for debug mode");
        }, 500);
      }
    } else {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
      mgr.removePlayer("bot-2");
      tagDebug("🤖 Bot2 removed from game");
    }
    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botDebugMode, gameState.isActive]);
}

interface GalleryDebugDeps {
  galleryDebugMode: boolean;
  gameState: GameState;
  gameManagerRef: MutableRefObject<GameManager | null>;
  syncGameState: () => void;
  galleryDebugRestartRef: MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
}

export function useGalleryDebugMode({
  galleryDebugMode,
  gameState,
  gameManagerRef,
  syncGameState,
  galleryDebugRestartRef,
}: GalleryDebugDeps) {
  useEffect(() => {
    if (!galleryDebugMode) return;

    if (!gameState.isActive && gameState.mode !== "shooting_gallery") {
      const t = setTimeout(() => {
        if (gameManagerRef.current) {
          gameManagerRef.current.startShootingGalleryGame();
          syncGameState();
        }
      }, 500);
      galleryDebugRestartRef.current = t;
    } else if (!gameState.isActive && gameState.mode === "shooting_gallery") {
      const t = setTimeout(() => {
        if (gameManagerRef.current) {
          gameManagerRef.current.startShootingGalleryGame();
          syncGameState();
        }
      }, 3000);
      galleryDebugRestartRef.current = t;
    }

    return () => {
      if (galleryDebugRestartRef.current) {
        clearTimeout(galleryDebugRestartRef.current);
        galleryDebugRestartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryDebugMode, gameState.isActive, gameState.mode]);
}

interface AutoRestartDeps {
  gameState: GameState;
  autoRestartIntervalRef: MutableRefObject<ReturnType<
    typeof setInterval
  > | null>;
  setAutoRestartSecondsLeft: (n: number | null) => void;
  onRestart: (mode: string) => void;
}

export function useAutoRestart({
  gameState,
  autoRestartIntervalRef,
  setAutoRestartSecondsLeft,
  onRestart,
}: AutoRestartDeps) {
  useEffect(() => {
    const isCombat =
      gameState.mode === "deathmatch" || gameState.mode === "ctf";
    if (
      !gameState.isActive &&
      gameState.gameResults &&
      gameState.gameResults.length > 0 &&
      isCombat
    ) {
      const AUTO_RESTART_SECS = 7;
      setAutoRestartSecondsLeft(AUTO_RESTART_SECS);
      let remaining = AUTO_RESTART_SECS;
      autoRestartIntervalRef.current = setInterval(() => {
        remaining--;
        setAutoRestartSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(autoRestartIntervalRef.current!);
          autoRestartIntervalRef.current = null;
          setAutoRestartSecondsLeft(null);
          onRestart(gameState.mode);
        }
      }, 1000);
    } else {
      if (autoRestartIntervalRef.current) {
        clearInterval(autoRestartIntervalRef.current);
        autoRestartIntervalRef.current = null;
      }
      setAutoRestartSecondsLeft(null);
    }
    return () => {
      if (autoRestartIntervalRef.current) {
        clearInterval(autoRestartIntervalRef.current);
        autoRestartIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isActive, gameState.mode]);
}
