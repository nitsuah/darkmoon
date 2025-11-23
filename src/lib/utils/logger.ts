/**
 * Unified logging utility for consistent debug logging across the application
 * Automatically gates debug logs to development environment only
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Check if we're in development mode
 * Works in both browser (Vite) and Node.js (tests) environments
 */
const isDevelopment = (): boolean => {
  try {
    // Check Vite's import.meta.env first (browser)
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      return true;
    }
  } catch {
    // import.meta not available
  }

  try {
    // Check Node.js process.env (tests/server)
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV !== "production"
    ) {
      return true;
    }
  } catch {
    // process not available
  }

  return false;
};

/**
 * Creates a namespaced logger with automatic development-only debug filtering
 *
 * @param namespace - The namespace for this logger (e.g., 'GameManager', 'PlayerCharacter')
 * @returns Logger instance with debug, info, warn, and error methods
 *
 * @example
 * ```ts
 * const log = createLogger('GameManager');
 * log.debug('Game started', gameState); // Only logs in dev
 * log.error('Failed to start game', error); // Always logs
 * ```
 */
export const createLogger = (namespace: string): Logger => {
  const isDev = isDevelopment();

  const formatMessage = (level: LogLevel, args: unknown[]): unknown[] => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    const prefix = `[${namespace} ${timestamp}]`;
    return [prefix, ...args];
  };

  return {
    debug: (...args: unknown[]) => {
      if (isDev) {
        console.log(...formatMessage("debug", args));
      }
    },
    info: (...args: unknown[]) => {
      console.log(...formatMessage("info", args));
    },
    warn: (...args: unknown[]) => {
      console.warn(...formatMessage("warn", args));
    },
    error: (...args: unknown[]) => {
      console.error(...formatMessage("error", args));
    },
  };
};

/**
 * Create a specialized tag logger with consistent formatting
 * Used specifically for tag game debugging
 */
export const createTagLogger = (namespace: string) => {
  const isDev = isDevelopment();

  return (...args: unknown[]) => {
    if (isDev) {
      const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
      console.log(`[TAG ${timestamp}]`, `[${namespace}]`, ...args);
    }
  };
};
