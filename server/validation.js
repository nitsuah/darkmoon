/**
 * Validation utilities for server-side input validation
 * Prevents position spoofing and invalid game data
 */

/**
 * Validate player position is within reasonable bounds
 * Prevents cheating by teleporting or going out of bounds
 * @param {unknown} position - The position to validate
 * @returns {boolean} True if valid
 */
export const validatePosition = (position) => {
  if (!Array.isArray(position)) return false;
  if (position.length !== 3) return false;

  const [x, y, z] = position;

  // Check all are numbers
  if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
    return false;
  }

  // Check for NaN or Infinity
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return false;
  }

  // Arena bounds: +/- 50 units in X/Z, 0-20 units in Y
  const MAX_BOUND = 50;
  const MIN_Y = -5;
  const MAX_Y = 20;

  if (Math.abs(x) > MAX_BOUND || Math.abs(z) > MAX_BOUND) {
    return false;
  }

  if (y < MIN_Y || y > MAX_Y) {
    return false;
  }

  return true;
};

/**
 * Validate rotation array
 * @param {unknown} rotation - The rotation to validate
 * @returns {boolean} True if valid
 */
export const validateRotation = (rotation) => {
  if (!Array.isArray(rotation)) return false;
  if (rotation.length !== 3) return false;

  return rotation.every((r) => typeof r === "number" && Number.isFinite(r));
};

/**
 * Validate chat message
 * @param {unknown} message - The message to validate
 * @returns {boolean} True if valid
 */
export const validateChatMessage = (message) => {
  if (typeof message !== "object" || message === null) return false;

  const msg = message;

  // Check required fields
  if (typeof msg.message !== "string") return false;
  if (typeof msg.playerId !== "string") return false;
  if (typeof msg.playerName !== "string") return false;

  // Check message length
  if (msg.message.length === 0 || msg.message.length > 500) return false;

  // Check player name length
  if (msg.playerName.length === 0 || msg.playerName.length > 50) return false;

  return true;
};

/**
 * Centralized list of valid game modes.
 */
export const VALID_GAME_MODES = ["tag", "collectible", "race", "solo"];

/**
 * Validate game mode
 * @param {unknown} mode - The game mode to validate
 * @returns {boolean} True if valid
 */
export const validateGameMode = (mode) => {
  return typeof mode === "string" && VALID_GAME_MODES.includes(mode);
};
