import * as React from "react";
import type { GameManager } from "../../../components/GameManager";

declare global {
  interface WindowEventMap {
    "health-pickup": CustomEvent<{ amount: number }>;
  }
}

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
