import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BOT1_CONFIG } from "../constants/botConfigs";
import type { BotConfig } from "../../components/characters/useBotAI";
import GameManager, {
  type GameState,
  type Player,
} from "../../components/GameManager";
import type { Socket } from "socket.io-client";

// Accept either a real Socket or a lightweight object with an optional id for tests
type SocketLike = Socket | { id?: string };

export const useSoloGame = () => {
  const gameManagerRef = useRef<GameManager | null>(null);

  const initializeForSocket = useCallback(
    (
      socket: SocketLike,
      {
        setGamePlayers,
        setGameState,
        setPlayerIsIt,
      }: {
        setGamePlayers: Dispatch<SetStateAction<Map<string, Player>>>;
        setGameState: Dispatch<SetStateAction<GameState>>;
        setPlayerIsIt: Dispatch<SetStateAction<boolean>>;
      },
      botConfig: BotConfig = BOT1_CONFIG
    ) => {
      if (gameManagerRef.current) return gameManagerRef.current;

      const manager = new GameManager();

      // Add solo player
      const soloPlayer: Player = {
        id: socket.id || "solo",
        name: "Solo Player",
        position: [0, 1, 0],
        rotation: [0, 0, 0],
        isIt: false,
      };
      manager.addPlayer(soloPlayer);

      // Add bot player so tag game can start (configurable)
      const botPlayer: Player = {
        id: "bot-1",
        name: botConfig.label || "Bot",
        position: botConfig.initialPosition,
        rotation: [0, 0, 0],
        isIt: false,
      };
      manager.addPlayer(botPlayer);

      manager.setCallbacks({
        onGameStateUpdate: (state) => {
          setGameState(state);
        },
        onPlayerUpdate: (players) => {
          setGamePlayers(new Map(players));
          const soloPlayerId = socket.id || "solo";
          const solo = players.get(soloPlayerId);
          if (solo) setPlayerIsIt(solo.isIt || false);
          // Bot IT state is available via gameManager players; local setters removed
        },
      });

      gameManagerRef.current = manager;
      setGamePlayers(new Map(manager.getPlayers()));

      return manager;
    },
    []
  );

  return { gameManagerRef, initializeForSocket } as const;
};

// Helper to attach GameManager lifecycle to a socket connection utility
export const attachToConnection = (
  getSocket: () => SocketLike | null,
  connect: () => SocketLike | null,
  initializeForSocket: (
    socket: SocketLike,
    handlers: {
      setGamePlayers: Dispatch<SetStateAction<Map<string, Player>>>;
      setGameState: Dispatch<SetStateAction<GameState>>;
      setPlayerIsIt: Dispatch<SetStateAction<boolean>>;
    }
  ) => GameManager | null,
  handlers: {
    setGamePlayers: Dispatch<SetStateAction<Map<string, Player>>>;
    setGameState: Dispatch<SetStateAction<GameState>>;
    setPlayerIsIt: Dispatch<SetStateAction<boolean>>;
  }
): (() => void) => {
  // Mirror the page-level connect logic here so Solo.tsx stays thin
  const socket = connect();

  const onConnect = () => {
    const s = getSocket() || socket;
    if (!s) return;
    // Initialize game manager when socket connects
    initializeForSocket(s, handlers);
  };
  // Type guard for objects that expose event methods like socket.io clients
  const isEvented = (
    v: unknown
  ): v is {
    on?: (ev: string, cb: (...args: unknown[]) => void) => void;
    off?: (ev: string, cb?: (...args: unknown[]) => void) => void;
    connect?: () => void;
  } =>
    typeof v === "object" &&
    v !== null &&
    (typeof (v as { on?: unknown }).on === "function" ||
      typeof (v as { connect?: unknown }).connect === "function");

  try {
    const s = getSocket() || socket;
    if (isEvented(s) && typeof s.on === "function") {
      s.on("connect", onConnect);
    }
  } catch {
    // ignore
  }

  try {
    if (isEvented(socket) && typeof socket.connect === "function") {
      socket.connect();
    }
  } catch {
    // ignore
  }

  // Return cleanup fn for useEffect
  return () => {
    try {
      const s = getSocket() || socket;
      if (isEvented(s) && typeof s.off === "function") {
        s.off("connect", onConnect);
      }
    } catch {
      // ignore
    }
  };
};
