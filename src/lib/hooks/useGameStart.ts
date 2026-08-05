import { useCallback, MutableRefObject } from "react";
import GameManager, {
  GameMode,
  GameState,
  Player,
} from "../../components/GameManager";
import type { BotConfig } from "../../components/characters/useBotAI";
import type { AddNotification } from "./useNotifications";
import { ZERO_ROTATION } from "../constants/botConfigs";

interface Deps {
  gameManagerRef: MutableRefObject<GameManager | null>;
  setGameState: (s: GameState) => void;
  syncGameState: () => void;
  addNotification: AddNotification;
  currentPlayerId: string;
  BOT2_CONFIG: BotConfig;
  BOT3_CONFIG: BotConfig;
  BOT4_CONFIG: BotConfig;
}

function ensureBot(mgr: GameManager, id: string, config: BotConfig): void {
  if (!mgr.getPlayers().has(id)) {
    const bot: Player = {
      id,
      name: config.label || id,
      position: config.initialPosition,
      rotation: ZERO_ROTATION,
      isIt: false,
    };
    mgr.addPlayer(bot);
  }
}

export function useGameStart({
  gameManagerRef,
  setGameState,
  syncGameState,
  addNotification,
  currentPlayerId,
  BOT2_CONFIG,
  BOT3_CONFIG,
  BOT4_CONFIG,
}: Deps) {
  return useCallback(
    (mode: GameMode) => {
      const mgr = gameManagerRef.current;
      if (!mgr) return;

      if (mode === "shooting_gallery") {
        mgr.startShootingGalleryGame();
        syncGameState();
        addNotification(
          "Shooting Gallery! Hit targets to score. 🔴=10 🟠=25 🟡=50 ⭐=100",
          "info",
        );
        return;
      }

      if (mode === "deathmatch") {
        ensureBot(mgr, "bot-2", BOT2_CONFIG);
        ensureBot(mgr, "bot-3", BOT3_CONFIG);
        ensureBot(mgr, "bot-4", BOT4_CONFIG);
        mgr.startDeathmatchGame();
        const state = mgr.getGameState();
        setGameState(state);
        addNotification(
          `Deathmatch started! First to ${state.killLimit} kills wins!`,
          "warning",
        );
        return;
      }

      if (mode === "ctf") {
        ensureBot(mgr, "bot-2", BOT2_CONFIG);
        ensureBot(mgr, "bot-3", BOT3_CONFIG);
        ensureBot(mgr, "bot-4", BOT4_CONFIG);
        mgr.startCTFGame();
        const state = mgr.getGameState();
        setGameState(state);
        addNotification(
          "Capture the Flag started! Grab the enemy flag and bring it home!",
          "warning",
        );
        return;
      }

      // Tag (default)
      ensureBot(mgr, "bot-2", BOT2_CONFIG);
      mgr.startTagGame();
      const state = mgr.getGameState();
      setGameState(state);

      const itPlayerId = state.itPlayerId;
      if (itPlayerId === currentPlayerId) {
        addNotification("Tag game started! You're IT!", "warning");
      } else {
        const itPlayer = mgr.getPlayers().get(itPlayerId || "");
        addNotification(
          `Tag game started! ${itPlayer?.name || "Someone"} is IT!`,
          "info",
        );
      }
    },
    // gameManagerRef is a stable ref — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      setGameState,
      syncGameState,
      addNotification,
      currentPlayerId,
      BOT2_CONFIG,
      BOT3_CONFIG,
      BOT4_CONFIG,
    ],
  );
}
