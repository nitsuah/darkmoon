import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, createTagLogger } from "../logger";

describe("logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("logs debug with namespaced prefix", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    process.env.NODE_ENV = "development";
    const devLogger = createLogger("Test");
    devLogger.debug("dev-msg");
    expect(logSpy).toHaveBeenCalled();

    const firstArg = logSpy.mock.calls[0]?.[0];
    expect(String(firstArg)).toContain("[Test ");
  });

  it("always logs info/warn/error", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    process.env.NODE_ENV = "production";
    const logger = createLogger("Core");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it("tag logger emits tagged namespace entries", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    process.env.NODE_ENV = "development";
    const devTag = createTagLogger("TagNS");
    devTag("hello");
    expect(logSpy).toHaveBeenCalled();

    const nsArg = logSpy.mock.calls[0]?.[1];
    expect(String(nsArg)).toBe("[TagNS]");
  });
});
