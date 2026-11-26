import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRockPositions } from "../useRockPositions";

describe("useRockPositions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the requested number of rocks (default 25)", () => {
    expect(renderHook(() => useRockPositions()).result.current).toHaveLength(
      25,
    );
    expect(renderHook(() => useRockPositions(3)).result.current).toHaveLength(
      3,
    );
    expect(renderHook(() => useRockPositions(0)).result.current).toEqual([]);
  });

  it("keeps every rock within its coordinate and size bounds", () => {
    const { result } = renderHook(() => useRockPositions(200));
    for (const rock of result.current) {
      expect(rock.x).toBeGreaterThanOrEqual(-40);
      expect(rock.x).toBeLessThanOrEqual(40);
      expect(rock.z).toBeGreaterThanOrEqual(-40);
      expect(rock.z).toBeLessThanOrEqual(40);
      expect(rock.size).toBeGreaterThanOrEqual(0.5);
      expect(rock.size).toBeLessThanOrEqual(2);
      expect(rock.height).toBeGreaterThanOrEqual(0.3);
      expect(rock.height).toBeLessThanOrEqual(1);
    }
  });

  it("does not regenerate positions on rerender", () => {
    const { result, rerender } = renderHook(() => useRockPositions(10));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("maps a zero random value to the minimum of each range", () => {
    vi.spyOn(crypto, "getRandomValues").mockImplementation((arr) => {
      (arr as Uint32Array)[0] = 0;
      return arr;
    });
    const { result } = renderHook(() => useRockPositions(1));
    expect(result.current[0]).toEqual({
      x: -40,
      z: -40,
      size: 0.5,
      height: 0.3,
    });
  });
});
