/**
 * WalletConnect option for wallets that run on a phone (Coinbase Wallet,
 * MetaMask Mobile, Rainbow, ...). The player scans a QR code or taps a link,
 * approves in the wallet app, and the sign-in flow runs over that session.
 *
 * Needs a WalletConnect project ID at build time (VITE_WALLETCONNECT_PROJECT_ID).
 * The provider library is loaded on first use so it stays out of the main bundle.
 */
import type { Eip1193Provider, WalletOption } from "./walletAuth";

export const getWalletConnectProjectId = (): string | undefined =>
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || undefined;

let providerPromise: Promise<Eip1193Provider> | null = null;

const initProvider = (projectId: string): Promise<Eip1193Provider> => {
  if (!providerPromise) {
    providerPromise = import("@walletconnect/ethereum-provider")
      .then(({ default: EthereumProvider }) =>
        EthereumProvider.init({
          projectId,
          chains: [1],
          showQrModal: true,
          metadata: {
            name: "Darkmoon",
            description: "Darkmoon multiplayer",
            url: window.location.origin,
            icons: [],
          },
        }),
      )
      .then((provider) => provider as unknown as Eip1193Provider)
      .catch((err: unknown) => {
        // Allow a retry after a failed init (e.g. the user closed the QR modal).
        providerPromise = null;
        throw err;
      });
  }
  return providerPromise;
};

/**
 * A wallet option whose provider is created on the first request, so opening
 * the sign-in gate does not show a QR code until the player picks this option.
 */
export const walletConnectOption = (projectId: string): WalletOption => ({
  info: {
    uuid: "walletconnect",
    name: "Mobile wallet (QR code)",
    icon: "",
    rdns: "walletconnect",
  },
  provider: {
    request: async (args) => (await initProvider(projectId)).request(args),
  },
});
