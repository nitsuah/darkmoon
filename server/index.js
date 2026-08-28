import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import {
  validatePosition,
  validateRotation,
  validateChatMessage,
  validateGameMode,
} from "./validation.js";
import { createLogger, GAME_EVENTS } from "./logger.js";
import {
  parseAllowedOrigins,
  createCorsOptions,
  CORS_ERROR_CODE,
} from "./cors.js";
import { buildHealthReport, healthStatusCode } from "./health.js";
import { authorizeTag } from "./tagAuthorization.js";
import { resolvePort } from "./port.js";

const PORT = resolvePort(process.env.PORT);
const SERVER_STARTED_AT = Date.now();
const APP_VERSION = process.env.APP_VERSION || null;

// Structured JSON logger. Every server log line is a single JSON object so log
// aggregators can index fields directly. Level is controlled by LOG_LEVEL.
const logger = createLogger({
  level: process.env.LOG_LEVEL,
  base: { service: "darkmoon-server" },
});

// A bare `*` in ALLOWED_ORIGINS is dropped by parseAllowedOrigins (see cors.js
// for why); log it so a misconfigured deploy is visible instead of silently
// falling back to the default allow-list.
const ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS,
  ({ entry }) =>
    logger.warn(GAME_EVENTS.CORS_UNSAFE_WILDCARD_DROPPED, { entry }),
);

// Rate limiting configuration. Limits are applied per-client within a time
// window (see checkRateLimit windowMs parameter). The default window used by
// checkRateLimit is 1000ms (1 second) unless a different window is supplied
// (e.g. chat uses a 60000ms window in some callers).
const RATE_LIMITS = {
  MOVE: 100, // Max 100 move events per default window (typically 1s)
  CHAT: 10, // Max 10 chat messages per default window (override to 60000ms for per-minute checks)
  GAME_ACTION: 5, // Max 5 game actions per default window (typically 1s)
};

// Track rate limits per client
const rateLimitTrackers = new Map();

/**
 * Clean up old rate limit entries to prevent memory leaks
 * Runs every 5 minutes
 */
const rateLimitCleanupTimer = setInterval(() => {
  const now = Date.now();
  const keysToDelete = [];

  for (const [key, tracker] of rateLimitTrackers.entries()) {
    // Delete entries that are 5 minutes past their reset time
    if (now > tracker.resetTime + 300000) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => rateLimitTrackers.delete(key));

  if (keysToDelete.length > 0) {
    logger.debug("ratelimit.cleanup", { removedEntries: keysToDelete.length });
  }
}, 300000); // Run every 5 minutes

/**
 * Check if client exceeds rate limit for a given action within a time window.
 *
 * @param {string} clientId - Unique identifier for the client (e.g., socket ID).
 * @param {string} action - The action to rate limit (e.g., "MOVE", "CHAT").
 * @param {number} limit - Maximum number of allowed actions within the window.
 * @param {number} [windowMs=1000] - Time window in milliseconds for the rate limit.
 * @returns {boolean} Returns true if the client has exceeded the limit (should block action), false otherwise.
 *
 * Notes:
 * - The function stores a simple per-client+action counter and a reset time.
 * - When the window expires the counter is reset.
 * - Stale entries are cleaned up every 5 minutes by a background interval.
 */
const checkRateLimit = (clientId, action, limit, windowMs = 1000) => {
  const now = Date.now();
  const key = `${clientId}:${action}`;

  if (!rateLimitTrackers.has(key)) {
    rateLimitTrackers.set(key, { count: 1, resetTime: now + windowMs });
    return false; // Not exceeded
  }

  const tracker = rateLimitTrackers.get(key);

  if (now > tracker.resetTime) {
    // Reset window
    tracker.count = 1;
    tracker.resetTime = now + windowMs;
    return false;
  }

  tracker.count++;
  return tracker.count > limit; // true if exceeded
};

// Create router (Express 5 has native async support)
const router = express.Router();

/**
 * Build the current health snapshot from live server state.
 * @returns {object} Health report.
 */
const currentHealthReport = () =>
  buildHealthReport({
    connections: ioServer ? ioServer.engine.clientsCount : 0,
    clients,
    gameState,
    startedAt: SERVER_STARTED_AT,
    version: APP_VERSION,
  });

// Health / observability endpoint. Reports server status, uptime, active player
// count, and active game count. Used by the Docker HEALTHCHECK, the Render
// healthCheckPath, and any external uptime monitor.
router.get("/health", (req, res) => {
  const report = currentHealthReport();
  res.status(healthStatusCode(report)).json(report);
});

// Main route for production - simple status page
router.get("/", async (req, res) => {
  const report = currentHealthReport();
  res.json({
    service: "Multi WebSocket Server",
    status: "running",
    connections: report.activePlayers,
    activePlayers: report.activePlayers,
    activeGames: report.activeGames,
    uptimeSeconds: report.uptimeSeconds,
    timestamp: report.timestamp,
  });
});

// ...existing code...

// Create express app and listen on specified port
const app = express();

// Shared CORS policy: the same allow-list guards the HTTP app and the Socket.io
// handshake, so anything that can reach /health can also open a socket.
const corsOptions = createCorsOptions(ALLOWED_ORIGINS, ({ origin }) =>
  logger.warn(GAME_EVENTS.CORS_REJECTED, { origin, transport: "http" }),
);
app.use(cors(corsOptions));
app.use(express.static("dist"));

const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(httpLimiter);

// API routes must be mounted BEFORE the SPA fallback. `req.accepts("html")` is
// truthy for `Accept: */*` (curl, the Docker HEALTHCHECK, and platform probes
// all send it), so a fallback registered first would answer /health with
// index.html and the endpoint would never run.
app.use(router);

// Serve index.html for all non-API, non-static routes (SPA support)
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  // If the request accepts HTML, serve index.html
  if (req.accepts("html")) {
    res.sendFile("index.html", { root: "dist" });
  } else {
    next();
  }
});

// Central error handler. Keeps every failure path on the structured logger
// instead of Express's default handler, which prints an unstructured stack
// trace to stdout and would break the "all log output is JSON" guarantee.
// The unused `next` parameter is required: Express identifies error handlers by
// arity, and a 3-argument function is treated as ordinary middleware.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  if (err?.code === CORS_ERROR_CODE) {
    // Already logged by the CORS rejection hook; answer with a clean 403.
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  logger.error("http.request_failed", {
    method: req.method,
    path: req.path,
    message: err?.message,
    code: err?.code,
  });

  res.status(err?.statusCode || 500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  logger.info(GAME_EVENTS.SERVER_STARTED, {
    port: PORT,
    allowedOrigins: ALLOWED_ORIGINS,
    logLevel: process.env.LOG_LEVEL || "info",
    nodeEnv: process.env.NODE_ENV || "development",
  });
});

const ioServer = new Server(server, {
  cors: createCorsOptions(ALLOWED_ORIGINS, ({ origin }) =>
    logger.warn(GAME_EVENTS.CORS_REJECTED, { origin, transport: "websocket" }),
  ),
});

let clients = {};
let gameState = {
  isActive: false,
  mode: "none",
  itPlayerId: null,
  startTime: null,
};

// Per-player scores for the active match. Reset on game start and game end.
let scores = {};

/**
 * Award a point to a player and emit a structured score-change record.
 * @param {string} playerId - Player receiving the point.
 * @param {number} delta - Points to add.
 * @param {string} reason - Why the score changed (e.g. "tag").
 */
const awardScore = (playerId, delta, reason) => {
  const previousScore = scores[playerId] ?? 0;
  const newScore = previousScore + delta;
  scores[playerId] = newScore;

  logger.scoreChanged({ playerId, previousScore, newScore, reason });
  return newScore;
};

// Socket app msgs
ioServer.on("connection", (client) => {
  //Add a new client indexed by their id
  clients[client.id] = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  };

  // Count from the tracked map rather than engine.clientsCount: the engine
  // counter has not yet been decremented inside a `disconnect` handler, so the
  // map is the only source that is accurate on both edges.
  logger.playerConnected({
    playerId: client.id,
    activePlayers: Object.keys(clients).length,
  });

  ioServer.sockets.emit("move", clients);

  // Use client.id from Socket instance to prevent position spoofing
  client.on("move", ({ rotation, position }) => {
    // Rate limit check
    if (checkRateLimit(client.id, "move", RATE_LIMITS.MOVE)) {
      logger.warn(GAME_EVENTS.RATE_LIMITED, {
        playerId: client.id,
        action: "move",
      });
      return;
    }

    // Validate input
    if (!validatePosition(position)) {
      logger.warn(GAME_EVENTS.VALIDATION_FAILED, {
        playerId: client.id,
        field: "position",
      });
      client.emit("error", { message: "Invalid position data" });
      return;
    }

    if (!validateRotation(rotation)) {
      logger.warn(GAME_EVENTS.VALIDATION_FAILED, {
        playerId: client.id,
        field: "rotation",
      });
      client.emit("error", { message: "Invalid rotation data" });
      return;
    }

    if (clients[client.id]) {
      clients[client.id].position = position;
      clients[client.id].rotation = rotation;

      ioServer.sockets.emit("move", clients);
    }
  });

  // Handle chat messages
  client.on("chat-message", async (message) => {
    // Rate limit check (10 messages per minute)
    if (checkRateLimit(client.id, "chat", RATE_LIMITS.CHAT, 60000)) {
      logger.warn(GAME_EVENTS.RATE_LIMITED, {
        playerId: client.id,
        action: "chat",
      });
      client.emit("error", { message: "Slow down! Too many messages." });
      return;
    }

    // Validate message
    if (!validateChatMessage(message)) {
      logger.warn(GAME_EVENTS.VALIDATION_FAILED, {
        playerId: client.id,
        field: "chatMessage",
      });
      client.emit("error", { message: "Invalid message format" });
      return;
    }

    // Message bodies are user content and are intentionally not logged; only
    // metadata is recorded.
    logger.info(GAME_EVENTS.CHAT_MESSAGE, {
      playerId: client.id,
      messageLength: message.message.length,
    });

    // Basic profanity filter (configurable in CHAT_PROFANITY) - use helper
    const defaultBadWords = [
      "fuck",
      "shit",
      "damn",
      "bitch",
      "asshole",
      "bastard",
      "crap",
      "piss",
      "dick",
      "cock",
      "pussy",
      "fag",
      "faggot",
      "nigger",
      "nigga",
      "retard",
      "whore",
      "slut",
      "cunt",
      "motherfucker",
      "fucker",
      "dipshit",
      "dumbass",
      "jackass",
    ];
    const { getBadWordsFromEnv, filterText } = await import("./profanity.js");
    const envList = getBadWordsFromEnv(process.env.CHAT_PROFANITY);
    const badWords = envList && envList.length > 0 ? envList : defaultBadWords;

    const filteredMessage = {
      ...message,
      message: filterText(message.message, badWords),
      timestamp: Date.now(),
    };

    // Broadcast to all clients
    ioServer.sockets.emit("chat-message", filteredMessage);
  });

  // Handle game start
  client.on("game-start", (gameData) => {
    // Rate limit game actions
    if (checkRateLimit(client.id, "game", RATE_LIMITS.GAME_ACTION)) {
      logger.warn(GAME_EVENTS.RATE_LIMITED, {
        playerId: client.id,
        action: "game-start",
      });
      return;
    }

    // Validate game mode
    if (gameData && !validateGameMode(gameData.mode)) {
      logger.warn(GAME_EVENTS.VALIDATION_FAILED, {
        playerId: client.id,
        field: "gameMode",
      });
      client.emit("game-error", { message: "Invalid game mode" });
      return;
    }

    const playerCount = Object.keys(clients).length;
    // Support explicit solo practice mode (allow when at least 1 player exists)
    const isSoloRequest = gameData && gameData.mode === "solo";
    if (
      (isSoloRequest && playerCount >= 1) ||
      (!isSoloRequest && playerCount >= 2)
    ) {
      gameState.isActive = true;
      gameState.mode = gameData.mode;
      gameState.startTime = Date.now();
      scores = {};

      // Pick random 'it' player
      const playerIds = Object.keys(clients);
      gameState.itPlayerId =
        playerIds[Math.floor(Math.random() * playerIds.length)];

      logger.gameStarted({
        mode: gameState.mode,
        itPlayerId: gameState.itPlayerId,
        playerCount,
        requestedBy: client.id,
      });

      // Broadcast game start to all clients
      ioServer.sockets.emit("game-start", {
        ...gameData,
        itPlayerId: gameState.itPlayerId,
        startTime: gameState.startTime,
      });
    } else {
      logger.warn("game.start_rejected", {
        playerId: client.id,
        playerCount,
        reason: "insufficient_players",
      });
      client.emit("game-error", {
        message: "Need at least 2 players to start",
      });
    }
  });

  // Handle player tagging
  client.on("player-tagged", (data) => {
    // The actor is the sending socket, never the payload. Trusting
    // data.taggerId would let any connected client impersonate the IT player,
    // reassign `itPlayerId`, and award points to someone else.
    const taggerId = client.id;
    const taggedId = data?.taggedId;

    const decision = authorizeTag({ taggerId, taggedId, gameState, clients });
    if (!decision.ok) {
      logger.tagRejected({ taggerId, taggedId, reason: decision.reason });
      return;
    }

    gameState.itPlayerId = taggedId;
    awardScore(taggerId, 1, "tag");

    logger.playerTagged({ taggerId, taggedId, mode: gameState.mode });

    // Broadcast to all clients. `scores` is additive — existing clients ignore
    // it. taggerId is overridden with the authenticated actor so a spoofed
    // payload value is never relayed onward.
    ioServer.sockets.emit("player-tagged", {
      ...data,
      taggerId,
      taggedId,
      scores,
    });
  });

  // Handle game end
  client.on("game-end", () => {
    const durationMs = gameState.startTime
      ? Date.now() - gameState.startTime
      : null;

    logger.gameEnded({
      mode: gameState.mode,
      durationMs,
      playerCount: Object.keys(clients).length,
      requestedBy: client.id,
      finalScores: scores,
    });

    gameState.isActive = false;
    gameState.mode = "none";
    gameState.itPlayerId = null;
    gameState.startTime = null;
    scores = {};

    ioServer.sockets.emit("game-end");
  });

  client.on("disconnect", () => {
    // Delete their client from the object
    delete clients[client.id];

    logger.playerDisconnected({
      playerId: client.id,
      activePlayers: Object.keys(clients).length,
      wasIt: gameState.itPlayerId === client.id,
    });

    // Clean up rate limit tracking for this client
    const keysToDelete = [];
    for (const key of rateLimitTrackers.keys()) {
      if (key.startsWith(`${client.id}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => rateLimitTrackers.delete(key));

    ioServer.sockets.emit("move", clients);
  });
});

/**
 * Graceful shutdown: stop accepting new connections, close open sockets, and
 * clear timers so the process can exit cleanly when the platform sends SIGTERM
 * (Render/Docker deploy or scale-down).
 *
 * @param {string} signal - The signal that triggered shutdown.
 */
const shutdown = (signal) => {
  logger.info(GAME_EVENTS.SERVER_SHUTDOWN, {
    signal,
    activePlayers: ioServer ? ioServer.engine.clientsCount : 0,
    uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
  });

  clearInterval(rateLimitCleanupTimer);

  ioServer.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });

  // Failsafe: force exit if connections do not drain within 10 seconds.
  setTimeout(() => process.exit(0), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
