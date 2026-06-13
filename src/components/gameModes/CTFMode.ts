import { createLogger } from "../../lib/utils/logger";
import type { GameState, Player } from "../GameManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";

const log = createLogger("CTFMode");

/** Home base / capture zone for team "a", at the west end of the arena. */
export const TEAM_A_BASE: [number, number, number] = [-15, 0.5, 0];
/** Home base / capture zone for team "b", at the east end of the arena. */
export const TEAM_B_BASE: [number, number, number] = [15, 0.5, 0];

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Capture-the-flag rules: players alternate onto team "a"/"b" at the start
 * of the round, each defending a flag at their team's base. Picking up the
 * enemy flag and carrying it back to your own base scores a point for your
 * team and returns the flag to its base.
 */
export class CTFMode implements GameModeHandler {
  private readonly PICKUP_RADIUS = 1.5;
  private readonly CAPTURE_RADIUS = 2;

  onStart(players: Map<string, Player>, gameState: GameState): void {
    gameState.scores = { a: 0, b: 0 };
    gameState.flags = [
      { team: "a", position: [...TEAM_A_BASE], basePosition: [...TEAM_A_BASE] },
      { team: "b", position: [...TEAM_B_BASE], basePosition: [...TEAM_B_BASE] },
    ];

    let i = 0;
    players.forEach((player) => {
      player.team = i % 2 === 0 ? "a" : "b";
      i++;
    });
  }

  onTick(
    deltaTime: number,
    players: Map<string, Player>,
    gameState: GameState,
  ): void {
    gameState.timeRemaining -= deltaTime;

    // Carried flags follow their carrier's position.
    gameState.flags?.forEach((flag) => {
      if (flag.carrierId === undefined) return;
      const carrier = players.get(flag.carrierId);
      if (carrier) flag.position = carrier.position;
    });
  }

  onAction(
    action: GameAction,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    if (action.type === "pickupFlag") {
      return this.pickupFlag(action.playerId, players, gameState);
    }
    if (action.type === "captureFlag") {
      return this.captureFlag(action.playerId, players, gameState);
    }
    return false;
  }

  private pickupFlag(
    playerId: string,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    const player = players.get(playerId);
    if (!player || !player.team || !gameState.flags) return false;

    // Only the enemy team's flag can be picked up, and only while it's
    // sitting unguarded (not already carried).
    const flag = gameState.flags.find(
      (f) => f.team !== player.team && f.carrierId === undefined,
    );
    if (!flag) return false;

    if (distance(player.position, flag.position) > this.PICKUP_RADIUS) {
      return false;
    }

    flag.carrierId = playerId;
    log.debug(`${player.name} picked up team ${flag.team}'s flag!`);
    return true;
  }

  private captureFlag(
    playerId: string,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    const player = players.get(playerId);
    if (!player || !player.team || !gameState.flags) return false;

    const carriedFlag = gameState.flags.find((f) => f.carrierId === playerId);
    if (!carriedFlag) return false;

    const ownFlag = gameState.flags.find((f) => f.team === player.team);
    if (!ownFlag) return false;

    if (distance(player.position, ownFlag.basePosition) > this.CAPTURE_RADIUS) {
      return false;
    }

    gameState.scores[player.team] = (gameState.scores[player.team] ?? 0) + 1;
    carriedFlag.carrierId = undefined;
    carriedFlag.position = [...carriedFlag.basePosition];

    log.debug(
      `${player.name} captured team ${carriedFlag.team}'s flag for team ${player.team}! (${gameState.scores[player.team]} captures)`,
    );
    return true;
  }

  onPlayerRemoved(
    playerId: string,
    _players: Map<string, Player>,
    gameState: GameState,
  ): void {
    // A departing carrier drops the flag back at its base rather than
    // leaving it stuck on a player who no longer exists.
    gameState.flags?.forEach((flag) => {
      if (flag.carrierId === playerId) {
        flag.carrierId = undefined;
        flag.position = [...flag.basePosition];
      }
    });
  }

  onEnd(players: Map<string, Player>, gameState: GameState): GameResult[] {
    const results = Array.from(players.entries())
      .map(([id, player]) => ({
        id,
        name: player.name,
        score: gameState.scores[player.team ?? ""] ?? 0,
      }))
      .sort((a, b) => b.score - a.score);

    players.forEach((player) => {
      player.team = undefined;
    });

    return results;
  }
}

export default CTFMode;
