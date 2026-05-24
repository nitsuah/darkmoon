import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../useNotifications";

describe("useNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds and removes notifications", () => {
    const dateSpy = vi
      .spyOn(Date, "now")
      .mockReturnValueOnce(1234)
      .mockReturnValueOnce(1235)
      .mockReturnValueOnce(1236)
      .mockReturnValueOnce(1237);
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.25);
    void dateSpy;
    void randomSpy;

    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification("Saved");
      result.current.addNotification("Warning!", "warning");
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].type).toBe("info");
    expect(result.current.notifications[1].type).toBe("warning");

    const toRemove = result.current.notifications[0].id;
    act(() => {
      result.current.removeNotification(toRemove);
    });

    expect(result.current.notifications).toHaveLength(1);
  });

  it("auto-removes notifications after 4 seconds", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification("Auto remove me", "success");
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});
