import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQualitySettings } from "../hooks/useQualitySettings";

describe("useQualitySettings", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      devicePixelRatio: 2,
    });
  });

  it("default quality is 'auto'", () => {
    const { result } = renderHook(() => useQualitySettings(60));
    expect(result.current.quality).toBe("auto");
  });

  it("auto at fps 60 gives shadows true, pixelRatio 2, antialias true", () => {
    const { result } = renderHook(() => useQualitySettings(60));
    expect(result.current.qualitySettings).toEqual({
      shadows: true,
      pixelRatio: 2,
      antialias: true,
    });
  });

  it("auto at fps 45 gives shadows false, pixelRatio 1, antialias true", () => {
    const { result } = renderHook(() => useQualitySettings(45));
    expect(result.current.qualitySettings).toEqual({
      shadows: false,
      pixelRatio: 1,
      antialias: true,
    });
  });

  it("auto at fps 30 gives shadows false, pixelRatio 1, antialias false", () => {
    const { result } = renderHook(() => useQualitySettings(30));
    expect(result.current.qualitySettings).toEqual({
      shadows: false,
      pixelRatio: 1,
      antialias: false,
    });
  });

  it("after setQuality('low') settings are low regardless of fps 60", () => {
    const { result } = renderHook(() => useQualitySettings(60));
    act(() => {
      result.current.setQuality("low");
    });
    expect(result.current.qualitySettings).toEqual({
      shadows: false,
      pixelRatio: 1,
      antialias: false,
    });
  });

  it("'medium' caps pixel ratio at 1.5 with dpr 2 and keeps shadows and antialias true", () => {
    const { result } = renderHook(() => useQualitySettings(60));
    act(() => {
      result.current.setQuality("medium");
    });
    expect(result.current.qualitySettings).toEqual({
      shadows: true,
      pixelRatio: 1.5,
      antialias: true,
    });
  });

  it("'high' uses the full dpr (2) with shadows and antialias true", () => {
    const { result } = renderHook(() => useQualitySettings(60));
    act(() => {
      result.current.setQuality("high");
    });
    expect(result.current.qualitySettings).toEqual({
      shadows: true,
      pixelRatio: 2,
      antialias: true,
    });
  });
});