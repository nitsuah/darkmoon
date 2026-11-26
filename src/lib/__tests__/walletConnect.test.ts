import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type WalletConnectModule = typeof import("../wallet/walletConnect");

describe("walletConnect", () => {
  let init: ReturnType<typeof vi.fn>;
  let fakeRequest: ReturnType<typeof vi.fn>;
  let mod: WalletConnectModule;

  beforeEach(async () => {
    vi.resetModules();
    fakeRequest = vi.fn().mockResolvedValue(["0xabc"]);
    init = vi.fn().mockResolvedValue({ request: fakeRequest });
    vi.doMock("@walletconnect/ethereum-provider", () => ({
      default: { init },
    }));
    mod = await import("../wallet/walletConnect");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@walletconnect/ethereum-provider");
  });

  describe("getWalletConnectProjectId", () => {
    it("returns undefined when the env var is unset", () => {
      vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", undefined as never);
      expect(mod.getWalletConnectProjectId()).toBeUndefined();
    });

    it("returns undefined when the env var is an empty string", () => {
      vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", "");
      expect(mod.getWalletConnectProjectId()).toBeUndefined();
    });

    it("returns the configured project id", () => {
      vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", "abc123");
      expect(mod.getWalletConnectProjectId()).toBe("abc123");
    });
  });

  describe("walletConnectOption", () => {
    it("exposes the mobile wallet info", () => {
      expect(mod.walletConnectOption("pid").info).toEqual({
        uuid: "walletconnect",
        name: "Mobile wallet (QR code)",
        icon: "",
        rdns: "walletconnect",
      });
    });

    it("is lazy: init runs on the first request with the expected options", async () => {
      const option = mod.walletConnectOption("pid");
      expect(init).not.toHaveBeenCalled();

      const args = { method: "eth_requestAccounts" };
      const result = await option.provider.request(args);

      expect(init).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "pid",
          chains: [1],
          showQrModal: true,
        }),
      );
      expect(fakeRequest).toHaveBeenCalledWith(args);
      expect(result).toEqual(["0xabc"]);
    });

    it("reuses the same provider on later requests", async () => {
      const option = mod.walletConnectOption("pid");
      await option.provider.request({ method: "eth_requestAccounts" });
      await option.provider.request({ method: "eth_chainId" });
      expect(init).toHaveBeenCalledTimes(1);
      expect(fakeRequest).toHaveBeenCalledTimes(2);
    });

    it("rejects with the init error, then retries init on the next request", async () => {
      const boom = new Error("modal closed");
      init.mockRejectedValueOnce(boom);
      const option = mod.walletConnectOption("pid");

      await expect(
        option.provider.request({ method: "eth_requestAccounts" }),
      ).rejects.toBe(boom);

      await expect(
        option.provider.request({ method: "eth_requestAccounts" }),
      ).resolves.toEqual(["0xabc"]);
      expect(init).toHaveBeenCalledTimes(2);
    });
  });
});
