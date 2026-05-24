import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrientation } from "../useOrientation";

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
};

describe("useOrientation", () => {
  it("detects portrait and landscape on resize", () => {
    setViewport(500, 900);
    const { result } = renderHook(() => useOrientation());

    expect(result.current).toBe("portrait");

    act(() => {
      setViewport(1200, 700);
      window.dispatchEvent(new window.Event("resize"));
    });

    expect(result.current).toBe("landscape");
  });

  it("updates on orientationchange event", () => {
    setViewport(700, 1200);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe("portrait");

    act(() => {
      setViewport(1200, 700);
      window.dispatchEvent(new window.Event("orientationchange"));
    });

    expect(result.current).toBe("landscape");
  });
});
