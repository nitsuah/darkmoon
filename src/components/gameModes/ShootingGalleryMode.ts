import type { GameState, Player } from "../GameManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";

/**
 * Shooting Gallery: solo arcade mode — no bots, no PvP.
 * Targets pop up in the scene; the player earns points by hitting them.
 * Score tracked in gameState.scores[playerId], shot stats in
 * gameState.galleryShots / galleryHits.
 */
export class ShootingGalleryMode implements GameModeHandler {
  onStart(players: Map<string, Player>, gameState: GameState): void {
    players.forEach((_, id) => {
      gameState.scores[id] = 0;
    });
    gameState.galleryShots = 0;
    gameState.galleryHits = 0;
  }

  onTick(
    deltaTime: number,
    _players: Map<string, Player>,
    gameState: GameState,
  ): void {
    gameState.timeRemaining -= deltaTime;
  }

  // Gallery targets are handled by the ShootingGallery scene component, not
  // through GameAction. All GameActions are no-ops in this mode.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAction(_a: GameAction, _p: Map<string, Player>, _s: GameState): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPlayerRemoved(_id: string, _p: Map<string, Player>, _s: GameState): void {}

  onEnd(players: Map<string, Player>, gameState: GameState): GameResult[] {
    return Array.from(players.entries())
      .map(([id, p]) => ({
        id,
        name: p.name,
        score: gameState.scores[id] ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
  }
}

export default ShootingGalleryMode;
