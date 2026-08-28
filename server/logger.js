/**
 * Structured JSON logging for the multiplayer server.
 *
 * Every record is a single line of JSON so that log aggregators (Render,
 * Datadog, `jq`) can index fields without regex-parsing prose. Human-readable
 * strings are deliberately *not* emitted: the `event` field is the stable
 * machine-readable key, and any extra context goes in sibling fields.
 *
 * Record shape:
 * ```json
 * {"timestamp":"2026-08-27T12:00:00.000Z","level":"info","event":"player.connected","playerId":"abc","activePlayers":3}
 * ```
 */

/**
 * Log levels in ascending severity. A logger emits a record only when the
 * record's level is at or above the configured threshold.
 * @type {Record<string, number>}
 */
export const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** @type {string} */
export const DEFAULT_LOG_LEVEL = "info";

/**
 * Stable event names for the game lifecycle. Using constants keeps the emitted
 * keys consistent between the server and the tests/dashboards that assert on
 * them.
 */
export const GAME_EVENTS = {
  SERVER_STARTED: "server.started",
  SERVER_SHUTDOWN: "server.shutdown",
  PLAYER_CONNECTED: "player.connected",
  PLAYER_DISCONNECTED: "player.disconnected",
  PLAYER_TAGGED: "game.player_tagged",
  TAG_REJECTED: "game.tag_rejected",
  SCORE_CHANGED: "game.score_changed",
  GAME_STARTED: "game.started",
  GAME_ENDED: "game.ended",
  CHAT_MESSAGE: "chat.message",
  RATE_LIMITED: "security.rate_limited",
  VALIDATION_FAILED: "security.validation_failed",
  CORS_REJECTED: "security.cors_rejected",
  CORS_UNSAFE_WILDCARD_DROPPED: "security.cors_unsafe_wildcard_dropped",
};

/**
 * Resolve a configured level name into a numeric threshold.
 *
 * @param {string | undefined | null} level - Level name, case-insensitive.
 * @returns {number} Numeric threshold, falling back to {@link DEFAULT_LOG_LEVEL}.
 */
export const resolveLevel = (level) => {
  if (typeof level !== "string") return LOG_LEVELS[DEFAULT_LOG_LEVEL];

  const normalized = level.trim().toLowerCase();
  return LOG_LEVELS[normalized] ?? LOG_LEVELS[DEFAULT_LOG_LEVEL];
};

/**
 * Build a log record without emitting it. Exported so tests can assert on the
 * exact serialized shape independently of transport.
 *
 * Reserved keys (`timestamp`, `level`, `event`) always win over caller-supplied
 * context so a stray `level` field in game data cannot corrupt the record.
 *
 * @param {string} level - Level name.
 * @param {string} event - Stable event key, e.g. `player.connected`.
 * @param {Record<string, unknown>} [context] - Extra structured fields.
 * @param {() => string} [now] - Timestamp factory, injectable for tests.
 * @returns {Record<string, unknown>} The record object.
 */
export const buildRecord = (level, event, context = {}, now) => {
  const timestamp =
    typeof now === "function" ? now() : new Date().toISOString();

  const safeContext =
    context && typeof context === "object" && !Array.isArray(context)
      ? context
      : {};

  return { ...safeContext, timestamp, level, event };
};

/**
 * Serialize a record to a single JSON line.
 *
 * Falls back to a minimal error record when the context contains circular
 * references or otherwise unserializable values, so a logging failure can never
 * crash a game event handler.
 *
 * @param {Record<string, unknown>} record - Record from {@link buildRecord}.
 * @returns {string} JSON line.
 */
export const serializeRecord = (record) => {
  try {
    return JSON.stringify(record);
  } catch {
    return JSON.stringify({
      timestamp: record?.timestamp ?? new Date().toISOString(),
      level: record?.level ?? "error",
      event: record?.event ?? "logger.serialize_failed",
      serializationError: true,
    });
  }
};

/**
 * Create a structured logger.
 *
 * @param {object} [options]
 * @param {string} [options.level] - Minimum level to emit (default `info`,
 *   overridable via the `LOG_LEVEL` env var by the caller).
 * @param {(line: string) => void} [options.write] - Transport for emitted
 *   lines. Defaults to `console.log`; injectable so tests capture output.
 * @param {Record<string, unknown>} [options.base] - Fields merged into every
 *   record (e.g. `{ service: "darkmoon-server" }`).
 * @param {() => string} [options.now] - Timestamp factory, injectable for tests.
 * @returns {object} Logger with `debug`/`info`/`warn`/`error`, `log`,
 *   `isLevelEnabled`, `child`, and the game-event helpers.
 */
export const createLogger = (options = {}) => {
  const { level = DEFAULT_LOG_LEVEL, write, base = {}, now } = options;

  const threshold = resolveLevel(level);
  const emit =
    typeof write === "function" ? write : (line) => console.log(line);

  /**
   * @param {string} recordLevel
   * @returns {boolean}
   */
  const isLevelEnabled = (recordLevel) =>
    resolveLevel(recordLevel) >= threshold;

  /**
   * @param {string} recordLevel
   * @param {string} event
   * @param {Record<string, unknown>} [context]
   * @returns {Record<string, unknown> | null} The emitted record, or null when
   *   suppressed by the level threshold.
   */
  const log = (recordLevel, event, context = {}) => {
    if (!isLevelEnabled(recordLevel)) return null;

    // Base wins over per-record context: child() documents its fields as
    // permanent, so a call-site key must not silently reattribute a record
    // (e.g. a stray `playerId` overwriting the child's bound one).
    const record = buildRecord(
      recordLevel,
      event,
      { ...context, ...base },
      now,
    );
    emit(serializeRecord(record));
    return record;
  };

  const logger = {
    isLevelEnabled,
    log,
    debug: (event, context) => log("debug", event, context),
    info: (event, context) => log("info", event, context),
    warn: (event, context) => log("warn", event, context),
    error: (event, context) => log("error", event, context),

    /**
     * Derive a logger that carries additional permanent fields.
     * @param {Record<string, unknown>} extraBase
     */
    child: (extraBase = {}) =>
      createLogger({
        level,
        write: emit,
        base: { ...base, ...extraBase },
        now,
      }),

    // ---- Game event helpers -------------------------------------------------
    // These exist so the call sites in index.js cannot drift on field naming.

    /** @param {{ playerId: string, activePlayers: number }} data */
    playerConnected: (data) => log("info", GAME_EVENTS.PLAYER_CONNECTED, data),

    /** @param {{ playerId: string, activePlayers: number, wasIt?: boolean }} data */
    playerDisconnected: (data) =>
      log("info", GAME_EVENTS.PLAYER_DISCONNECTED, data),

    /** @param {{ taggerId: string, taggedId: string, mode?: string }} data */
    playerTagged: (data) => log("info", GAME_EVENTS.PLAYER_TAGGED, data),

    /** @param {{ taggerId: string, taggedId: string, reason: string }} data */
    tagRejected: (data) => log("warn", GAME_EVENTS.TAG_REJECTED, data),

    /** @param {{ playerId: string, previousScore: number, newScore: number, reason?: string }} data */
    scoreChanged: (data) =>
      log("info", GAME_EVENTS.SCORE_CHANGED, {
        ...data,
        delta:
          typeof data?.newScore === "number" &&
          typeof data?.previousScore === "number"
            ? data.newScore - data.previousScore
            : undefined,
      }),

    /** @param {{ mode: string, itPlayerId?: string | null, playerCount: number }} data */
    gameStarted: (data) => log("info", GAME_EVENTS.GAME_STARTED, data),

    /** @param {{ mode?: string, durationMs?: number | null, playerCount?: number }} data */
    gameEnded: (data) => log("info", GAME_EVENTS.GAME_ENDED, data),
  };

  return logger;
};

export default { createLogger, LOG_LEVELS, GAME_EVENTS, buildRecord };
