/**
 * Configuration for the gallery bot player.
 *
 * All numeric parameters are tunable at runtime — change a preset and
 * hot-reload to immediately observe the effect in gallery debug mode.
 */
export interface GalleryBotConfig {
  name: string;

  // ── Timing ──────────────────────────────────────────────────────────────
  /** ms after a target first becomes visible before the bot commits to shooting */
  reactionMs: number;
  /** minimum ms between shots (fire-rate cap) */
  shotIntervalMs: number;

  // ── Accuracy ────────────────────────────────────────────────────────────
  /**
   * Max angular jitter applied to each shot (radians, uniform random ±).
   * 0 = perfect aim. 0.05 rad ≈ 3°, 0.15 rad ≈ 8.6°.
   * Miss probability is geometry-dependent: whether the jittered ray still
   * intersects the target hitbox depends on distance and target size.
   */
  aimJitterRad: number;
  /**
   * Flat probability [0, 1] of an intentional miss per shot.
   * When a miss is forced, jitter is scaled up so the ray clears the hitbox.
   * Independent of aimJitterRad — both can be non-zero simultaneously.
   */
  missChance: number;

  // ── Target selection ────────────────────────────────────────────────────
  /**
   * Strategy used to choose which up-target to aim at when multiple are ready.
   * - "random"        — uniform random among visible targets
   * - "highest_value" — always shoots the most valuable target first (50pt > 25pt > 10pt)
   * - "nearest"       — shoots whichever target is closest to the camera
   * - "front_first"   — prefers closest row (highest Z), easiest shots first
   */
  targetStrategy: "random" | "highest_value" | "nearest" | "front_first";

  // ── Human-like imperfections ─────────────────────────────────────────────
  /**
   * When true, the bot occasionally skips a ready target (probability 0.15)
   * and waits until the next interval to shoot, simulating a momentary lapse.
   */
  hesitate: boolean;
}

// ── Tunable presets ──────────────────────────────────────────────────────────

export const GALLERY_BOT_PRESETS = {
  /**
   * Casual human: slow reactions, wide spread, random target picking.
   * Expect ~35-45% hit rate on normal difficulty.
   */
  easy: {
    name: "Easy Bot",
    reactionMs: 750,
    shotIntervalMs: 700,
    aimJitterRad: 0.09,
    missChance: 0.4,
    targetStrategy: "random",
    hesitate: true,
  } satisfies GalleryBotConfig,

  /**
   * Decent player: moderate reactions, some jitter, prefers front row.
   * Expect ~60-70% hit rate.
   */
  medium: {
    name: "Medium Bot",
    reactionMs: 350,
    shotIntervalMs: 400,
    aimJitterRad: 0.04,
    missChance: 0.18,
    targetStrategy: "front_first",
    hesitate: false,
  } satisfies GalleryBotConfig,

  /**
   * Skilled player: fast reactions, tight spread, chases high-value targets.
   * Expect ~85-90% hit rate.
   */
  hard: {
    name: "Hard Bot",
    reactionMs: 160,
    shotIntervalMs: 250,
    aimJitterRad: 0.018,
    missChance: 0.06,
    targetStrategy: "highest_value",
    hesitate: false,
  } satisfies GalleryBotConfig,

  /**
   * Machine-perfect: instant reactions, zero jitter, never misses.
   * Useful for benchmarking the maximum achievable score.
   */
  perfect: {
    name: "Perfect Bot",
    reactionMs: 16,
    shotIntervalMs: 120,
    aimJitterRad: 0,
    missChance: 0,
    targetStrategy: "highest_value",
    hesitate: false,
  } satisfies GalleryBotConfig,
} as const;

export type GalleryBotPreset = keyof typeof GALLERY_BOT_PRESETS;
