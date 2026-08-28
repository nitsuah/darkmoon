import { describe, it, expect, vi } from "vitest";
import type { Logger, LogContext, LogRecord } from "../../server/logger.d.ts";
import {
  createLogger,
  buildRecord,
  serializeRecord,
  resolveLevel,
  LOG_LEVELS,
  GAME_EVENTS,
} from "../../server/logger.js";

interface CapturingLoggerOptions {
  level?: string;
  base?: LogContext;
  now?: () => string;
}

interface CapturingLogger {
  logger: Logger;
  lines: string[];
  records: () => LogRecord[];
  last: () => LogRecord;
}

/**
 * Build a logger whose output is captured as parsed JSON records.
 */
const createCapturingLogger = (
  options: CapturingLoggerOptions = {},
): CapturingLogger => {
  const lines: string[] = [];
  const logger = createLogger({
    write: (line: string) => lines.push(line),
    now: () => "2026-08-27T12:00:00.000Z",
    ...options,
  });

  return {
    logger,
    lines,
    records: () => lines.map((line) => JSON.parse(line)),
    last: () => JSON.parse(lines[lines.length - 1]),
  };
};

describe("server structured logger", () => {
  describe("level resolution", () => {
    it("orders levels by ascending severity", () => {
      expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.info);
      expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.warn);
      expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.error);
    });

    it("is case-insensitive and tolerates whitespace", () => {
      expect(resolveLevel(" WARN ")).toBe(LOG_LEVELS.warn);
    });

    it("falls back to info for unknown or non-string levels", () => {
      expect(resolveLevel("nonsense")).toBe(LOG_LEVELS.info);
      expect(resolveLevel(undefined)).toBe(LOG_LEVELS.info);
    });
  });

  describe("record shape", () => {
    it("emits timestamp, level, and event on every record", () => {
      const { logger, last } = createCapturingLogger();
      logger.info("test.event");

      expect(last()).toMatchObject({
        timestamp: "2026-08-27T12:00:00.000Z",
        level: "info",
        event: "test.event",
      });
    });

    it("merges context fields into the record", () => {
      const { logger, last } = createCapturingLogger();
      logger.info("test.event", { playerId: "abc", activePlayers: 3 });

      expect(last()).toMatchObject({ playerId: "abc", activePlayers: 3 });
    });

    it("emits one line of valid JSON per call", () => {
      const { logger, lines } = createCapturingLogger();
      logger.info("a");
      logger.warn("b");

      expect(lines).toHaveLength(2);
      lines.forEach((line) => {
        expect(line).not.toContain("\n");
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it("does not let context override the reserved keys", () => {
      const record = buildRecord(
        "info",
        "real.event",
        { level: "error", event: "spoofed", timestamp: "nope" },
        () => "2026-08-27T12:00:00.000Z",
      );

      expect(record.level).toBe("info");
      expect(record.event).toBe("real.event");
      expect(record.timestamp).toBe("2026-08-27T12:00:00.000Z");
    });

    it("merges base fields into every record", () => {
      const { logger, records } = createCapturingLogger({
        base: { service: "darkmoon-server" },
      });
      logger.info("one");
      logger.error("two");

      records().forEach((record) => {
        expect(record.service).toBe("darkmoon-server");
      });
    });

    it("survives unserializable context instead of throwing", () => {
      const circular: Record<string, unknown> = { name: "loop" };
      circular.self = circular;

      const line = serializeRecord({
        timestamp: "2026-08-27T12:00:00.000Z",
        level: "info",
        event: "test.event",
        circular,
      });

      const parsed = JSON.parse(line);
      expect(parsed.serializationError).toBe(true);
      expect(parsed.event).toBe("test.event");
    });
  });

  describe("level filtering", () => {
    it("suppresses records below the configured threshold", () => {
      const { logger, lines } = createCapturingLogger({ level: "warn" });

      logger.debug("skipped.debug");
      logger.info("skipped.info");
      logger.warn("kept.warn");
      logger.error("kept.error");

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).event).toBe("kept.warn");
      expect(JSON.parse(lines[1]).event).toBe("kept.error");
    });

    it("returns null for a suppressed record and the record when emitted", () => {
      const { logger } = createCapturingLogger({ level: "warn" });

      expect(logger.info("suppressed")).toBeNull();
      expect(logger.error("emitted")).toMatchObject({ event: "emitted" });
    });

    it("emits nothing at the silent level", () => {
      const { logger, lines } = createCapturingLogger({ level: "silent" });

      logger.error("still.suppressed");
      expect(lines).toHaveLength(0);
    });

    it("reports whether a level is enabled", () => {
      const { logger } = createCapturingLogger({ level: "warn" });

      expect(logger.isLevelEnabled("info")).toBe(false);
      expect(logger.isLevelEnabled("error")).toBe(true);
    });
  });

  describe("child loggers", () => {
    it("inherits base fields and adds its own", () => {
      const { logger, last } = createCapturingLogger({
        base: { service: "darkmoon-server" },
      });

      logger.child({ playerId: "abc" }).info("scoped.event");

      expect(last()).toMatchObject({
        service: "darkmoon-server",
        playerId: "abc",
        event: "scoped.event",
      });
    });

    it("inherits the level threshold", () => {
      const { logger, lines } = createCapturingLogger({ level: "warn" });
      logger.child({ playerId: "abc" }).info("suppressed");

      expect(lines).toHaveLength(0);
    });

    it("does not let a call-site context field overwrite a bound child field", () => {
      const { logger, last } = createCapturingLogger({
        base: { service: "darkmoon-server" },
      });

      logger.child({ playerId: "abc" }).info("scoped.event", {
        playerId: "spoofed",
      });

      expect(last().playerId).toBe("abc");
    });
  });

  describe("game event helpers", () => {
    it("logs player connect with the active player count", () => {
      const { logger, last } = createCapturingLogger();
      logger.playerConnected({ playerId: "p1", activePlayers: 4 });

      expect(last()).toMatchObject({
        event: GAME_EVENTS.PLAYER_CONNECTED,
        level: "info",
        playerId: "p1",
        activePlayers: 4,
      });
    });

    it("logs player disconnect including whether they were IT", () => {
      const { logger, last } = createCapturingLogger();
      logger.playerDisconnected({
        playerId: "p1",
        activePlayers: 3,
        wasIt: true,
      });

      expect(last()).toMatchObject({
        event: GAME_EVENTS.PLAYER_DISCONNECTED,
        playerId: "p1",
        activePlayers: 3,
        wasIt: true,
      });
    });

    it("logs a successful tag with both player ids", () => {
      const { logger, last } = createCapturingLogger();
      logger.playerTagged({ taggerId: "p1", taggedId: "p2", mode: "tag" });

      expect(last()).toMatchObject({
        event: GAME_EVENTS.PLAYER_TAGGED,
        level: "info",
        taggerId: "p1",
        taggedId: "p2",
        mode: "tag",
      });
    });

    it("logs a rejected tag at warn level with a reason", () => {
      const { logger, last } = createCapturingLogger();
      logger.tagRejected({
        taggerId: "p1",
        taggedId: "p2",
        reason: "tagger_not_it",
      });

      expect(last()).toMatchObject({
        event: GAME_EVENTS.TAG_REJECTED,
        level: "warn",
        reason: "tagger_not_it",
      });
    });

    it("logs a score change with a computed delta", () => {
      const { logger, last } = createCapturingLogger();
      logger.scoreChanged({
        playerId: "p1",
        previousScore: 2,
        newScore: 3,
        reason: "tag",
      });

      expect(last()).toMatchObject({
        event: GAME_EVENTS.SCORE_CHANGED,
        playerId: "p1",
        previousScore: 2,
        newScore: 3,
        delta: 1,
        reason: "tag",
      });
    });

    it("logs game start and end", () => {
      const { logger, records } = createCapturingLogger();
      logger.gameStarted({ mode: "tag", itPlayerId: "p1", playerCount: 2 });
      logger.gameEnded({ mode: "tag", durationMs: 60000, playerCount: 2 });

      const [started, ended] = records();
      expect(started).toMatchObject({
        event: GAME_EVENTS.GAME_STARTED,
        mode: "tag",
        itPlayerId: "p1",
        playerCount: 2,
      });
      expect(ended).toMatchObject({
        event: GAME_EVENTS.GAME_ENDED,
        durationMs: 60000,
      });
    });

    it("defines a distinct stable key for every game event", () => {
      const keys = Object.values(GAME_EVENTS);
      expect(new Set(keys).size).toBe(keys.length);
      keys.forEach((key) => expect(key).toMatch(/^[a-z]+\.[a-z_]+$/));
    });
  });

  describe("default transport", () => {
    it("writes to console.log when no transport is supplied", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      createLogger().info("console.event", { a: 1 });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
        event: "console.event",
        a: 1,
      });

      spy.mockRestore();
    });
  });
});
