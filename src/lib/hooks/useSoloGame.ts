import { useCallback, useRef } from "react";
import GameManager, {
  type GameState,
  type Player,
} from "../../components/GameManager";
import type { Socket } from "socket.io-client";

export const useSoloGame = () => {
  const gameManagerRef = useRef<GameManager | null>(null);

  const initializeForSocket = useCallback(
    (
      socket: Socket,
      {
        setGamePlayers,
        setGameState,
        setPlayerIsIt,
      }: {
        setGamePlayers: (m: Map<string, Player>) => void;
        setGameState: (s: GameState) => void;
        setPlayerIsIt: (v: boolean) => void;
      }
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

      // Add bot player so tag game can start
      const botPlayer: Player = {
        id: "bot-1",
        name: "Bot",
        position: [5, 0.5, -5],
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
