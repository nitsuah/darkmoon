import { useCallback, useMemo, MutableRefObject } from "react";
import GameManager from "../../components/GameManager";
import type { Clients } from "../../types/socket";
import type { AddNotification } from "./useNotifications";
import { ZERO_ROTATION } from "../constants/botConfigs";

interface Deps {
  gameManagerRef: MutableRefObject<GameManager | null>;
  clientsRef: MutableRefObject<Clients>;
  addNotification: AddNotification;
}

export interface BotPositionHandlers {
  handleBot1PositionUpdate: (position: [number, number, number]) => void;
  handleBot2PositionUpdate: (position: [number, number, number]) => void;
  handleBot3PositionUpdate: (position: [number, number, number]) => void;
  handleBot4PositionUpdate: (position: [number, number, number]) => void;
}

export function useBotPositionHandlers(
  deps: Deps,
  bot1PositionRef: MutableRefObject<[number, number, number]>,
  bot2PositionRef: MutableRefObject<[number, number, number]>,
  bot3PositionRef: MutableRefObject<[number, number, number]>,
  bot4PositionRef: MutableRefObject<[number, number, number]>,
): BotPositionHandlers {
  const { gameManagerRef, clientsRef, addNotification } = deps;

  const makeHandler = useCallback(
    (
      botId: string,
      label: string,
      positionRef: MutableRefObject<[number, number, number]>,
    ) =>
      (position: [number, number, number]) => {
        positionRef.current = position;
        clientsRef.current[botId] = { position, rotation: ZERO_ROTATION };
        const mgr = gameManagerRef.current;
        if (!mgr) return;
        mgr.updatePlayerPosition(botId, position);
        const state = mgr.getGameState();
        if (state.mode === "ctf" && state.isActive) {
          if (mgr.pickupFlag(botId)) {
            addNotification(`${label} grabbed a flag!`, "warning");
          } else if (mgr.captureFlag(botId)) {
            addNotification(
              `${label} captured a flag for their team!`,
              "warning",
            );
          }
        }
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameManagerRef/clientsRef are stable MutableRefObjects; only addNotification is reactive
    [addNotification],
  );

  return useMemo(
    () => ({
      handleBot1PositionUpdate: makeHandler("bot-1", "Bot1", bot1PositionRef),
      handleBot2PositionUpdate: makeHandler("bot-2", "Bot2", bot2PositionRef),
      handleBot3PositionUpdate: makeHandler("bot-3", "Bot3", bot3PositionRef),
      handleBot4PositionUpdate: makeHandler("bot-4", "Bot4", bot4PositionRef),
    }),
    [
      makeHandler,
      bot1PositionRef,
      bot2PositionRef,
      bot3PositionRef,
      bot4PositionRef,
    ],
  );
}
