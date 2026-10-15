import { describe, it, expect, vi, afterEach } from "vitest";
import {
  discoverWallets,
  loadSession,
  signInWithWallet,
  clearSession,
  type WalletOption,
} from "../lib/wallet/walletAuth";

const ADDRESS = "0x1234567890123456789012345678901234567890";

const makeWallet = (
  uuid: string,
  request: WalletOption["provider"]["request"],
): WalletOption => ({
  info: { uuid, name: `Wallet ${uuid}`, icon: "", rdns: `io.${uuid}` },
  provider: { request },
});

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.sessionStorage.clear();
  delete (window as { ethereum?: unknown }).ethereum;
});

describe("discoverWallets", () => {
  it("lists wallets that announce via EIP-6963", async () => {
    const wallet = makeWallet("a", vi.fn());
    const onRequest = () =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", { detail: wallet }),
      );
    window.addEventListener("eip6963:requestProvider", onRequest);

    const found = await discoverWallets();
    window.removeEventListener("eip6963:requestProvider", onRequest);

    expect(found.map((w) => w.info.uuid)).toEqual(["a"]);
  });

  it("falls back to window.ethereum when nothing announces", async () => {
    const provider = { request: vi.fn() };
    (window as { ethereum?: unknown }).ethereum = provider;

    const found = await discoverWallets();

    expect(found).toHaveLength(1);
    expect(found[0].provider).toBe(provider);
  });
});

describe("signInWithWallet", () => {
  it("signs the server message and stores the session", async () => {
    const message = "Sign in to Darkmoon.\n\nNonce: abc";
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") return [ADDRESS];
      if (method === "personal_sign") return "0xsig";
      throw new Error(`unexpected ${method}`);
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: ADDRESS, token: "tok" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const session = await signInWithWallet(
      makeWallet("a", request),
      "https://game.example",
    );

    expect(session).toEqual({ address: ADDRESS, token: "tok" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://game.example/auth/nonce");
    expect(fetchMock.mock.calls[1][0]).toBe("https://game.example/auth/verify");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      address: ADDRESS,
      message,
      signature: "0xsig",
    });
    expect(request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [expect.stringMatching(/^0x/), ADDRESS],
    });
    expect(loadSession()).toEqual({ address: ADDRESS, token: "tok" });
  });

  it("throws when the server rejects the signature and stores nothing", async () => {
    const request = vi.fn(async ({ method }: { method: string }) =>
      method === "eth_requestAccounts" ? [ADDRESS] : "0xsig",
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "m" }),
        })
        .mockResolvedValueOnce({ ok: false, status: 401 }),
    );

    await expect(
      signInWithWallet(makeWallet("a", request), "https://game.example"),
    ).rejects.toThrow("The wallet signature was not accepted.");
    expect(loadSession()).toBeNull();
  });

  it("clears a stored session", () => {
    globalThis.sessionStorage.setItem(
      "darkmoon.wallet-session",
      JSON.stringify({ address: ADDRESS, token: "tok" }),
    );
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
