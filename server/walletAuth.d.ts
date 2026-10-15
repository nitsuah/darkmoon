import type { Buffer } from "node:buffer";

export interface WalletAuthOptions {
  secret?: Buffer | string;
  now?: () => number;
  nonceTtlMs?: number;
  sessionTtlMs?: number;
}

export interface NonceChallenge {
  nonce: string;
  message: string;
}

export type SignInResult =
  { ok: true; address: string; token: string } | { ok: false; reason: string };

export interface SocketLike {
  handshake: { auth?: { token?: unknown } };
  data: Record<string, unknown>;
}

export interface WalletAuth {
  /** Returns null when too many nonces are outstanding. */
  issueNonce(): NonceChallenge | null;
  verifySignIn(input: {
    address: unknown;
    message: unknown;
    signature: unknown;
  }): Promise<SignInResult>;
  verifySessionToken(token: unknown): string | null;
  requireSocketSession(socket: SocketLike, next: (err?: Error) => void): void;
}

export function buildSignInMessage(nonce: string): string;
export function createWalletAuth(options?: WalletAuthOptions): WalletAuth;
