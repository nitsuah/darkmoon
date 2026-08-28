/**
 * CORS origin policy for the multiplayer WebSocket/HTTP server.
 *
 * The same allow-list is applied to the Express HTTP app and to the Socket.io
 * handshake so that a browser that can reach `/health` can also open a socket.
 *
 * Origins are configured via the `ALLOWED_ORIGINS` environment variable as a
 * comma-separated list. A `*` inside an entry acts as a wildcard for a single
 * chunk of the origin (used for Netlify deploy previews); every other character
 * is matched literally.
 */

/**
 * Default allow-list used when `ALLOWED_ORIGINS` is not set.
 * @type {string[]}
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4444",
  "https://deploy-preview-*--darkmoon-dev.netlify.app",
  "https://darkmoon-dev.netlify.app",
];

/**
 * Parse the `ALLOWED_ORIGINS` env var into a normalized allow-list.
 *
 * Empty/whitespace-only entries are dropped, and each entry is trimmed so that
 * `"a, b"` and `"a,b"` behave identically. A bare `*` entry is also dropped
 * (see {@link isUnsafeWildcard}) rather than kept, since `createCorsOptions`
 * always sets `credentials: true` and reflecting every origin under that
 * combination (CWE-942) would let any site make authenticated requests as a
 * logged-in player. Falls back to {@link DEFAULT_ALLOWED_ORIGINS} when the
 * value is missing or contains no usable entries after filtering.
 *
 * @param {string | undefined | null} envValue - Raw env var value.
 * @param {(event: { entry: string }) => void} [onUnsafeWildcard] - Optional
 *   hook invoked once per bare-`*` entry that gets dropped, used for
 *   structured logging so a misconfiguration is visible instead of silently
 *   downgraded.
 * @returns {string[]} Normalized allow-list (never empty).
 */
export const parseAllowedOrigins = (envValue, onUnsafeWildcard) => {
  if (typeof envValue !== "string") return [...DEFAULT_ALLOWED_ORIGINS];

  const parsed = envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .filter((origin) => {
      if (!isUnsafeWildcard(origin)) return true;
      if (typeof onUnsafeWildcard === "function")
        onUnsafeWildcard({ entry: origin });
      return false;
    });

  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
};

/**
 * A bare `*` (optionally with surrounding whitespace, already trimmed by the
 * caller) matches every origin once compiled by {@link matchesOrigin}. Unlike
 * a scoped wildcard such as `https://deploy-preview-*--darkmoon-dev.netlify.app`,
 * it carries no host constraint at all, so allowing it here would combine
 * with `credentials: true` to permit any origin to make authenticated
 * cross-site requests (CWE-942).
 *
 * @param {string} entry - Single allow-list entry.
 * @returns {boolean} True when the entry is exactly `*`.
 */
export const isUnsafeWildcard = (entry) => entry === "*";

/**
 * Escape regex metacharacters, leaving `*` intact so it can become a
 * single-label wildcard.
 *
 * Without escaping, an entry like `https://darkmoon-dev.netlify.app` would be
 * compiled with `.` as "any character" and would match hostile look-alike
 * origins such as `https://darkmoon-devxnetlify.app`.
 *
 * `*` expands to `[^.]*` rather than `.*` so it matches only within a single
 * DNS label. A cross-label `.*` would let a deploy-preview pattern like
 * `https://deploy-preview-*--darkmoon-dev.netlify.app` also match an origin
 * with extra, attacker-controlled subdomains spliced into the wildcard slot
 * (e.g. `https://deploy-preview-1.attacker.example--darkmoon-dev.netlify.app`).
 *
 * @param {string} pattern - Allow-list entry.
 * @returns {string} Regex source escaped everywhere except `*`.
 */
const escapeExceptWildcard = (pattern) =>
  pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]*");

/**
 * Test a single origin against a single allow-list entry.
 *
 * @param {string} origin - Browser-supplied `Origin` header.
 * @param {string} allowedOrigin - Allow-list entry, possibly containing `*`.
 * @returns {boolean} True when the origin matches the entry.
 */
export const matchesOrigin = (origin, allowedOrigin) => {
  if (typeof origin !== "string" || typeof allowedOrigin !== "string") {
    return false;
  }

  if (!allowedOrigin.includes("*")) return origin === allowedOrigin;

  return new RegExp(`^${escapeExceptWildcard(allowedOrigin)}$`).test(origin);
};

/**
 * Check an origin against the whole allow-list.
 *
 * A missing origin (`undefined`/`null`/`""`) is allowed: non-browser clients
 * such as curl, container health checks, and native apps send no `Origin`
 * header, and CORS is not a defense against those callers anyway.
 *
 * @param {string | undefined | null} origin - Browser-supplied `Origin` header.
 * @param {string[]} allowedOrigins - Allow-list from {@link parseAllowedOrigins}.
 * @returns {boolean} True when the request should be allowed.
 */
export const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  if (!Array.isArray(allowedOrigins)) return false;

  return allowedOrigins.some((allowedOrigin) =>
    matchesOrigin(origin, allowedOrigin),
  );
};

/**
 * Build the `origin` callback consumed by both the `cors` middleware and the
 * Socket.io server options.
 *
 * @param {string[]} allowedOrigins - Allow-list from {@link parseAllowedOrigins}.
 * @param {(event: { origin: string }) => void} [onRejected] - Optional hook
 *   invoked when an origin is rejected, used for structured logging.
 * @returns {(origin: string | undefined, callback: Function) => void} Origin callback.
 */
export const createOriginCallback = (allowedOrigins, onRejected) => {
  return (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    if (typeof onRejected === "function") {
      onRejected({ origin });
    }

    callback(createCorsError());
  };
};

/**
 * Error code tagged onto CORS rejections so the Express error handler can turn
 * them into a clean 403 instead of a generic 500 with a stack trace.
 * @type {string}
 */
export const CORS_ERROR_CODE = "ERR_CORS_ORIGIN_DENIED";

/**
 * Build the error passed to the CORS callback on rejection.
 * @returns {Error & { code: string, statusCode: number }}
 */
export const createCorsError = () => {
  const error = /** @type {Error & { code: string, statusCode: number }} */ (
    new Error("Not allowed by CORS")
  );
  error.code = CORS_ERROR_CODE;
  error.statusCode = 403;
  return error;
};

/**
 * Build the shared CORS options object (methods/credentials are identical for
 * the HTTP app and the socket handshake).
 *
 * @param {string[]} allowedOrigins - Allow-list from {@link parseAllowedOrigins}.
 * @param {(event: { origin: string }) => void} [onRejected] - Rejection hook.
 * @returns {{ origin: Function, methods: string[], credentials: boolean }} CORS options.
 */
export const createCorsOptions = (allowedOrigins, onRejected) => ({
  origin: createOriginCallback(allowedOrigins, onRejected),
  methods: ["GET", "POST"],
  credentials: true,
});

export default {
  DEFAULT_ALLOWED_ORIGINS,
  CORS_ERROR_CODE,
  parseAllowedOrigins,
  isUnsafeWildcard,
  matchesOrigin,
  isOriginAllowed,
  createCorsError,
  createOriginCallback,
  createCorsOptions,
};
