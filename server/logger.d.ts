export type LogLevelName = "debug" | "info" | "warn" | "error" | "silent";

export interface LogContext {
  [key: string]: unknown;
}
export type LogRecord = Record<string, unknown> & {
  timestamp: string;
  level: string;
  event: string;
};

export const LOG_LEVELS: Record<string, number>;
export const DEFAULT_LOG_LEVEL: string;
export const GAME_EVENTS: {
  SERVER_STARTED: string;
  SERVER_SHUTDOWN: string;
  PLAYER_CONNECTED: string;
  PLAYER_DISCONNECTED: string;
  PLAYER_TAGGED: string;
  TAG_REJECTED: string;
  SCORE_CHANGED: string;
  GAME_STARTED: string;
  GAME_ENDED: string;
  CHAT_MESSAGE: string;
  RATE_LIMITED: string;
  VALIDATION_FAILED: string;
  CORS_REJECTED: string;
  CORS_UNSAFE_WILDCARD_DROPPED: string;
};

export function resolveLevel(level: string | undefined | null): number;
export function buildRecord(
  level: string,
  event: string,
  context?: LogContext,
  now?: () => string,
): LogRecord;
export function serializeRecord(record: LogRecord): string;

export interface Logger {
  isLevelEnabled(level: string): boolean;
  log(level: string, event: string, context?: LogContext): LogRecord | null;
  debug(event: string, context?: LogContext): LogRecord | null;
  info(event: string, context?: LogContext): LogRecord | null;
  warn(event: string, context?: LogContext): LogRecord | null;
  error(event: string, context?: LogContext): LogRecord | null;
  child(extraBase?: LogContext): Logger;
  playerConnected(data: {
    playerId: string;
    activePlayers: number;
  }): LogRecord | null;
  playerDisconnected(data: {
    playerId: string;
    activePlayers: number;
    wasIt?: boolean;
  }): LogRecord | null;
  playerTagged(data: {
    taggerId: string;
    taggedId: string;
    mode?: string;
  }): LogRecord | null;
  tagRejected(data: {
    taggerId: string;
    taggedId: string;
    reason: string;
  }): LogRecord | null;
  scoreChanged(data: {
    playerId: string;
    previousScore: number;
    newScore: number;
    reason?: string;
  }): LogRecord | null;
  gameStarted(data: {
    mode: string;
    itPlayerId?: string | null;
    playerCount: number;
  }): LogRecord | null;
  gameEnded(data: {
    mode?: string;
    durationMs?: number | null;
    playerCount?: number;
  }): LogRecord | null;
}

export function createLogger(options?: {
  level?: string;
  write?: (line: string) => void;
  base?: LogContext;
  now?: () => string;
}): Logger;

declare const _default: {
  createLogger: typeof createLogger;
  LOG_LEVELS: typeof LOG_LEVELS;
  GAME_EVENTS: typeof GAME_EVENTS;
  buildRecord: typeof buildRecord;
};
export default _default;
