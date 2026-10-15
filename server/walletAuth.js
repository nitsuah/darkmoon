/**
 * Wallet sign-in for the multiplayer server.
 *
 * Flow: the client asks for a nonce, the wallet signs a message containing it
 * (personal_sign), and the server recovers the signer and issues a signed
 * session token. The token is then sent in the Socket.io handshake; sockets
 * without a valid token are refused.
 *
 * Tokens are HMAC-signed and stateless, so the only server state is the set of
 * outstanding nonces, which are single-use and short-lived.
 */
import { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress, verifyMessage } from "viem";

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const NONCE_PATTERN = /Nonce: ([0-9a-f]{32})/;

/**
 * The exact text a wallet signs. Verification rebuilds this from the nonce and
 * rejects anything else, so a signature cannot be replayed for another message.
 *
 * @param {string} nonce - Server-issued nonce.
 * @returns {string} Message to sign.
 */
export const buildSignInMessage = (nonce) =>
  `Sign in to Darkmoon.\n\nNonce: ${nonce}\n\nSigning does not send a transaction or cost gas.`;

/**
 * Create a wallet auth instance. Injected dependencies keep it testable.
 *
 * @param {object} [options]
 * @param {Buffer|string} [options.secret] - HMAC key for session tokens. Random per process if omitted, so tokens do not survive a restart.
 * @param {() => number} [options.now] - Clock in ms.
 * @param {number} [options.nonceTtlMs]
 * @param {number} [options.sessionTtlMs]
 */
export const createWalletAuth = ({
  secret = randomBytes(32),
  now = () => Date.now(),
  nonceTtlMs = NONCE_TTL_MS,
  sessionTtlMs = SESSION_TTL_MS,
} = {}) => {
  // nonce -> expiry timestamp (ms)
  const nonces = new Map();

  const sign = (body) =>
    createHmac("sha256", secret).update(body).digest("base64url");

  const pruneExpiredNonces = () => {
    const current = now();
    for (const [nonce, expiresAt] of nonces) {
      if (expiresAt <= current) nonces.delete(nonce);
    }
  };

  /**
   * Issue a fresh single-use nonce and the message the wallet should sign.
   * @returns {{ nonce: string, message: string }}
   */
  const issueNonce = () => {
    pruneExpiredNonces();
    const nonce = randomBytes(16).toString("hex");
    nonces.set(nonce, now() + nonceTtlMs);
    return { nonce, message: buildSignInMessage(nonce) };
  };

  const issueSessionToken = (address) => {
    const body = Buffer.from(
      JSON.stringify({ address, exp: now() + sessionTtlMs }),
    ).toString("base64url");
    return `${body}.${sign(body)}`;
  };

  /**
   * Check a session token and return the wallet address it was issued for.
   * @param {unknown} token
   * @returns {string|null} Checksummed address, or null if invalid or expired.
   */
  const verifySessionToken = (token) => {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, mac] = parts;

    const expected = Buffer.from(sign(body));
    const given = Buffer.from(mac);
    if (given.length !== expected.length) return null;
    if (!timingSafeEqual(given, expected)) return null;

    let payload;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    if (
      !payload ||
      typeof payload.address !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now()
    ) {
      return null;
    }
    return payload.address;
  };

  /**
   * Verify a signed sign-in message and, on success, issue a session token.
   * The nonce is consumed before the signature is checked, so each nonce can be
   * tried only once.
   *
   * @param {{ address: unknown, message: unknown, signature: unknown }} input
   * @returns {Promise<{ ok: true, address: string, token: string } | { ok: false, reason: string }>}
   */
  const verifySignIn = async ({ address, message, signature }) => {
    if (typeof address !== "string" || !isAddress(address, { strict: false })) {
      return { ok: false, reason: "invalid_address" };
    }
    if (typeof message !== "string" || typeof signature !== "string") {
      return { ok: false, reason: "invalid_request" };
    }

    const match = NONCE_PATTERN.exec(message);
    if (!match) return { ok: false, reason: "invalid_message" };
    const nonce = match[1];

    const expiresAt = nonces.get(nonce);
    if (expiresAt === undefined) return { ok: false, reason: "unknown_nonce" };
    nonces.delete(nonce);
    if (expiresAt <= now()) return { ok: false, reason: "expired_nonce" };

    if (message !== buildSignInMessage(nonce)) {
      return { ok: false, reason: "invalid_message" };
    }

    // Lowercasing first: getAddress rejects mixed-case input with a bad checksum.
    const checksummed = getAddress(address.toLowerCase());
    let valid = false;
    try {
      valid = await verifyMessage({
        address: checksummed,
        message,
        signature,
      });
    } catch {
      valid = false;
    }
    if (!valid) return { ok: false, reason: "bad_signature" };

    return {
      ok: true,
      address: checksummed,
      token: issueSessionToken(checksummed),
    };
  };

  /**
   * Socket.io middleware: refuse any connection without a valid session token.
   * The handshake must carry `auth: { token }`.
   */
  const requireSocketSession = (socket, next) => {
    const address = verifySessionToken(socket.handshake.auth?.token);
    if (!address) {
      next(new Error("wallet_auth_required"));
      return;
    }
    socket.data.walletAddress = address;
    next();
  };

  return {
    issueNonce,
    verifySignIn,
    verifySessionToken,
    requireSocketSession,
  };
};
