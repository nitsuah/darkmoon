import { createLogger } from "../../lib/utils/logger";
import type { GameState, KillEvent, Player } from "../GameManager";
import { WEAPONS } from "../combat/WeaponManager";
import type {
  GameAction,
  GameModeHandler,
  GameResult,
} from "./GameModeHandler";
import { STREAK_THRESHOLDS, STREAK_ANNOUNCE_MS } from "./DeathmatchMode";

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
 * team and returns the flag to its base. Weapon hits (Phase B) are also
 * live: a downed player drops any flag they're carrying and sits out for a
 * brief respawn delay, mirroring DeathmatchMode but without kill scoring -
 * only flag captures count toward gameState.scores.
 */
export class CTFMode implements GameModeHandler {
  private readonly PICKUP_RADIUS = 1.5;
  private readonly CAPTURE_RADIUS = 2;
  private readonly DEFAULT_MAX_HEALTH = 100;
  private readonly RESPAWN_DELAY_MS = 3000;
  private readonly SPAWN_PROTECT_MS = 2000;

  onStart(players: Map<string, Player>, gameState: GameState): void {
    gameState.scores = { a: 0, b: 0 };
    gameState.flags = [
      { team: "a", position: [...TEAM_A_BASE], basePosition: [...TEAM_A_BASE] },
      { team: "b", position: [...TEAM_B_BASE], basePosition: [...TEAM_B_BASE] },
    ];

    let i = 0;
    players.forEach((player) => {
      player.team = i % 2 === 0 ? "a" : "b";
      player.maxHealth = player.maxHealth ?? this.DEFAULT_MAX_HEALTH;
      player.health = player.maxHealth;
      player.respawnAt = undefined;
      player.currentKillStreak = 0;
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

    const now = Date.now();
    players.forEach((player) => {
      if (player.respawnAt !== undefined && now >= player.respawnAt) {
        player.health = player.maxHealth ?? this.DEFAULT_MAX_HEALTH;
        player.respawnAt = undefined;
        player.spawnProtectedUntil = now + this.SPAWN_PROTECT_MS;
      }
      if (
        player.spawnProtectedUntil !== undefined &&
        now >= player.spawnProtectedUntil
      ) {
        player.spawnProtectedUntil = undefined;
      }
    });

    if (
      gameState.streakAnnouncement !== undefined &&
      now >= gameState.streakAnnouncement.timestamp + STREAK_ANNOUNCE_MS
    ) {
      gameState.streakAnnouncement = undefined;
    }
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
    if (action.type === "hit") {
      return this.hit(action, players, gameState);
    }
    return false;
  }

  private hit(
    action: {
      attackerId: string;
      targetId: string;
      damage: number;
      weaponId?: string;
    },
    players: Map<string, Player>,
    gameState: GameState,
  ): boolean {
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
      this.applyDown(
        attackerId,
        targetId,
        weaponId,
        attacker,
        target,
        gameState,
      );
    }

    // Rocket splash: deal splash damage to bystanders within splashRadius of the target
    const weaponDef = weaponId ? WEAPONS[weaponId] : undefined;
    if (weaponDef?.splashRadius && weaponDef.splashDamage) {
      const { splashRadius, splashDamage } = weaponDef;
      players.forEach((nearby, nearbyId) => {
        if (nearbyId === attackerId || nearbyId === targetId) return;
        if (nearby.respawnAt !== undefined) return;
        if (
          nearby.spawnProtectedUntil !== undefined &&
          Date.now() < nearby.spawnProtectedUntil
        )
          return;
        const dx = target.position[0] - nearby.position[0];
        const dy = target.position[1] - nearby.position[1];
        const dz = target.position[2] - nearby.position[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) > splashRadius) return;

        const nearbyMax = nearby.maxHealth ?? this.DEFAULT_MAX_HEALTH;
        nearby.health = Math.max(
          0,
          (nearby.health ?? nearbyMax) - splashDamage,
        );
        if (nearby.health === 0) {
          this.applyDown(
            attackerId,
            nearbyId,
            weaponId,
            attacker,
            nearby,
            gameState,
          );
        }
      });
    }

    return true;
  }

  private applyDown(
    attackerId: string,
    targetId: string,
    weaponId: string | undefined,
    attacker: Player,
    target: Player,
    gameState: GameState,
  ): void {
    target.respawnAt = Date.now() + this.RESPAWN_DELAY_MS;

    // A downed carrier drops the flag back at its base.
    gameState.flags?.forEach((flag) => {
      if (flag.carrierId === targetId) {
        flag.carrierId = undefined;
        flag.position = [...flag.basePosition];
      }
    });

    attacker.currentKillStreak = (attacker.currentKillStreak ?? 0) + 1;
    target.currentKillStreak = 0;

    const streak = attacker.currentKillStreak;
    if ((STREAK_THRESHOLDS as readonly number[]).includes(streak)) {
      gameState.streakAnnouncement = {
        killerName: attacker.name,
        count: streak,
        timestamp: Date.now(),
      };
    }

    log.debug(
      `${attacker.name} downed ${target.name}! (streak: ${attacker.currentKillStreak})`,
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
      player.health = player.maxHealth;
      player.respawnAt = undefined;
      player.spawnProtectedUntil = undefined;
      player.currentKillStreak = 0;
    });

    gameState.streakAnnouncement = undefined;

    return results;
  }
}

export default CTFMode;
