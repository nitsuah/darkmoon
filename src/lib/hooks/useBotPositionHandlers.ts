import { useCallback, MutableRefObject } from "react";
import GameManager from "../../components/GameManager";
import type { Clients } from "../../types/socket";
import type { Notification } from "./useNotifications";
import { ZERO_ROTATION } from "../constants/botConfigs";

type AddNotification = (msg: string, type?: Notification["type"]) => void;

interface Deps {
  gameManagerRef: MutableRefObject<GameManager | null>;
  clientsRef: MutableRefObject<Clients>;
  addNotification: AddNotification;
}

export function useBotPositionHandlers(
  deps: Deps,
  bot1PositionRef: MutableRefObject<[number, number, number]>,
  bot2PositionRef: MutableRefObject<[number, number, number]>,
  bot3PositionRef: MutableRefObject<[number, number, number]>,
  bot4PositionRef: MutableRefObject<[number, number, number]>,
) {
  const { gameManagerRef, clientsRef, addNotification } = deps;

  const handleBot1PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot1PositionRef.current = position;
      clientsRef.current["bot-1"] = { position, rotation: ZERO_ROTATION };
      const mgr = gameManagerRef.current;
      if (!mgr) return;
      mgr.updatePlayerPosition("bot-1", position);
      if (mgr.pickupFlag("bot-1")) {
        addNotification("Bot1 grabbed a flag!", "warning");
      } else if (mgr.captureFlag("bot-1")) {
        addNotification("Bot1 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameManagerRef/clientsRef/bot1PositionRef are stable MutableRefObjects; only addNotification is reactive
    [addNotification],
  );

  const handleBot2PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot2PositionRef.current = position;
      clientsRef.current["bot-2"] = { position, rotation: ZERO_ROTATION };
      const mgr = gameManagerRef.current;
      if (!mgr) return;
      mgr.updatePlayerPosition("bot-2", position);
      if (mgr.pickupFlag("bot-2")) {
        addNotification("Bot2 grabbed a flag!", "warning");
      } else if (mgr.captureFlag("bot-2")) {
        addNotification("Bot2 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameManagerRef/clientsRef/bot2PositionRef are stable MutableRefObjects; only addNotification is reactive
    [addNotification],
  );

  const handleBot3PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot3PositionRef.current = position;
      clientsRef.current["bot-3"] = { position, rotation: ZERO_ROTATION };
      const mgr = gameManagerRef.current;
      if (!mgr) return;
      mgr.updatePlayerPosition("bot-3", position);
      if (mgr.pickupFlag("bot-3")) {
        addNotification("Bot3 grabbed a flag!", "warning");
      } else if (mgr.captureFlag("bot-3")) {
        addNotification("Bot3 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameManagerRef/clientsRef/bot3PositionRef are stable MutableRefObjects; only addNotification is reactive
    [addNotification],
  );

  const handleBot4PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot4PositionRef.current = position;
      clientsRef.current["bot-4"] = { position, rotation: ZERO_ROTATION };
      const mgr = gameManagerRef.current;
      if (!mgr) return;
      mgr.updatePlayerPosition("bot-4", position);
      if (mgr.pickupFlag("bot-4")) {
        addNotification("Bot4 grabbed a flag!", "warning");
      } else if (mgr.captureFlag("bot-4")) {
        addNotification("Bot4 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameManagerRef/clientsRef/bot4PositionRef are stable MutableRefObjects; only addNotification is reactive
    [addNotification],
  );

  return {
    handleBot1PositionUpdate,
    handleBot2PositionUpdate,
    handleBot3PositionUpdate,
    handleBot4PositionUpdate,
  };
}
