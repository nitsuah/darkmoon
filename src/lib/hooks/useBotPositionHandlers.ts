import { useCallback, MutableRefObject } from "react";
import GameManager from "../../components/GameManager";
import type { Clients } from "../../types/socket";
import type { Notification } from "./useNotifications";

type AddNotification = (msg: string, type?: Notification["type"]) => void;

const ZERO_ROTATION: [number, number, number] = [0, 0, 0];

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
      gameManagerRef.current?.updatePlayerPosition("bot-1", position);
      if (gameManagerRef.current?.pickupFlag("bot-1")) {
        addNotification("bot-1 grabbed a flag!", "warning");
      } else if (gameManagerRef.current?.captureFlag("bot-1")) {
        addNotification("bot-1 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addNotification],
  );

  const handleBot2PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot2PositionRef.current = position;
      clientsRef.current["bot-2"] = { position, rotation: ZERO_ROTATION };
      gameManagerRef.current?.updatePlayerPosition("bot-2", position);
      if (gameManagerRef.current?.pickupFlag("bot-2")) {
        addNotification("bot-2 grabbed a flag!", "warning");
      } else if (gameManagerRef.current?.captureFlag("bot-2")) {
        addNotification("bot-2 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addNotification],
  );

  const handleBot3PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot3PositionRef.current = position;
      clientsRef.current["bot-3"] = { position, rotation: ZERO_ROTATION };
      gameManagerRef.current?.updatePlayerPosition("bot-3", position);
      if (gameManagerRef.current?.pickupFlag("bot-3")) {
        addNotification("bot-3 grabbed a flag!", "warning");
      } else if (gameManagerRef.current?.captureFlag("bot-3")) {
        addNotification("bot-3 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addNotification],
  );

  const handleBot4PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot4PositionRef.current = position;
      clientsRef.current["bot-4"] = { position, rotation: ZERO_ROTATION };
      gameManagerRef.current?.updatePlayerPosition("bot-4", position);
      if (gameManagerRef.current?.pickupFlag("bot-4")) {
        addNotification("bot-4 grabbed a flag!", "warning");
      } else if (gameManagerRef.current?.captureFlag("bot-4")) {
        addNotification("bot-4 captured a flag for their team!", "warning");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addNotification],
  );

  return {
    handleBot1PositionUpdate,
    handleBot2PositionUpdate,
    handleBot3PositionUpdate,
    handleBot4PositionUpdate,
  };
}
