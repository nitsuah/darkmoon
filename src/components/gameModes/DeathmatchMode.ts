import { createLogger } from "../../lib/utils/logger";
import type { GameState, KillEvent, Player } from "../GameManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";

const log = createLogger("DeathmatchMode");

/**
 * Deathmatch rules: every player starts with full health and damages others
 * with weapon hits. A lethal hit awards the attacker a kill and puts the
 * target on a brief respawn timer; reaching killLimit ends the round.
 */
export class DeathmatchMode implements GameModeHandler {
  private readonly DEFAULT_MAX_HEALTH = 100;
  private readonly RESPAWN_DELAY_MS = 3000;
  private readonly SPAWN_PROTECT_MS = 2000;

  onStart(players: Map<string, Player>, gameState: GameState): void {
    players.forEach((player, id) => {
      gameState.scores[id] = 0;
      player.maxHealth = player.maxHealth ?? this.DEFAULT_MAX_HEALTH;
      player.health = player.maxHealth;
      player.respawnAt = undefined;
    });
  }

  onTick(
    deltaTime: number,
    players: Map<string, Player>,
    gameState: GameState,
  ): void {
    gameState.timeRemaining -= deltaTime;

    const now = Date.now();
    players.forEach((player) => {
      if (player.respawnAt !== undefined && now >= player.respawnAt) {
        player.health = player.maxHealth ?? this.DEFAULT_MAX_HEALTH;
        player.respawnAt = undefined;
        player.spawnProtectedUntil = now + this.SPAWN_PROTECT_MS;
      }
      // Expire spawn protection
      if (
        player.spawnProtectedUntil !== undefined &&
        now >= player.spawnProtectedUntil
      ) {
        player.spawnProtectedUntil = undefined;
      }
    });
  }

  onAction(
    action: GameAction,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    if (action.type !== "hit") return false;
    const { attackerId, targetId, damage, weaponId } = action;

    if (attackerId === targetId) return false;

    const attacker = players.get(attackerId);
    const target = players.get(targetId);
    if (!attacker || !target) return false;

    // A downed player awaiting respawn, or one still under spawn protection, can't take damage.
    if (target.respawnAt !== undefined) return false;
    if (
      target.spawnProtectedUntil !== undefined &&
      Date.now() < target.spawnProtectedUntil
    )
      return false;

    const maxHealth = target.maxHealth ?? this.DEFAULT_MAX_HEALTH;
    const currentHealth = target.health ?? maxHealth;
    target.health = Math.max(0, currentHealth - damage);

    if (target.health === 0) {
      gameState.scores[attackerId] = (gameState.scores[attackerId] ?? 0) + 1;
      target.respawnAt = Date.now() + this.RESPAWN_DELAY_MS;

      log.debug(
        `${attacker.name} eliminated ${target.name}! (${gameState.scores[attackerId]} kills)`,
      );

      const killEvent: KillEvent = {
        killerId: attackerId,
        killerName: attacker.name,
        targetId,
        targetName: target.name,
        weaponId: weaponId ?? "unknown",
        timestamp: Date.now(),
      };
      if (!gameState.killFeed) gameState.killFeed = [];
      gameState.killFeed.push(killEvent);
      if (gameState.killFeed.length > 10) gameState.killFeed.shift();

      if (
        gameState.killLimit !== undefined &&
        gameState.scores[attackerId] >= gameState.killLimit
      ) {
        gameState.timeRemaining = 0;
      }
    }

    return true;
  }

  onPlayerRemoved(): void {
    // No shared role (e.g. "IT") to reassign when a player leaves.
  }

  onEnd(players: Map<string, Player>, gameState: GameState): GameResult[] {
    const results = Array.from(players.entries())
      .map(([id, player]) => ({
        id,
        name: player.name,
        score: gameState.scores[id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    players.forEach((player) => {
      player.health = player.maxHealth;
      player.respawnAt = undefined;
      player.spawnProtectedUntil = undefined;
    });

    return results;
  }
}

export default DeathmatchMode;
