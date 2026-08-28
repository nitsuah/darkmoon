import { describe, it, expect } from "vitest";
import { resolvePort, DEFAULT_PORT } from "../../server/port.js";

describe("resolvePort", () => {
  it("falls back to the default when PORT is unset", () => {
    expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
  });

  it("falls back to the default when PORT is empty", () => {
    expect(resolvePort("")).toBe(DEFAULT_PORT);
  });

  it("accepts a valid port string", () => {
    expect(resolvePort("8080")).toBe(8080);
  });

  it("accepts the boundary values 1 and 65535", () => {
    expect(resolvePort("1")).toBe(1);
    expect(resolvePort("65535")).toBe(65535);
  });

  it("rejects a non-numeric PORT instead of silently producing NaN", () => {
    expect(() => resolvePort("abc")).toThrow(/Invalid PORT "abc"/);
  });

  it("rejects a non-integer PORT", () => {
    expect(() => resolvePort("3000.5")).toThrow(/Invalid PORT/);
  });

  it("rejects a PORT of 0 or below", () => {
    expect(() => resolvePort("0")).toThrow(/Invalid PORT/);
    expect(() => resolvePort("-1")).toThrow(/Invalid PORT/);
  });

  it("rejects a PORT above 65535", () => {
    expect(() => resolvePort("65536")).toThrow(/Invalid PORT/);
  });
});
