import type * as React from "react";
import { vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

// The R3F test renderer drives React through act(); opt this environment in so
// React doesn't warn that act() is unsupported.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

export type R3FRenderer = Awaited<
  ReturnType<typeof ReactThreeTestRenderer.create>
>;

export const renderR3F = (element: React.ReactElement): Promise<R3FRenderer> =>
  ReactThreeTestRenderer.create(element);

/** Run `fn` (e.g. dispatching a window event) inside act() so state flushes. */
export const inAct = (fn: () => void): Promise<void> =>
  ReactThreeTestRenderer.act(async () => {
    fn();
  });

/** Advance the R3F frame loop by `frames` ticks of `delta` seconds. */
export const advance = (
  renderer: R3FRenderer,
  frames = 1,
  delta = 1 / 60,
): Promise<void> =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(frames, delta);
  });

/** Install a controllable Date.now(). Restore with vi.restoreAllMocks(). */
export function mockNow(start: number) {
  let now = start;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  return {
    get: () => now,
    set: (t: number) => {
      now = t;
    },
    tick: (ms: number) => {
      now += ms;
    },
  };
}
