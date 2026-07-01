/**
 * Bot AI configuration presets for Solo mode
 *
 * Each bot has different speeds and behaviors to make gameplay interesting
 */

import type { BotConfig } from "../../components/characters/useBotAI";

/**
 * Bot 1 Configuration - Aggressive SMG rusher
 * Fast bot that gets in close and sprays the SMG
 */
export const BOT1_CONFIG: BotConfig = {
  botSpeed: 3.5,
  sprintSpeed: 5.0,
  fleeSpeed: 1.3,
  tagCooldown: 500,
  tagDistance: 1.0,
  pauseAfterTag: 3000,
  sprintDuration: 3000,
  sprintCooldown: 2000,
  chaseRadius: 15,
  initialPosition: [-5, 0.5, -5],
  missChance: 0.22,
  fireRange: 12, // Closer range for SMG
  role: "attacker",
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
  missChance: 0.28,
  fireRange: 15,
  role: "attacker",
  label: "Bot2",
};

/**
 * Bot 3 Configuration - Grenadier bot (combat modes only)
 * Slower but uses the Frag Grenade for area denial
 */
export const BOT3_CONFIG: BotConfig = {
  botSpeed: 2.5,
  sprintSpeed: 3.5,
  fleeSpeed: 1.0,
  tagCooldown: 500,
  tagDistance: 1.0,
  pauseAfterTag: 3000,
  sprintDuration: 3000,
  sprintCooldown: 2000,
  chaseRadius: 15,
  initialPosition: [-8, 0.5, 8],
  missChance: 0.33,
  fireRange: 18, // Longer range for grenades
  role: "defender",
  label: "Bot3",
};

/**
 * Bot 4 Configuration - Laser sniper
 * Slow, accurate, long-range threat using the default laser
 */
export const BOT4_CONFIG: BotConfig = {
  botSpeed: 2.0,
  sprintSpeed: 2.8,
  fleeSpeed: 0.8,
  tagCooldown: 500,
  tagDistance: 1.0,
  pauseAfterTag: 3000,
  sprintDuration: 2000,
  sprintCooldown: 3000,
  chaseRadius: 25,
  initialPosition: [8, 0.5, 8],
  missChance: 0.12,
  fireRange: 25, // Longest range for sniper
  role: "defender",
  label: "Bot4",
};

/**
 * All bot configurations for easy iteration
 */
export const BOT_CONFIGS = [
  BOT1_CONFIG,
  BOT2_CONFIG,
  BOT3_CONFIG,
  BOT4_CONFIG,
] as const;
