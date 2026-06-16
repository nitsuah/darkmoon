import { createLogger } from "../lib/utils/logger";
import type { CTFFlag, GameModeHandler } from "./gameModes/GameModeHandler";

export interface KillEvent {
  killerId: string;
  killerName: string;
  targetId: string;
  targetName: string;
  weaponId: string;
  timestamp: number;
}
import TagMode from "./gameModes/TagMode";
import DeathmatchMode from "./gameModes/DeathmatchMode";
import CTFMode from "./gameModes/CTFMode";

const log = createLogger("GameManager");

export type GameMode =
  | "none"
  | "tag"
  | "deathmatch"
  | "ctf"
  | "collectible"
  | "race"
  | "solo";

export interface GameState {
  mode: GameMode;
  isActive: boolean;
  timeRemaining: number;
  scores: { [playerId: string]: number };
  itPlayerId?: string; // For tag mode
  roundStartTime?: number;
  /** Kills required to win deathmatch. */
  killLimit?: number;
  /** Flag entities for capture-the-flag. */
  flags?: CTFFlag[];
  /** Scrolling kill feed (last 10 kills). */
  killFeed?: KillEvent[];
  /** Transient streak announcement, cleared by onTick after display window. */
  streakAnnouncement?: { killerName: string; count: number; timestamp: number };
}

export interface TagGameState extends GameState {
  mode: "tag";
  itPlayerId: string;
  tagHistory: { playerId: string; timestamp: number; timeAsIt: number }[];
}

export interface Player {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  isIt?: boolean;
  timeAsIt?: number;
  lastTagTime?: number;
  /** ID of the player who most recently tagged this player (used for tag-back cooldown). */
  lastTaggedById?: string;
  /** Current health for combat-enabled modes (deathmatch, CTF). */
  health?: number;
  /** Health to restore to on spawn/respawn. */
  maxHealth?: number;
  /** Timestamp (ms) when a downed player becomes eligible to respawn. */
  respawnAt?: number;
  /** Team assignment for capture-the-flag. */
  team?: "a" | "b";
  /** Currently equipped weapon id (e.g. "laser", "shotgun", "rocket"). */
  equippedWeaponId?: string;
  /** Current ammo for the equipped weapon. null = infinite, undefined = unknown. */
  currentAmmo?: number | null;
  /** Timestamp (ms) until which this player is invincible after respawning. */
  spawnProtectedUntil?: number;
  /** Consecutive kills without dying (resets on death). */
  currentKillStreak?: number;
}

export class GameManager {
  private gameState: GameState;
  private players: Map<string, Player>;
  private callbacks: {
    onGameStateUpdate?: (state: GameState) => void;
    onPlayerUpdate?: (players: Map<string, Player>) => void;
  };

  // Active mode rules, swapped out by startTagGame/startDeathmatchGame/...
  // based on gameState.mode.
  private mode: GameModeHandler;

  constructor() {
    this.gameState = {
      mode: "none",
      isActive: false,
      timeRemaining: 0,
      scores: {},
    };
    this.players = new Map();
    this.callbacks = {};
    this.mode = new TagMode();
  }

  setCallbacks(callbacks: {
    onGameStateUpdate?: (state: GameState) => void;
    onPlayerUpdate?: (players: Map<string, Player>) => void;
  }) {
    this.callbacks = callbacks;
  }

  addPlayer(player: Player) {
    this.players.set(player.id, player);
    this.callbacks.onPlayerUpdate?.(this.players);
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);

    // If the 'it' player left during tag game, let the mode reassign it
    if (
      this.gameState.mode === "tag" &&
      this.gameState.itPlayerId === playerId
    ) {
      this.mode.onPlayerRemoved(playerId, this.players, this.gameState);
      this.callbacks.onGameStateUpdate?.(this.gameState);
    } else if (this.gameState.mode === "ctf" && this.gameState.isActive) {
      // Let CTFMode return any flag the departing player was carrying.
      this.mode.onPlayerRemoved(playerId, this.players, this.gameState);
      this.callbacks.onGameStateUpdate?.(this.gameState);
    }

    this.callbacks.onPlayerUpdate?.(this.players);
  }

  updatePlayer(playerId: string, updates: Partial<Player>) {
    const player = this.players.get(playerId);
    if (player) {
      Object.assign(player, updates);
      this.callbacks.onPlayerUpdate?.(this.players);
    }
  }

  /**
   * Per-frame position sync that skips update callbacks so 60fps movement
   * doesn't re-render React consumers. Positions are read on demand
   * (projectile hit checks, tag distance checks).
   */
  updatePlayerPosition(playerId: string, position: [number, number, number]) {
    const player = this.players.get(playerId);
    if (player) {
      player.position = position;
    }
  }

  startTagGame(duration: number = 60) {
    // 1 minute default for faster playtesting (dynamic: +1min per player above 2)
    // Allow solo practice (0 players) or real games with 2+ players; block single-player
    if (this.players.size === 1) {
      log.debug("Need at least 2 players to start tag game");
      return false;
    }

    // Dynamic duration: 1 minute + 1 minute per player above 2
    const playerCount = this.players.size;
    if (playerCount > 2) {
      duration = 60 + (playerCount - 2) * 60;
    }

    this.gameState = {
      mode: "tag",
      isActive: true,
      timeRemaining: duration,
      scores: {},
      roundStartTime: Date.now(),
    };

    this.mode = new TagMode();
    this.mode.onStart(this.players, this.gameState);

    this.callbacks.onGameStateUpdate?.(this.gameState);
    this.callbacks.onPlayerUpdate?.(this.players);
    // Log only in dev
    if (this.gameState.itPlayerId) {
      log.debug(
        `Tag game started! ${
          this.players.get(this.gameState.itPlayerId)?.name
        } is IT!`,
      );
    } else {
      log.debug(`Tag game started (solo practice)`);
    }
    return true;
  }

  tagPlayer(taggerId: string, taggedId: string): boolean {
    if (this.gameState.mode !== "tag" || !this.gameState.isActive) {
      log.debug(`[TAG-TRACE] Tag failed: Not in tag mode or inactive`);
      return false;
    }

    const accepted = this.mode.onAction(
      { type: "tag", taggerId, taggedId },
      this.players,
      this.gameState,
    );

    if (accepted) {
      this.callbacks.onGameStateUpdate?.(this.gameState);
      this.callbacks.onPlayerUpdate?.(this.players);
    }

    return accepted;
  }

  startDeathmatchGame(duration: number = 120, killLimit: number = 10) {
    this.gameState = {
      mode: "deathmatch",
      isActive: true,
      timeRemaining: duration,
      scores: {},
      killLimit,
      roundStartTime: Date.now(),
    };

    this.mode = new DeathmatchMode();
    this.mode.onStart(this.players, this.gameState);

    this.callbacks.onGameStateUpdate?.(this.gameState);
    this.callbacks.onPlayerUpdate?.(this.players);
    log.debug(`Deathmatch started! Kill limit: ${killLimit}`);
    return true;
  }

  hitPlayer(
    attackerId: string,
    targetId: string,
    damage: number,
    weaponId?: string,
  ): boolean {
    if (
      (this.gameState.mode !== "deathmatch" && this.gameState.mode !== "ctf") ||
      !this.gameState.isActive
    ) {
      return false;
    }

    const accepted = this.mode.onAction(
      { type: "hit", attackerId, targetId, damage, weaponId },
      this.players,
      this.gameState,
    );

    if (accepted) {
      this.callbacks.onGameStateUpdate?.(this.gameState);
      this.callbacks.onPlayerUpdate?.(this.players);
    }

    return accepted;
  }

  startCTFGame(duration: number = 180) {
    this.gameState = {
      mode: "ctf",
      isActive: true,
      timeRemaining: duration,
      scores: {},
      roundStartTime: Date.now(),
    };

    this.mode = new CTFMode();
    this.mode.onStart(this.players, this.gameState);

    this.callbacks.onGameStateUpdate?.(this.gameState);
    this.callbacks.onPlayerUpdate?.(this.players);
    log.debug(`CTF game started!`);
    return true;
  }

  pickupFlag(playerId: string): boolean {
    if (this.gameState.mode !== "ctf" || !this.gameState.isActive) {
      return false;
    }

    const accepted = this.mode.onAction(
      { type: "pickupFlag", playerId },
      this.players,
      this.gameState,
    );

    if (accepted) {
      this.callbacks.onGameStateUpdate?.(this.gameState);
      this.callbacks.onPlayerUpdate?.(this.players);
    }

    return accepted;
  }

  captureFlag(playerId: string): boolean {
    if (this.gameState.mode !== "ctf" || !this.gameState.isActive) {
      return false;
    }

    const accepted = this.mode.onAction(
      { type: "captureFlag", playerId },
      this.players,
      this.gameState,
    );

    if (accepted) {
      this.callbacks.onGameStateUpdate?.(this.gameState);
      this.callbacks.onPlayerUpdate?.(this.players);
    }

    return accepted;
  }

  updateGameTimer(deltaTime: number) {
    if (!this.gameState.isActive) return;

    this.mode.onTick(deltaTime, this.players, this.gameState);

    if (this.gameState.timeRemaining <= 0) {
      this.endGame();
    } else {
      this.callbacks.onGameStateUpdate?.(this.gameState);
    }
  }

  endGame() {
    this.gameState.isActive = false;
    this.gameState.timeRemaining = 0;

    const results = this.mode.onEnd(this.players, this.gameState);

    log.debug("Game ended! Final scores:", results);

    this.callbacks.onGameStateUpdate?.(this.gameState);
    this.callbacks.onPlayerUpdate?.(this.players);

    return results;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getPlayers(): Map<string, Player> {
    return this.players;
  }
}

export default GameManager;
