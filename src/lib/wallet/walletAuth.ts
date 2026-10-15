/**
 * Wallet sign-in for multiplayer. Works with any injected browser wallet:
 * wallets that announce themselves via EIP-6963 are listed individually, and a
 * plain `window.ethereum` provider is used as a fallback. Mobile wallets are
 * offered through WalletConnect when a project ID is configured.
 */
import {
  getWalletConnectProjectId,
  walletConnectOption,
} from "./walletConnect";

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface WalletOption {
  info: WalletInfo;
  provider: Eip1193Provider;
}

export interface WalletSession {
  address: string;
  token: string;
}

const SESSION_KEY = "darkmoon.wallet-session";
const DISCOVERY_WINDOW_MS = 300;

export const getServerUrl = (): string =>
  import.meta.env.VITE_SOCKET_SERVER_URL || window.location.origin;

/**
 * Collect injected wallets. EIP-6963 announcements arrive synchronously in
 * response to the request event, so a short window is enough.
 */
export const discoverWallets = (): Promise<WalletOption[]> =>
  new Promise((resolve) => {
    const found = new Map<string, WalletOption>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<WalletOption>).detail;
      if (detail?.info?.uuid && detail.provider) {
        found.set(detail.info.uuid, detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);

      const legacy = (window as { ethereum?: Eip1193Provider }).ethereum;
      const alreadyListed = [...found.values()].some(
        (wallet) => wallet.provider === legacy,
      );
      if (legacy && !alreadyListed) {
        found.set("legacy", {
          info: {
            uuid: "legacy",
            name: "Browser wallet",
            icon: "",
            rdns: "legacy",
          },
          provider: legacy,
        });
      }

      const wallets = [...found.values()];
      const projectId = getWalletConnectProjectId();
      if (projectId) wallets.push(walletConnectOption(projectId));

      resolve(wallets);
    }, DISCOVERY_WINDOW_MS);
  });

const toHex = (text: string): string =>
  "0x" +
  Array.from(new globalThis.TextEncoder().encode(text))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * Connect the chosen wallet, sign the server's one-time message, and exchange
 * the signature for a session token.
 *
 * @throws Error when the user rejects a request or the server rejects the signature.
 */
export const signInWithWallet = async (
  wallet: WalletOption,
  serverUrl: string = getServerUrl(),
): Promise<WalletSession> => {
  const accounts = (await wallet.provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("No account was selected in the wallet.");

  const nonceRes = await globalThis.fetch(`${serverUrl}/auth/nonce`, {
    method: "POST",
  });
  if (!nonceRes.ok) throw new Error("Could not start sign-in.");
  const { message } = (await nonceRes.json()) as { message: string };

  const signature = (await wallet.provider.request({
    method: "personal_sign",
    params: [toHex(message), address],
  })) as string;

  const verifyRes = await globalThis.fetch(`${serverUrl}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature }),
  });
  if (!verifyRes.ok) throw new Error("The wallet signature was not accepted.");

  const session = (await verifyRes.json()) as WalletSession;
  saveSession(session);
  return session;
};

export const saveSession = (session: WalletSession): void => {
  try {
    globalThis.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode); the session then lasts the page view only.
  }
};

export const loadSession = (): WalletSession | null => {
  try {
    const raw = globalThis.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WalletSession>;
    return typeof parsed.token === "string" &&
      typeof parsed.address === "string"
      ? { address: parsed.address, token: parsed.token }
      : null;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  try {
    globalThis.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
};
