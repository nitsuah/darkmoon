import { describe, it, expect } from "vitest";
import {
  buildHealthReport,
  countActiveGames,
  countActivePlayers,
  healthStatusCode,
  STATUS_OK,
  STATUS_DEGRADED,
  DEFAULT_MAX_PLAYERS,
} from "../../server/health.js";

const NOW = Date.parse("2026-08-27T12:00:00.000Z");

describe("server health endpoint payload", () => {
  describe("countActivePlayers", () => {
    it("prefers the socket engine connection count", () => {
      expect(countActivePlayers({ connections: 5, clients: { a: {} } })).toBe(
        5,
      );
    });

    it("falls back to the tracked client map", () => {
      expect(countActivePlayers({ clients: { a: {}, b: {} } })).toBe(2);
    });

    it("returns 0 when there is no state at all", () => {
      expect(countActivePlayers()).toBe(0);
      expect(countActivePlayers({})).toBe(0);
    });

    it("never reports a negative or non-finite count", () => {
      expect(countActivePlayers({ connections: -3 })).toBe(0);
      expect(countActivePlayers({ connections: NaN, clients: { a: {} } })).toBe(
        1,
      );
    });
  });

  describe("countActiveGames", () => {
    it("counts an in-progress game", () => {
      expect(countActiveGames({ isActive: true, mode: "tag" })).toBe(1);
    });

    it("counts zero when no game is running", () => {
      expect(countActiveGames({ isActive: false })).toBe(0);
      expect(countActiveGames(null)).toBe(0);
      expect(countActiveGames(undefined)).toBe(0);
    });
  });

  describe("buildHealthReport", () => {
    it("reports status, active players, and active games", () => {
      const report = buildHealthReport({
        connections: 3,
        gameState: { isActive: true, mode: "tag", startTime: NOW - 60000 },
        startedAt: NOW - 120000,
        now: NOW,
      });

      expect(report.status).toBe(STATUS_OK);
      expect(report.activePlayers).toBe(3);
      expect(report.activeGames).toBe(1);
    });

    it("reports uptime in whole seconds", () => {
      const report = buildHealthReport({
        startedAt: NOW - 90_500,
        now: NOW,
      });

      expect(report.uptimeSeconds).toBe(90);
    });

    it("reports zero uptime when the start time is unknown", () => {
      expect(buildHealthReport({ now: NOW }).uptimeSeconds).toBe(0);
    });

    it("never reports negative uptime for a clock skew", () => {
      expect(
        buildHealthReport({ startedAt: NOW + 5000, now: NOW }).uptimeSeconds,
      ).toBe(0);
    });

    it("includes an ISO timestamp", () => {
      expect(buildHealthReport({ now: NOW }).timestamp).toBe(
        "2026-08-27T12:00:00.000Z",
      );
    });

    it("describes the current game", () => {
      const report = buildHealthReport({
        gameState: { isActive: true, mode: "tag", startTime: NOW - 30000 },
        now: NOW,
      });

      expect(report.game).toEqual({
        isActive: true,
        mode: "tag",
        startedAt: "2026-08-27T11:59:30.000Z",
      });
    });

    it("reports an idle game with a null start time", () => {
      const report = buildHealthReport({ now: NOW });

      expect(report.game).toEqual({
        isActive: false,
        mode: "none",
        startedAt: null,
      });
    });

    it("reports degraded once capacity is reached", () => {
      const report = buildHealthReport({
        connections: 10,
        maxPlayers: 10,
        now: NOW,
      });

      expect(report.status).toBe(STATUS_DEGRADED);
      expect(report.maxPlayers).toBe(10);
    });

    it("stays ok just below capacity", () => {
      expect(
        buildHealthReport({ connections: 9, maxPlayers: 10, now: NOW }).status,
      ).toBe(STATUS_OK);
    });

    it("applies the default capacity when none is supplied", () => {
      expect(buildHealthReport({ now: NOW }).maxPlayers).toBe(
        DEFAULT_MAX_PLAYERS,
      );
    });

    it("reports the build version when configured", () => {
      expect(buildHealthReport({ now: NOW, version: "1.4.0" }).version).toBe(
        "1.4.0",
      );
      expect(buildHealthReport({ now: NOW }).version).toBeNull();
    });

    it("produces a payload with every documented key", () => {
      const report = buildHealthReport({ now: NOW });

      expect(Object.keys(report).sort()).toEqual(
        [
          "activeGames",
          "activePlayers",
          "game",
          "maxPlayers",
          "status",
          "timestamp",
          "uptimeSeconds",
          "version",
        ].sort(),
      );
    });

    it("is JSON-serializable", () => {
      const report = buildHealthReport({
        connections: 2,
        gameState: { isActive: true, mode: "tag", startTime: NOW },
        startedAt: NOW - 1000,
        now: NOW,
      });

      expect(() => JSON.stringify(report)).not.toThrow();
      expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    });

    it("works with no arguments at all", () => {
      expect(() => buildHealthReport()).not.toThrow();
      expect(buildHealthReport().activePlayers).toBe(0);
    });
  });

  describe("healthStatusCode", () => {
    it("returns 200 for ok", () => {
      expect(healthStatusCode({ status: STATUS_OK })).toBe(200);
    });

    it("returns 200 for degraded so a busy server is not cycled", () => {
      expect(healthStatusCode({ status: STATUS_DEGRADED })).toBe(200);
    });

    it("returns 503 when no valid report is available", () => {
      expect(healthStatusCode({ status: "unknown" })).toBe(503);
      expect(healthStatusCode({})).toBe(503);
    });
  });
});
