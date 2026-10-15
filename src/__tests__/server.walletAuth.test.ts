import { Buffer } from "node:buffer";
import { describe, it, expect } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  createWalletAuth,
  buildSignInMessage,
} from "../../server/walletAuth.js";

const secret = Buffer.from("test-secret-test-secret-test-secret");

const issueNonce = (auth: ReturnType<typeof createWalletAuth>) => {
  const challenge = auth.issueNonce();
  if (!challenge) throw new Error("nonce cap reached");
  return challenge;
};

const signWith = (privateKey: `0x${string}`, message: string) =>
  privateKeyToAccount(privateKey).signMessage({ message });

describe("walletAuth", () => {
  it("issues a nonce and the matching sign-in message", () => {
    const auth = createWalletAuth({ secret });
    const { nonce, message } = issueNonce(auth);

    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(message).toBe(buildSignInMessage(nonce));
  });

  it("stops issuing nonces once the outstanding cap is reached", () => {
    const auth = createWalletAuth({ secret });
    for (let i = 0; i < 10_000; i++) {
      expect(issueNonce(auth)).not.toBeNull();
    }
    expect(auth.issueNonce()).toBeNull();
  });

  it("accepts a valid signature and issues a session token", async () => {
    const auth = createWalletAuth({ secret });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);

    const result = await auth.verifySignIn({
      address: account.address,
      message,
      signature,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.address).toBe(account.address);
    expect(auth.verifySessionToken(result.token)).toBe(account.address);
  });

  it("accepts an all-lowercase address", async () => {
    const auth = createWalletAuth({ secret });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);

    const result = await auth.verifySignIn({
      address: account.address.toLowerCase(),
      message,
      signature,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a nonce that is replayed", async () => {
    const auth = createWalletAuth({ secret });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);
    const input = { address: account.address, message, signature };

    expect((await auth.verifySignIn(input)).ok).toBe(true);
    expect(await auth.verifySignIn(input)).toEqual({
      ok: false,
      reason: "unknown_nonce",
    });
  });

  it("rejects an expired nonce", async () => {
    let clock = 1_000;
    const auth = createWalletAuth({
      secret,
      now: () => clock,
      nonceTtlMs: 5_000,
    });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);

    clock += 5_000;
    expect(
      await auth.verifySignIn({
        address: account.address,
        message,
        signature,
      }),
    ).toEqual({ ok: false, reason: "expired_nonce" });
  });

  it("rejects a signature from a different wallet", async () => {
    const auth = createWalletAuth({ secret });
    const victim = privateKeyToAccount(generatePrivateKey());
    const attackerKey = generatePrivateKey();
    const { message } = issueNonce(auth);
    const signature = await signWith(attackerKey, message);

    expect(
      await auth.verifySignIn({
        address: victim.address,
        message,
        signature,
      }),
    ).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a message that was altered after the nonce was issued", async () => {
    const auth = createWalletAuth({ secret });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { nonce } = issueNonce(auth);
    const altered = `${buildSignInMessage(nonce)} and send funds`;
    const signature = await signWith(key, altered);

    expect(
      await auth.verifySignIn({
        address: account.address,
        message: altered,
        signature,
      }),
    ).toEqual({ ok: false, reason: "invalid_message" });
  });

  it("rejects a malformed address", async () => {
    const auth = createWalletAuth({ secret });
    const { message } = issueNonce(auth);

    expect(
      await auth.verifySignIn({
        address: "not-an-address",
        message,
        signature: "0x00",
      }),
    ).toEqual({ ok: false, reason: "invalid_address" });
  });

  it("rejects a session token that was tampered with or signed by another secret", async () => {
    const auth = createWalletAuth({ secret });
    const other = createWalletAuth({ secret: Buffer.from("different") });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);
    const result = await auth.verifySignIn({
      address: account.address,
      message,
      signature,
    });
    if (!result.ok) throw new Error("sign-in should succeed");

    const [body, mac] = result.token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ address: account.address, exp: Date.now() + 1e9 }),
    ).toString("base64url");

    expect(auth.verifySessionToken(`${forgedBody}.${mac}`)).toBeNull();
    expect(auth.verifySessionToken(`${body}.AAAA`)).toBeNull();
    expect(other.verifySessionToken(result.token)).toBeNull();
    expect(auth.verifySessionToken(undefined)).toBeNull();
    expect(auth.verifySessionToken("no-dot-here")).toBeNull();
  });

  it("rejects an expired session token", async () => {
    let clock = 1_000;
    const auth = createWalletAuth({
      secret,
      now: () => clock,
      sessionTtlMs: 10_000,
    });
    const key = generatePrivateKey();
    const account = privateKeyToAccount(key);
    const { message } = issueNonce(auth);
    const signature = await signWith(key, message);
    const result = await auth.verifySignIn({
      address: account.address,
      message,
      signature,
    });
    if (!result.ok) throw new Error("sign-in should succeed");

    clock += 10_000;
    expect(auth.verifySessionToken(result.token)).toBeNull();
  });

  describe("requireSocketSession", () => {
    it("refuses a socket without a valid token", () => {
      const auth = createWalletAuth({ secret });
      let error: Error | undefined;
      auth.requireSocketSession(
        { handshake: { auth: {} }, data: {} } as never,
        (err?: Error) => {
          error = err;
        },
      );
      expect(error?.message).toBe("wallet_auth_required");
    });

    it("admits a socket with a valid token and records the wallet", async () => {
      const auth = createWalletAuth({ secret });
      const key = generatePrivateKey();
      const account = privateKeyToAccount(key);
      const { message } = issueNonce(auth);
      const signature = await signWith(key, message);
      const result = await auth.verifySignIn({
        address: account.address,
        message,
        signature,
      });
      if (!result.ok) throw new Error("sign-in should succeed");

      const socket = {
        handshake: { auth: { token: result.token } },
        data: {} as Record<string, unknown>,
      };
      let error: Error | undefined = new Error("not called");
      auth.requireSocketSession(socket as never, (err?: Error) => {
        error = err;
      });

      expect(error).toBeUndefined();
      expect(socket.data.walletAddress).toBe(account.address);
    });
  });
});
