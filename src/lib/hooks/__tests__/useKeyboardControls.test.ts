import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardControls } from "../useKeyboardControls";

describe("useKeyboardControls", () => {
  it("tracks key down/up when active", () => {
    const { result } = renderHook(() => useKeyboardControls(false, false));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    });
    expect(result.current.keysPressed.w).toBe(true);
    expect(result.current.keysPressedRef.current.w).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
    });
    expect(result.current.keysPressed.w).toBe(false);
  });

  it("ignores keydown when chat is visible or paused", () => {
    const { result, rerender } = renderHook(
      ({ chat, paused }) => useKeyboardControls(chat, paused),
      { initialProps: { chat: true, paused: false } },
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    });
    expect(result.current.keysPressed.a).toBe(false);

    rerender({ chat: false, paused: true });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    });
    expect(result.current.keysPressed.a).toBe(false);
  });

  it("handles unsupported keys gracefully", () => {
    const { result } = renderHook(() => useKeyboardControls(false, false));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "x" }));
    });

    expect(result.current.keysPressed.w).toBe(false);
    expect(result.current.keysPressed.a).toBe(false);
  });
});
