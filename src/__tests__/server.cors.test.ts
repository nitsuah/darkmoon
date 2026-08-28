import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_ALLOWED_ORIGINS,
  parseAllowedOrigins,
  isUnsafeWildcard,
  matchesOrigin,
  isOriginAllowed,
  createOriginCallback,
  createCorsOptions,
  createCorsError,
  CORS_ERROR_CODE,
} from "../../server/cors.js";

describe("server CORS policy", () => {
  describe("parseAllowedOrigins", () => {
    it("falls back to defaults when the env var is unset", () => {
      expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
      expect(parseAllowedOrigins(null)).toEqual(DEFAULT_ALLOWED_ORIGINS);
    });

    it("falls back to defaults when the env var is empty or only separators", () => {
      expect(parseAllowedOrigins("")).toEqual(DEFAULT_ALLOWED_ORIGINS);
      expect(parseAllowedOrigins("  ,  , ")).toEqual(DEFAULT_ALLOWED_ORIGINS);
    });

    it("splits and trims a comma-separated list", () => {
      expect(
        parseAllowedOrigins("https://a.example, https://b.example"),
      ).toEqual(["https://a.example", "https://b.example"]);
    });

    it("does not mutate the shared defaults array", () => {
      const first = parseAllowedOrigins(undefined);
      first.push("https://evil.example");
      expect(parseAllowedOrigins(undefined)).toEqual(DEFAULT_ALLOWED_ORIGINS);
      expect(DEFAULT_ALLOWED_ORIGINS).not.toContain("https://evil.example");
    });

    it("drops a bare wildcard entry instead of allowing every origin under credentials: true", () => {
      // createCorsOptions always sets credentials: true, so a literal "*"
      // reaching the allow-list would let any site make authenticated
      // cross-site requests (CWE-942).
      expect(parseAllowedOrigins("*")).toEqual(DEFAULT_ALLOWED_ORIGINS);
    });

    it("drops a bare wildcard mixed in with real origins, keeping the rest", () => {
      expect(
        parseAllowedOrigins("https://a.example, *, https://b.example"),
      ).toEqual(["https://a.example", "https://b.example"]);
    });

    it("keeps a scoped wildcard like the deploy-preview pattern", () => {
      const scoped = "https://deploy-preview-*--darkmoon-dev.netlify.app";
      expect(parseAllowedOrigins(scoped)).toEqual([scoped]);
    });

    it("reports the dropped entry via the onUnsafeWildcard hook", () => {
      const onUnsafeWildcard = vi.fn();
      parseAllowedOrigins("https://a.example, *", onUnsafeWildcard);

      expect(onUnsafeWildcard).toHaveBeenCalledTimes(1);
      expect(onUnsafeWildcard).toHaveBeenCalledWith({ entry: "*" });
    });
  });

  describe("isUnsafeWildcard", () => {
    it("flags a bare wildcard", () => {
      expect(isUnsafeWildcard("*")).toBe(true);
    });

    it("does not flag a scoped wildcard or a normal origin", () => {
      expect(
        isUnsafeWildcard("https://deploy-preview-*--darkmoon-dev.netlify.app"),
      ).toBe(false);
      expect(isUnsafeWildcard("https://darkmoon-dev.netlify.app")).toBe(false);
    });
  });

  describe("matchesOrigin", () => {
    it("matches an exact origin", () => {
      expect(
        matchesOrigin(
          "https://darkmoon-dev.netlify.app",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(true);
    });

    it("rejects a different origin", () => {
      expect(
        matchesOrigin(
          "https://evil.example",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(false);
    });

    it("expands * as a wildcard for deploy previews", () => {
      const pattern = "https://deploy-preview-*--darkmoon-dev.netlify.app";
      expect(
        matchesOrigin(
          "https://deploy-preview-321--darkmoon-dev.netlify.app",
          pattern,
        ),
      ).toBe(true);
      expect(
        matchesOrigin(
          "https://deploy-preview-9--darkmoon-dev.netlify.app",
          pattern,
        ),
      ).toBe(true);
    });

    it("treats dots literally so look-alike hosts are rejected", () => {
      // Regression guard: an unescaped `.` in the pattern would let this pass.
      expect(
        matchesOrigin(
          "https://darkmoon-devXnetlify.app",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(false);
      expect(
        matchesOrigin(
          "https://darkmoon-dev-netlify-app",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(false);
    });

    it("anchors the pattern at both ends", () => {
      expect(
        matchesOrigin(
          "https://darkmoon-dev.netlify.app.evil.example",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(false);
      expect(
        matchesOrigin(
          "https://evil.example/https://darkmoon-dev.netlify.app",
          "https://darkmoon-dev.netlify.app",
        ),
      ).toBe(false);
    });

    it("returns false for non-string inputs", () => {
      expect(matchesOrigin(undefined as unknown as string, "https://a")).toBe(
        false,
      );
      expect(matchesOrigin("https://a", undefined as unknown as string)).toBe(
        false,
      );
    });
  });

  describe("isOriginAllowed", () => {
    const allowed = [
      "http://localhost:3000",
      "https://deploy-preview-*--darkmoon-dev.netlify.app",
      "https://darkmoon-dev.netlify.app",
    ];

    it("allows a configured origin", () => {
      expect(isOriginAllowed("http://localhost:3000", allowed)).toBe(true);
      expect(isOriginAllowed("https://darkmoon-dev.netlify.app", allowed)).toBe(
        true,
      );
    });

    it("allows a wildcard deploy preview", () => {
      expect(
        isOriginAllowed(
          "https://deploy-preview-42--darkmoon-dev.netlify.app",
          allowed,
        ),
      ).toBe(true);
    });

    it("rejects an unlisted origin", () => {
      expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
      expect(isOriginAllowed("http://localhost:9999", allowed)).toBe(false);
    });

    it("allows requests with no origin (curl, health checks, native clients)", () => {
      expect(isOriginAllowed(undefined, allowed)).toBe(true);
      expect(isOriginAllowed("", allowed)).toBe(true);
      expect(isOriginAllowed(null, allowed)).toBe(true);
    });

    it("rejects when the allow-list is not an array", () => {
      expect(
        isOriginAllowed("https://a.example", undefined as unknown as string[]),
      ).toBe(false);
    });
  });

  describe("createOriginCallback", () => {
    const allowed = ["https://darkmoon-dev.netlify.app"];

    it("calls back with (null, true) for an allowed origin", () => {
      const callback = vi.fn();
      createOriginCallback(allowed)(
        "https://darkmoon-dev.netlify.app",
        callback,
      );
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("calls back with an error for a rejected origin", () => {
      const callback = vi.fn();
      createOriginCallback(allowed)("https://evil.example", callback);

      expect(callback).toHaveBeenCalledTimes(1);
      const [error, allow] = callback.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Not allowed by CORS");
      expect(allow).toBeUndefined();
    });

    it("invokes the rejection hook exactly once with the offending origin", () => {
      const onRejected = vi.fn();
      const callback = vi.fn();
      createOriginCallback(allowed, onRejected)(
        "https://evil.example",
        callback,
      );

      expect(onRejected).toHaveBeenCalledTimes(1);
      expect(onRejected).toHaveBeenCalledWith({
        origin: "https://evil.example",
      });
    });

    it("does not invoke the rejection hook for an allowed origin", () => {
      const onRejected = vi.fn();
      createOriginCallback(allowed, onRejected)(
        "https://darkmoon-dev.netlify.app",
        vi.fn(),
      );
      expect(onRejected).not.toHaveBeenCalled();
    });
  });

  describe("createCorsError", () => {
    it("is tagged so the error handler can answer 403 instead of 500", () => {
      const error = createCorsError();

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(CORS_ERROR_CODE);
      expect(error.statusCode).toBe(403);
    });

    it("is the error handed to a rejected origin callback", () => {
      const callback = vi.fn();
      createOriginCallback(["https://darkmoon-dev.netlify.app"])(
        "https://evil.example",
        callback,
      );

      expect(callback.mock.calls[0][0]).toMatchObject({
        code: CORS_ERROR_CODE,
        statusCode: 403,
      });
    });
  });

  describe("createCorsOptions", () => {
    it("exposes the shared HTTP + WebSocket policy", () => {
      const options = createCorsOptions(["https://darkmoon-dev.netlify.app"]);

      expect(options.methods).toEqual(["GET", "POST"]);
      expect(options.credentials).toBe(true);
      expect(typeof options.origin).toBe("function");
    });

    it("produces an origin function honouring the allow-list", () => {
      const options = createCorsOptions(["https://darkmoon-dev.netlify.app"]);
      const allowCallback = vi.fn();
      const denyCallback = vi.fn();

      options.origin("https://darkmoon-dev.netlify.app", allowCallback);
      options.origin("https://evil.example", denyCallback);

      expect(allowCallback).toHaveBeenCalledWith(null, true);
      expect(denyCallback.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });
});
