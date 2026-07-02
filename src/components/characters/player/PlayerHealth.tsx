import * as React from "react";
import { useFrame } from "@react-three/fiber";
import type { GameManager } from "../../../components/GameManager";

interface PlayerHealthProps {
  /** Game manager for player state */
  gameManager: GameManager | null;
  /** Current player ID */
  currentPlayerId: string;
  /** Whether game is paused */
  isPaused: boolean;
}

export const PlayerHealth = React.memo(
  ({ gameManager, currentPlayerId, isPaused }: PlayerHealthProps) => {
    useFrame(() => {
      // Handle health pickups via window events
      // This is handled via useEffect in the main component
    });

    // Use effect for health pickup events
    React.useEffect(() => {
      function handleHealthPickup(event: CustomEvent) {
        if (!gameManager || isPaused) return;
        const amount = event.detail?.amount ?? 0;
        const me = gameManager.getPlayers().get(currentPlayerId);
        if (!me) return;
        const maxHp = me.maxHealth ?? 100;
        const newHp = Math.min(maxHp, (me.health ?? maxHp) + amount);
        gameManager.updatePlayer(currentPlayerId, { health: newHp });
      }
      window.addEventListener("health-pickup", handleHealthPickup);
      return () =>
        window.removeEventListener("health-pickup", handleHealthPickup);
    }, [gameManager, currentPlayerId, isPaused]);

    return null;
  },
);

PlayerHealth.displayName = "PlayerHealth";
