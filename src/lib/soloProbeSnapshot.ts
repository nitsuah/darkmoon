import type { TestSnapshot } from "./testProbe";
import type { Player, GameState } from "../components/GameManager";

export function createSoloProbeSnapshot(
  playerPosition: [number, number, number] | undefined,
  currentPlayerId: string | undefined,
  gameManager: {
    getGameState: () => GameState;
    getPlayers: () => Map<string, Player>;
  } | null,
): TestSnapshot {
  const position =
    playerPosition &&
    playerPosition.length >= 3 &&
    Number.isFinite(playerPosition[0]) &&
    Number.isFinite(playerPosition[1]) &&
    Number.isFinite(playerPosition[2])
      ? { x: playerPosition[0], y: playerPosition[1], z: playerPosition[2] }
      : null;

  let health: number | null = null;
  let ammo: number | null = null;
  let score: number | null = null;

  if (gameManager && currentPlayerId) {
    const state = gameManager.getGameState();
    const players = gameManager.getPlayers();
    const player = players.get(currentPlayerId);

    if (player) {
      health = typeof player.health === "number" ? player.health : null;
      ammo = player.currentAmmo !== undefined ? player.currentAmmo : null;

      const playerScore = state.scores[currentPlayerId];
      score = typeof playerScore === "number" ? playerScore : null;
    }
  }

  return { position, health, ammo, score };
}
