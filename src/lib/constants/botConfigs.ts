/**
 * Bot AI configuration presets for Solo mode
 *
 * Each bot has different speeds and behaviors to make gameplay interesting
 */

import type { BotConfig } from "../../components/characters/useBotAI";

/**
 * Bot 1 Configuration - Balanced bot
 * Good for testing, not too fast or slow
 */
export const BOT1_CONFIG: BotConfig = {
  botSpeed: 3.0,
  sprintSpeed: 4.5,
  fleeSpeed: 1.3,
  tagCooldown: 500,
  tagDistance: 1.0,
  pauseAfterTag: 3000, // 3 second freeze when tagged (matches player freeze)
  sprintDuration: 3000,
  sprintCooldown: 2000,
  chaseRadius: 15,
  initialPosition: [-5, 0.5, -5],
  label: "Bot1",
};

/**
 * Bot 2 Configuration - Aggressive bot
 * Faster than Bot1, more challenging opponent
 */
export const BOT2_CONFIG: BotConfig = {
  botSpeed: 3.5,
  sprintSpeed: 5.0,
  fleeSpeed: 1.2,
  tagCooldown: 500,
  tagDistance: 1.0,
  pauseAfterTag: 3000, // 3 second freeze when tagged (matches player freeze)
  sprintDuration: 3000,
  sprintCooldown: 2000,
  chaseRadius: 15,
  initialPosition: [8, 0.5, -8],
  label: "Bot2",
};

/**
 * All bot configurations for easy iteration
 */
export const BOT_CONFIGS = [BOT1_CONFIG, BOT2_CONFIG] as const;
