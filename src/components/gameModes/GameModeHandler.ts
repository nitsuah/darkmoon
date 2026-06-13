import type { GameState, Player } from "../GameManager";

export interface GameResult {
  id: string;
  name: string;
  score: number;
}

/** A capture-the-flag flag, owned/defended by one team. */
export interface CTFFlag {
  /** Team this flag belongs to and must be defended by. */
  team: "a" | "b";
  /** Current position (at its base, or following its carrier). */
  position: [number, number, number];
  /** Home position; also the center of this team's capture zone. */
  basePosition: [number, number, number];
  /** ID of the player currently carrying this flag, if any. */
  carrierId?: string;
}

export type GameAction =
  | {
      type: "tag";
      taggerId: string;
      taggedId: string;
    }
  | {
      type: "hit";
      attackerId: string;
      targetId: string;
      damage: number;
    }
  | {
      type: "pickupFlag";
      playerId: string;
    }
  | {
      type: "captureFlag";
      playerId: string;
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
