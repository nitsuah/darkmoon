import express from "express";
import Router from "express-promise-router";
import { Server } from "socket.io";
import cors from "cors";
import {
  validatePosition,
  validateRotation,
  validateChatMessage,
  validateGameMode,
} from "./server/validation.js";

// Environment configuration
const PORT = process.env.PORT || 4444;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://localhost:4444",
      "https://deploy-preview-*--darkmoon-dev.netlify.app",
      "https://darkmoon-dev.netlify.app",
    ];

// Rate limiting configuration
const RATE_LIMITS = {
  MOVE: 100, // Max 100 move events per second per client
  CHAT: 10, // Max 10 chat messages per minute per client
  GAME_ACTION: 5, // Max 5 game actions per second per client
};

// Track rate limits per client
const rateLimitTrackers = new Map();

/**
 * Clean up old rate limit entries to prevent memory leaks
 * Runs every 5 minutes
 */
setInterval(() => {
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
    console.log(
      `[Rate Limit Cleanup] Removed ${keysToDelete.length} stale entries`
    );
  }
}, 300000); // Run every 5 minutes

/**
 * Check if client exceeds rate limit
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

// Create router
const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connections: ioServer ? ioServer.engine.clientsCount : 0,
  });
});

// Main route for production - simple status page
router.get("/", async (req, res) => {
  res.json({
    service: "Multi WebSocket Server",
    status: "running",
    connections: ioServer ? ioServer.engine.clientsCount : 0,
    timestamp: new Date().toISOString(),
  });
});

// Everything else that's not index 404s
router.use("*", (req, res) => {
  res.status(404).send({ message: "Not Found" });
});

// Create express app and listen on specified port
const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      const isAllowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
        if (allowedOrigin.includes("*")) {
          const pattern = new RegExp(
            "^" + allowedOrigin.replace(/\*/g, ".*") + "$"
          );
          return pattern.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.static("dist"));
app.use(router);

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}...`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});

const ioServer = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      const isAllowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
        if (allowedOrigin.includes("*")) {
          const pattern = new RegExp(
            "^" + allowedOrigin.replace(/\*/g, ".*") + "$"
          );
          return pattern.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let clients = {};
let gameState = {
  isActive: false,
  mode: "none",
  itPlayerId: null,
  startTime: null,
};

// Socket app msgs
ioServer.on("connection", (client) => {
  console.log(
    `User ${client.id} connected, Total: ${ioServer.engine.clientsCount} users connected`
  );

  //Add a new client indexed by their id
  clients[client.id] = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  };

  ioServer.sockets.emit("move", clients);

  // Use client.id from Socket instance to prevent position spoofing
  client.on("move", ({ rotation, position }) => {
    // Rate limit check
    if (checkRateLimit(client.id, "move", RATE_LIMITS.MOVE)) {
      console.warn(`Rate limit exceeded for ${client.id} on move events`);
      return;
    }

    // Validate input
    if (!validatePosition(position)) {
      console.warn(`Invalid position from ${client.id}:`, position);
      client.emit("error", { message: "Invalid position data" });
      return;
    }

    if (!validateRotation(rotation)) {
      console.warn(`Invalid rotation from ${client.id}:`, rotation);
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
      console.warn(`Rate limit exceeded for ${client.id} on chat`);
      client.emit("error", { message: "Slow down! Too many messages." });
      return;
    }

    // Validate message
    if (!validateChatMessage(message)) {
      console.warn(`Invalid chat message from ${client.id}`);
      client.emit("error", { message: "Invalid message format" });
      return;
    }

    console.log(`Chat message from ${client.id}: ${message.message}`);

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
    const { getBadWordsFromEnv, filterText } = await import(
      "./server/profanity.js"
    );
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
      console.warn(`Rate limit exceeded for ${client.id} on game actions`);
      return;
    }

    // Validate game mode
    if (gameData && !validateGameMode(gameData.mode)) {
      console.warn(`Invalid game mode from ${client.id}:`, gameData.mode);
      client.emit("game-error", { message: "Invalid game mode" });
      return;
    }

    console.log(`Game start requested by ${client.id}:`, gameData);

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

      // Pick random 'it' player
      const playerIds = Object.keys(clients);
      gameState.itPlayerId =
        playerIds[Math.floor(Math.random() * playerIds.length)];

      console.log(`Game started! ${gameState.itPlayerId} is IT!`);

      // Broadcast game start to all clients
      ioServer.sockets.emit("game-start", {
        ...gameData,
        itPlayerId: gameState.itPlayerId,
        startTime: gameState.startTime,
      });
    } else {
      client.emit("game-error", {
        message: "Need at least 2 players to start",
      });
    }
  });

  // Handle player tagging
  client.on("player-tagged", (data) => {
    console.log(`Tag attempt: ${data.taggerId} -> ${data.taggedId}`);

    if (
      gameState.isActive &&
      gameState.mode === "tag" &&
      data.taggerId === gameState.itPlayerId
    ) {
      // Verify both players exist
      if (clients[data.taggerId] && clients[data.taggedId]) {
        gameState.itPlayerId = data.taggedId;
        console.log(`Tag successful! ${data.taggedId} is now IT!`);

        // Broadcast to all clients
        ioServer.sockets.emit("player-tagged", data);
      }
    }
  });

  // Handle game end
  client.on("game-end", () => {
    console.log(`Game end requested by ${client.id}`);

    gameState.isActive = false;
    gameState.mode = "none";
    gameState.itPlayerId = null;
    gameState.startTime = null;

    ioServer.sockets.emit("game-end");
  });

  client.on("disconnect", () => {
    console.log(
      `User ${client.id} disconnected, there are currently ${ioServer.engine.clientsCount} users connected`
    );

    // Delete their client from the object
    delete clients[client.id];

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
