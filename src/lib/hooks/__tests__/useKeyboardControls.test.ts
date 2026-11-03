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

  it("clears all pressed keys and the ref when the window blurs", () => {
    const { result } = renderHook(() => useKeyboardControls(false, false));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });
    expect(result.current.keysPressed.w).toBe(true);
    expect(result.current.keysPressed.d).toBe(true);
    expect(result.current.keysPressedRef.current.w).toBe(true);
    expect(result.current.keysPressedRef.current.d).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(Object.values(result.current.keysPressed).every((pressed) => !pressed)).toBe(true);
    expect(Object.values(result.current.keysPressedRef.current).every((pressed) => !pressed)).toBe(true);
  });

  it("clears keys only when visibilitychange reports a hidden document", () => {
    const { result } = renderHook(() => useKeyboardControls(false, false));
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden");

    try {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(result.current.keysPressed.w).toBe(true);

      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(Object.values(result.current.keysPressed).every((pressed) => !pressed)).toBe(true);
      expect(Object.values(result.current.keysPressedRef.current).every((pressed) => !pressed)).toBe(true);
    } finally {
      if (hiddenDescriptor) {
        Object.defineProperty(document, "hidden", hiddenDescriptor);
      } else {
        delete (document as unknown as { hidden?: boolean }).hidden;
      }
    }
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
