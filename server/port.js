/**
 * PORT validation, split out from `server/index.js` so it is unit-testable
 * without booting a real server (index.js calls `app.listen` at import time).
 */

/** @type {number} */
export const DEFAULT_PORT = 4444;

/**
 * Parse and validate the configured port.
 *
 * An unset/empty value falls back to {@link DEFAULT_PORT}. Anything else must
 * be an integer in 1–65535 — `PORT=abc` would otherwise reach
 * `app.listen(NaN)` and fail with no indication that configuration was the
 * cause.
 *
 * @param {string | undefined} raw - Raw `process.env.PORT`.
 * @returns {number} A valid port number.
 * @throws {Error} When the value is set but not a valid port.
 */
export const resolvePort = (raw) => {
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT "${raw}": expected an integer between 1 and 65535.`,
    );
  }
  return parsed;
};

export default { DEFAULT_PORT, resolvePort };
