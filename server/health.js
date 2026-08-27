/**
 * Operational visibility for the multiplayer server.
 *
 * `buildHealthReport` is a pure function over a snapshot of server state so the
 * `/health` payload can be asserted in unit tests without binding a port or
 * opening sockets.
 */

/** Server is up and inside its configured capacity. */
export const STATUS_OK = "ok";
/** Server is up but at/over capacity — still serving, not accepting more load. */
export const STATUS_DEGRADED = "degraded";

/**
 * Default maximum concurrent players before `/health` reports `degraded`.
 * Sized for the free Render instance the server currently deploys to.
 * @type {number}
 */
export const DEFAULT_MAX_PLAYERS = 64;

/**
 * Count games currently in progress.
 *
 * The server presently hosts a single global match, so this is 0 or 1. It is
 * written as a function over game state (rather than a hardcoded boolean) so
 * that a future room/lobby model can report a real count without changing the
 * `/health` contract.
 *
 * @param {{ isActive?: boolean } | null | undefined} gameState - Global game state.
 * @returns {number} Number of active games.
 */
export const countActiveGames = (gameState) => {
  if (!gameState || typeof gameState !== "object") return 0;
  return gameState.isActive === true ? 1 : 0;
};

/**
 * Count connected players.
 *
 * Prefers the Socket.io engine's `clientsCount` (the transport's own view of
 * open connections) and falls back to the size of the tracked `clients` map.
 *
 * @param {{ connections?: number, clients?: Record<string, unknown> }} snapshot
 * @returns {number} Number of active players.
 */
export const countActivePlayers = ({ connections, clients } = {}) => {
  if (typeof connections === "number" && Number.isFinite(connections)) {
    return Math.max(0, connections);
  }
  if (clients && typeof clients === "object") {
    return Object.keys(clients).length;
  }
  return 0;
};

/**
 * Build the `/health` payload.
 *
 * @param {object} snapshot
 * @param {number} [snapshot.connections] - Socket.io `engine.clientsCount`.
 * @param {Record<string, unknown>} [snapshot.clients] - Tracked client map.
 * @param {{ isActive?: boolean, mode?: string, startTime?: number | null, itPlayerId?: string | null }} [snapshot.gameState]
 * @param {number} [snapshot.startedAt] - Server boot time (ms epoch).
 * @param {number} [snapshot.now] - Current time (ms epoch), injectable for tests.
 * @param {number} [snapshot.maxPlayers] - Capacity threshold.
 * @param {string} [snapshot.version] - Build/app version.
 * @returns {object} Health report.
 */
export const buildHealthReport = ({
  connections,
  clients,
  gameState,
  startedAt,
  now = Date.now(),
  maxPlayers = DEFAULT_MAX_PLAYERS,
  version,
} = {}) => {
  const activePlayers = countActivePlayers({ connections, clients });
  const activeGames = countActiveGames(gameState);

  const uptimeSeconds =
    typeof startedAt === "number" && Number.isFinite(startedAt)
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : 0;

  const status = activePlayers >= maxPlayers ? STATUS_DEGRADED : STATUS_OK;

  return {
    status,
    timestamp: new Date(now).toISOString(),
    uptimeSeconds,
    activePlayers,
    activeGames,
    maxPlayers,
    game: {
      isActive: countActiveGames(gameState) > 0,
      mode: gameState?.mode ?? "none",
      startedAt:
        typeof gameState?.startTime === "number"
          ? new Date(gameState.startTime).toISOString()
          : null,
    },
    version: version ?? null,
  };
};

/**
 * HTTP status code for a health report. `degraded` still returns 200 so that a
 * busy-but-healthy server is not cycled by the platform health check; only a
 * failure to produce a report at all is a 503.
 *
 * @param {{ status?: string }} report
 * @returns {number} HTTP status code.
 */
export const healthStatusCode = (report) =>
  report?.status === STATUS_OK || report?.status === STATUS_DEGRADED
    ? 200
    : 503;

export default {
  STATUS_OK,
  STATUS_DEGRADED,
  DEFAULT_MAX_PLAYERS,
  countActiveGames,
  countActivePlayers,
  buildHealthReport,
  healthStatusCode,
};
