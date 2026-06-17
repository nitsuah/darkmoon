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
  label: "Bot3",
};

/**
 * All bot configurations for easy iteration
 */
export const BOT_CONFIGS = [BOT1_CONFIG, BOT2_CONFIG, BOT3_CONFIG] as const;
