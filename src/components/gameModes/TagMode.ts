import { createLogger } from "../../lib/utils/logger";
import type { GameState, KillEvent, Player } from "../GameManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";

const log = createLogger("TagMode");

const TAG_STREAK_THRESHOLDS = [3, 5, 7, 10] as const;
export const TAG_STREAK_LABELS: Record<number, string> = {
  3: "ON A ROLL",
  5: "TAGGING SPREE",
  7: "UNTOUCHABLE",
  10: "TAG GOD",
};
const TAG_STREAK_ANNOUNCE_MS = 3000;
const TAG_RESPAWN_MS = 3000;
const TAG_PLAYER_MAX_HP = 100;

/**
 * Tag rules with deathmatch health/respawn:
 * - IT player hits non-IT → instant tag transfer + respawn target (shot-as-tag preserved)
 * - Non-IT players deal normal damage to each other; death triggers respawn
 * - Respawn timer: 3 seconds
 */
export class TagMode implements GameModeHandler {
  private readonly MAX_TAG_SCORE = 300;
  private readonly MILLISECONDS_PER_SECOND = 1000;
  private readonly TAG_BACK_COOLDOWN_MS = 2000;
  private readonly TAG_FREEZE_MS = 1500;

  onStart(players: Map<string, Player>, gameState: GameState): void {
    const itPlayerId = this.pickRandomPlayer(players);
    gameState.itPlayerId = itPlayerId;
    gameState.killFeed = [];
    gameState.streakAnnouncement = undefined;

    players.forEach((player, id) => {
      gameState.scores[id] = 0;
      player.isIt = id === itPlayerId;
      player.timeAsIt = 0;
      player.lastTagTime = undefined;
      player.lastTaggedById = undefined;
      player.currentKillStreak = 0;
      player.health = TAG_PLAYER_MAX_HP;
      player.maxHealth = TAG_PLAYER_MAX_HP;
      player.respawnAt = undefined;
      player.spawnProtectedUntil = undefined;
    });
  }

  onTick(
    deltaTime: number,
    players: Map<string, Player>,
    gameState: GameState,
  ): void {
    gameState.timeRemaining -= deltaTime;

    const now = Date.now();

    // Process respawns
    players.forEach((player) => {
      if (player.respawnAt !== undefined && now >= player.respawnAt) {
        player.respawnAt = undefined;
        player.health = TAG_PLAYER_MAX_HP;
        player.spawnProtectedUntil = now + 2000;
      }
    });

    if (
      gameState.streakAnnouncement !== undefined &&
      now >= gameState.streakAnnouncement.timestamp + TAG_STREAK_ANNOUNCE_MS
    ) {
      gameState.streakAnnouncement = undefined;
    }
  }

  onAction(
    action: GameAction,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    if (action.type === "hit") {
      const { attackerId, targetId, damage, weaponId } = action;
      const attacker = players.get(attackerId);
      const target = players.get(targetId);
      if (!attacker || !target) return false;
      if (target.respawnAt !== undefined) return false;
      // Ignore hits on spawn-protected players
      if (
        target.spawnProtectedUntil !== undefined &&
        Date.now() < target.spawnProtectedUntil
      )
        return false;

      // IT player hitting non-IT: instant tag transfer (shot-as-tag preserved)
      if (attacker.isIt && !target.isIt) {
        const tagged = this.applyTag(attackerId, targetId, players, gameState);
        if (tagged) {
          // Respawn the newly IT player after a short delay
          target.health = TAG_PLAYER_MAX_HP;
          target.respawnAt = Date.now() + TAG_RESPAWN_MS;
        }
        return tagged;
      }

      // Non-IT hitting non-IT or non-IT hitting IT: normal damage
      target.health = Math.max(
        0,
        (target.health ?? TAG_PLAYER_MAX_HP) - damage,
      );
      if (target.health <= 0) {
        target.health = 0;
        target.respawnAt = Date.now() + TAG_RESPAWN_MS;
        const killEvent: KillEvent = {
          killerId: attackerId,
          killerName: attacker.name,
          targetId,
          targetName: target.name,
          weaponId: weaponId ?? "laser",
          timestamp: Date.now(),
        };
        if (!gameState.killFeed) gameState.killFeed = [];
        gameState.killFeed.push(killEvent);
        if (gameState.killFeed.length > 20) gameState.killFeed.shift();
        // If IT dies to a non-IT, pick a new IT
        if (target.isIt) {
          target.isIt = false;
          const survivors = Array.from(players.entries()).filter(
            ([id, p]) => id !== targetId && p.respawnAt === undefined,
          );
          if (survivors.length > 0) {
            const [newItId, newIt] =
              survivors[Math.floor(Math.random() * survivors.length)];
            newIt.isIt = true;
            gameState.itPlayerId = newItId;
          }
        }
      }
      return true;
    }
    if (action.type !== "tag") return false;
    const { taggerId, taggedId } = action;

    log.debug(
      `[TAG-TRACE] tagPlayer called with taggerId=${taggerId}, taggedId=${taggedId}`,
    );

    return this.applyTag(taggerId, taggedId, players, gameState);
  }

  private applyTag(
    taggerId: string,
    taggedId: string,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    const tagger = players.get(taggerId);
    const tagged = players.get(taggedId);

    if (!tagger || !tagged || !tagger.isIt || tagged.isIt) {
      log.debug(
        `[TAG-TRACE] Tag failed: tagger or tagged missing, or tagger not IT, or tagged already IT`,
        { tagger, tagged },
      );
      return false;
    }

    const now = Date.now();
    // Prevent a player who was just tagged (and is now IT) from instantly
    // tagging back the player who tagged them. Scoped to the specific
    // tagger/tagged pair so a freshly-tagged IT player can still chase down
    // a *different* player immediately.
    if (
      tagger.lastTaggedById === taggedId &&
      tagger.lastTagTime &&
      now - tagger.lastTagTime < this.TAG_BACK_COOLDOWN_MS
    ) {
      log.debug(
        `[TAG-TRACE] Tag failed: tag-back cooldown (${now - tagger.lastTagTime}ms < ${this.TAG_BACK_COOLDOWN_MS}ms)`,
      );
      return false;
    }
    // Prevent the new IT from being tagged again immediately (freeze/cooldown)
    if (tagged.lastTagTime && now - tagged.lastTagTime < this.TAG_FREEZE_MS) {
      log.debug(
        `[TAG-TRACE] Tag failed: tagged freeze/cooldown (${now - tagged.lastTagTime}ms < ${this.TAG_FREEZE_MS}ms)`,
      );
      return false;
    }

    // Points based on how quickly the tagger caught the previous IT.
    const timeAsIt = now - (gameState.roundStartTime || now);
    if (gameState.scores[taggerId] !== undefined) {
      gameState.scores[taggerId] += Math.max(
        0,
        this.MAX_TAG_SCORE - timeAsIt / this.MILLISECONDS_PER_SECOND,
      );
    }

    // Transfer 'it' status
    tagger.isIt = false;
    tagger.lastTagTime = now;
    tagged.isIt = true;
    tagged.lastTagTime = now;
    tagged.lastTaggedById = taggerId;

    gameState.itPlayerId = taggedId;
    gameState.roundStartTime = now;

    // Cumulative tag tally: each escape from IT earns a point toward callouts.
    // Never reset mid-round (being re-tagged doesn't erase your tally) so that
    // milestones are reachable in small games where IT always cycles back to you.
    tagger.currentKillStreak = (tagger.currentKillStreak ?? 0) + 1;

    const tally = tagger.currentKillStreak;
    if ((TAG_STREAK_THRESHOLDS as readonly number[]).includes(tally)) {
      gameState.streakAnnouncement = {
        killerName: tagger.name,
        count: tally,
        timestamp: now,
      };
    }

    const tagEvent: KillEvent = {
      killerId: taggerId,
      killerName: tagger.name,
      targetId: taggedId,
      targetName: tagged.name,
      weaponId: "tag",
      timestamp: now,
    };
    if (!gameState.killFeed) gameState.killFeed = [];
    gameState.killFeed.push(tagEvent);
    if (gameState.killFeed.length > 20) gameState.killFeed.shift();

    log.debug(
      `${tagger.name} tagged ${tagged.name}! ${tagged.name} is now IT!`,
    );
    return true;
  }

  onPlayerRemoved(
    playerId: string,
    players: Map<string, Player>,
    gameState: GameState,
  ): void {
    if (players.size === 0) {
      // No players remain; there is nothing to tag, so end the round
      // entirely rather than leaving a dangling itPlayerId/isActive state.
      gameState.isActive = false;
      gameState.mode = "none";
      gameState.itPlayerId = undefined;
      return;
    }

    const newItId = this.pickRandomPlayer(players);
    gameState.itPlayerId = newItId;

    players.forEach((player, id) => {
      player.isIt = id === newItId;
    });
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
      player.isIt = false;
      player.timeAsIt = 0;
      player.lastTagTime = undefined;
      player.lastTaggedById = undefined;
      player.currentKillStreak = 0;
      player.health = TAG_PLAYER_MAX_HP;
      player.respawnAt = undefined;
      player.spawnProtectedUntil = undefined;
    });

    gameState.killFeed = undefined;
    gameState.streakAnnouncement = undefined;
    return results;
  }

  private pickRandomPlayer(players: Map<string, Player>): string {
    const playerIds = Array.from(players.keys());
    return playerIds[Math.floor(Math.random() * playerIds.length)];
  }
}

export default TagMode;
