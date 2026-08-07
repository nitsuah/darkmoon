import { useEffect, useRef, MutableRefObject } from "react";
import GameManager, {
  GameState,
  Player,
  StartableMode,
} from "../../components/GameManager";
import { createTagLogger } from "../utils/logger";
import type { AddNotification } from "./useNotifications";
import { ZERO_ROTATION } from "../constants/botConfigs";

const tagDebug = createTagLogger("DebugModes");

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
}: BotDebugDeps): void {
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

  // Add/remove Bot2 when debug mode toggles (restarts are handled by the 3s effect above)
  useEffect(() => {
    const mgr = gameManagerRef.current;
    if (!mgr) return;

    if (botDebugMode) {
      if (!mgr.getPlayers().has("bot-2")) {
        const bot2: Player = {
          id: "bot-2",
          name: "Bot2",
          position: [8, 0.5, -8],
          rotation: ZERO_ROTATION,
          isIt: false,
        };
        mgr.addPlayer(bot2);
        tagDebug("🤖 Bot2 added to game (debug mode)");
      }

      if (!gameState.isActive) {
        initTimerRef.current = setTimeout(() => {
          if (!gameManagerRef.current) return;
          gameManagerRef.current.startTagGame();
          const state = gameManagerRef.current.getGameState();

          // Force a bot to be IT in debug mode (never the player)
          if (state.itPlayerId === currentPlayerId) {
            gameManagerRef.current.setItPlayer("bot-1");
            setPlayerIsIt(false);
            tagDebug("🎮 Forced bot-1 to be IT (debug mode)");
          }

          setGameState(gameManagerRef.current.getGameState());
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
  }, [botDebugMode]);
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
  onRestart: (mode: StartableMode) => void;
}

export function useAutoRestart({
  gameState,
  autoRestartIntervalRef,
  setAutoRestartSecondsLeft,
  onRestart,
}: AutoRestartDeps): void {
  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  }, [onRestart]);

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
          onRestartRef.current(gameState.mode as StartableMode);
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
  }, [gameState.isActive, gameState.mode, gameState.gameResults]);
}
