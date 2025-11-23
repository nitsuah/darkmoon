import { useState, useEffect, useRef, useCallback } from "react";
import GameManager, {
  GameState,
  Player,
} from "../../../components/GameManager";

/**
 * Hook for managing solo game state
 * Handles game initialization, IT status, scores, and game timer
 */
export const useSoloGame = (localPlayerId: string) => {
  const [gameState, setGameState] = useState<GameState>({
    mode: "none",
    isActive: false,
    timeRemaining: 0,
    scores: {},
  });
  const [gamePlayers, setGamePlayers] = useState<Map<string, Player>>(
    new Map()
  );
  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  const [botIsIt, setBotIsIt] = useState(false);
  const [bot2IsIt, setBot2IsIt] = useState(false);

  // Timestamps for when bots get tagged (to trigger freeze)
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);

  const gameManager = useRef<GameManager | null>(null);

  // Initialize game manager
  useEffect(() => {
    if (!gameManager.current) {
      gameManager.current = new GameManager();
    }
  }, []);

  // Game timer update - runs every second when game is active
  useEffect(() => {
    if (!gameState.isActive || !gameManager.current) return;

    const timerInterval = setInterval(() => {
      if (gameManager.current && gameState.isActive) {
        gameManager.current.updateGameTimer(1); // Update by 1 second
        setGameState(gameManager.current.getGameState());
      }
    }, 1000); // Every 1 second

    return () => clearInterval(timerInterval);
  }, [gameState.isActive]);

  // Handle tag events
  const handleTag = useCallback(
    (taggerId: string, taggedId: string) => {
      if (!gameManager.current) return;

      // Update IT status
      if (taggedId === localPlayerId) {
        setPlayerIsIt(true);
        setBotIsIt(false);
        setBot2IsIt(false);
      } else if (taggedId === "bot1") {
        setPlayerIsIt(false);
        setBotIsIt(true);
        setBot2IsIt(false);
        setBot1GotTagged(Date.now());
      } else if (taggedId === "bot2") {
        setPlayerIsIt(false);
        setBotIsIt(false);
        setBot2IsIt(true);
        setBot2GotTagged(Date.now());
      }

      // Record tag in game manager
      gameManager.current.recordTag(taggerId, taggedId);
      setGameState(gameManager.current.getGameState());
    },
    [localPlayerId]
  );

  // Start game
  const startGame = useCallback(
    (mode: "tag" | "collectible" | "race" = "tag") => {
      if (!gameManager.current) return;

      // Register players
      const players: Player[] = [
        { id: localPlayerId, name: "You", position: [0, 0.5, 0] },
        { id: "bot1", name: "Bot 1", position: [-5, 0.5, -5] },
        { id: "bot2", name: "Bot 2", position: [8, 0.5, -8] },
      ];

      gameManager.current.startGame(mode, players, localPlayerId);

      // Set initial IT status (player starts as IT)
      setPlayerIsIt(true);
      setBotIsIt(false);
      setBot2IsIt(false);

      // Update state
      setGameState(gameManager.current.getGameState());
      setGamePlayers(new Map(players.map((p) => [p.id, p])));
    },
    [localPlayerId]
  );

  // End game
  const endGame = useCallback(() => {
    if (!gameManager.current) return;

    gameManager.current.endGame();
    setGameState(gameManager.current.getGameState());

    // Reset IT status
    setPlayerIsIt(true);
    setBotIsIt(false);
    setBot2IsIt(false);
  }, []);

  return {
    gameState,
    gamePlayers,
    playerIsIt,
    botIsIt,
    bot2IsIt,
    bot1GotTagged,
    bot2GotTagged,
    gameManager,
    handleTag,
    startGame,
    endGame,
  };
};
