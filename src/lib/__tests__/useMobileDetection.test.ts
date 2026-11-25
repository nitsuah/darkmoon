import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMobileDetection } from "../hooks/useMobileDetection";

function setDevice(width: number, maxTouchPoints = 0) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window.navigator, "maxTouchPoints", { value: maxTouchPoints, configurable: true });
  Reflect.deleteProperty(window, "ontouchstart");
}

afterEach(() => {
  setDevice(1024, 0);
  vi.restoreAllMocks();
});

describe("useMobileDetection", () => {
  it("returns false on a wide non-touch screen", () => {
    setDevice(1280);
    expect(renderHook(() => useMobileDetection()).result.current).toBe(false);
  });
  it("returns true for touch devices at or below 1024px", () => {
    setDevice(800, 5);
    expect(renderHook(() => useMobileDetection()).result.current).toBe(true);
    setDevice(1024, 5);
    expect(renderHook(() => useMobileDetection()).result.current).toBe(true);
  });
  it("returns false for touch devices wider than 1024px", () => {
    setDevice(1025, 5);
    expect(renderHook(() => useMobileDetection()).result.current).toBe(false);
  });
  it("does not classify a narrow non-touch screen as mobile", () => {
    setDevice(800);
    expect(renderHook(() => useMobileDetection()).result.current).toBe(false);
  });
  it("rechecks touch capability on resize", () => {
    setDevice(1280);
    const { result } = renderHook(() => useMobileDetection());
    setDevice(800, 5);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(result.current).toBe(true);
  });
  it("removes its resize listener on unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useMobileDetection());
    const resizeCall = add.mock.calls.find(([type]) => type === "resize");
    expect(resizeCall).toBeDefined();
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", resizeCall![1]);
  });
});
