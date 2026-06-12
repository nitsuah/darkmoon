import type { GameState, Player } from "../GameManager";

export interface GameResult {
  id: string;
  name: string;
  score: number;
}

export type GameAction = {
  type: "tag";
  taggerId: string;
  taggedId: string;
};

/**
 * Mode-specific rules for a GameManager-hosted game. GameManager owns the
 * players map and gameState and delegates rule decisions to the active
 * handler, so new modes (deathmatch, CTF, ...) can be added without
 * entangling their rules with unrelated modes.
 */
export interface GameModeHandler {
  /** Initialize gameState/players for a (re)start of this mode. */
  onStart(players: Map<string, Player>, gameState: GameState): void;

  /** Advance mode-specific state by deltaTime (seconds). */
  onTick(
    deltaTime: number,
    players: Map<string, Player>,
    gameState: GameState,
  ): void;

  /** Handle a game action. Returns true if it was accepted/applied. */
  onAction(
    action: GameAction,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean;

  /** React to a player being removed mid-game (e.g. disconnect). */
  onPlayerRemoved(
    playerId: string,
    players: Map<string, Player>,
    gameState: GameState,
  ): void;

  /** Finalize the round and return sorted results. */
  onEnd(players: Map<string, Player>, gameState: GameState): GameResult[];
}
