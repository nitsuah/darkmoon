import { createLogger } from "../../lib/utils/logger";
import type { GameState, Player } from "../GameManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";

const log = createLogger("TagMode");

/**
 * Classic tag rules: one player is "IT" and tags others to pass on the
 * role. Scores reward fast tags; cooldowns prevent instant tag-back
 * ping-pong and give a freshly-tagged player a moment to react.
 */
export class TagMode implements GameModeHandler {
  // Scoring constants
  private readonly MAX_TAG_SCORE = 300;
  private readonly MILLISECONDS_PER_SECOND = 1000;

  // Prevents a player who was just tagged (and is now IT) from instantly
  // tagging back the player who tagged them.
  private readonly TAG_BACK_COOLDOWN_MS = 2000;
  // Prevents a player who was just tagged from being tagged again by anyone
  // (gives them a moment to react/move before becoming a target again).
  private readonly TAG_FREEZE_MS = 1500;

  onStart(players: Map<string, Player>, gameState: GameState): void {
    const itPlayerId = this.pickRandomPlayer(players);
    gameState.itPlayerId = itPlayerId;

    players.forEach((player, id) => {
      gameState.scores[id] = 0;
      player.isIt = id === itPlayerId;
      player.timeAsIt = 0;
      player.lastTagTime = undefined;
      player.lastTaggedById = undefined;
    });
  }

  onTick(
    deltaTime: number,
    _players: Map<string, Player>,
    gameState: GameState,
  ): void {
    gameState.timeRemaining -= deltaTime;
  }

  onAction(
    action: GameAction,
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
    // A laser "hit" in tag mode works as a ranged tag — no health damage, just IT transfer.
    if (action.type === "hit") {
      const { attackerId, targetId } = action;
      return this.applyTag(attackerId, targetId, players, gameState);
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
    });

    return results;
  }

  private pickRandomPlayer(players: Map<string, Player>): string {
    const playerIds = Array.from(players.keys());
    return playerIds[Math.floor(Math.random() * playerIds.length)];
  }
}

export default TagMode;
