import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ReloadMeter from "../ReloadMeter";

/** Manual requestAnimationFrame so the needle can be stepped deterministically. */
function installRaf() {
  let queue: Array<{ id: number; cb: (ts: number) => void }> = [];
  let nextId = 1;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  });
  const cancel = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation((id) => {
      queue = queue.filter((f) => f.id !== id);
    });
  return {
    cancel,
    pending: () => queue.length,
    /** Run one animation frame at timestamp `ts`. */
    frame: (ts: number) =>
      act(() => {
        const current = queue;
        queue = [];
        current.forEach((f) => f.cb(ts));
      }),
  };
}

const snap = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent("weapon-reload-snap"));
  });

const needleLeft = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('div[style*="width: 4px"]')!.style.left;

describe("ReloadMeter", () => {
  let raf: ReturnType<typeof installRaf>;

  beforeEach(() => {
    vi.useFakeTimers();
    raf = installRaf();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing when not reloading", () => {
    const { container } = render(
      <ReloadMeter isReloading={false} reloadPct={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("sweeps the needle back and forth and shows reload progress", () => {
    const { container } = render(<ReloadMeter isReloading reloadPct={1.5} />);
    expect(screen.getByText("RELOADING — press R")).toBeInTheDocument();
    // Progress bar clamps at 100%.
    expect(container.innerHTML).toContain("width: 100%");

    raf.frame(0);
    raf.frame(350); // halfway along
    expect(needleLeft(container)).toBe("calc(50% - 2px)");
    raf.frame(1_050); // overshoots the end → bounces back from 1
    expect(needleLeft(container)).toBe("calc(100% - 2px)");
    raf.frame(1_750); // travelling back past 0 → bounces off 0
    expect(needleLeft(container)).toBe("calc(0% - 2px)");
  });

  it("rewards a snap inside the perfect zone once per reload", () => {
    const onPerfect = vi.fn();
    window.addEventListener("weapon-reload-perfect", onPerfect);
    render(<ReloadMeter isReloading reloadPct={0.3} />);
    raf.frame(0);
    raf.frame(350); // needle at 0.5 — inside [0.38, 0.62]

    snap();
    expect(onPerfect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("⚡ PERFECT!")).toBeInTheDocument();

    snap(); // already used this reload
    expect(onPerfect).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText("RELOADING — press R")).toBeInTheDocument();
    window.removeEventListener("weapon-reload-perfect", onPerfect);
  });

  it("shows a miss when snapping outside the perfect zone", () => {
    const onPerfect = vi.fn();
    window.addEventListener("weapon-reload-perfect", onPerfect);
    render(<ReloadMeter isReloading reloadPct={0.3} />);
    raf.frame(0);
    raf.frame(70); // needle at 0.1

    snap();
    expect(onPerfect).not.toHaveBeenCalled();
    expect(screen.getByText("× MISS")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText("RELOADING — press R")).toBeInTheDocument();
    window.removeEventListener("weapon-reload-perfect", onPerfect);
  });

  it("stops animating and resets when the reload ends or unmounts", () => {
    const { rerender, unmount, container } = render(
      <ReloadMeter isReloading reloadPct={0.2} />,
    );
    raf.frame(0);
    rerender(<ReloadMeter isReloading={false} reloadPct={0} />);
    expect(container).toBeEmptyDOMElement();
    expect(raf.cancel).toHaveBeenCalled();
    expect(raf.pending()).toBe(0);

    snap(); // ignored while not reloading
    expect(container).toBeEmptyDOMElement();

    rerender(<ReloadMeter isReloading reloadPct={0.2} />);
    expect(raf.pending()).toBe(1);
    unmount();
    expect(raf.pending()).toBe(0);
  });
});
