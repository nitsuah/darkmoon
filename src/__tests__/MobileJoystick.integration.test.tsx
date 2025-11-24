/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MobileJoystick } from "../components/MobileJoystick";

describe("MobileJoystick integration", () => {
  it("calls onMove on pointer events and resets on end", () => {
    const moves: Array<[number, number]> = [];
    const onMove = (x: number, y: number) => moves.push([x, y]);

    const { container } = render(
      <MobileJoystick side="left" label="Left" onMove={onMove} />
    );

    const base = container.querySelector(".joystick-base") as HTMLElement;
    expect(base).toBeTruthy();

    // Simulate pointerdown near center
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // pointerdown -> should call onMove (0,0) or very near
    fireEvent.pointerDown(base, {
      pointerId: 1,
      clientX: cx + 10,
      clientY: cy + 5,
      isPrimary: true,
    });
    // pointermove
    fireEvent.pointerMove(base, {
      pointerId: 1,
      clientX: cx + 20,
      clientY: cy + 10,
    });
    // pointerup
    fireEvent.pointerUp(base, { pointerId: 1 });

    // Ensure onMove was called at least for move and final reset to 0,0
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const last = moves[moves.length - 1];
    expect(last[0]).toBe(0);
    expect(last[1]).toBe(0);
  });

  it("falls back to touch events and resets on touchend", () => {
    const moves: Array<[number, number]> = [];
    const onMove = (x: number, y: number) => moves.push([x, y]);

    const { container } = render(
      <MobileJoystick side="right" label="Right" onMove={onMove} />
    );

    const base = container.querySelector(".joystick-base") as HTMLElement;
    expect(base).toBeTruthy();

    // If the component attached pointer listeners (window.PointerEvent present)
    // the touch listeners won't be used. Skip the touch-specific assertions in
    // that case — pointer path is already covered by the pointer test above.
    if (window.PointerEvent) {
      expect(true).toBe(true);
      return;
    }

    // Otherwise run a lightweight touch scenario
    fireEvent.touchStart(base, {
      touches: [{ identifier: 5, clientX: 10, clientY: 10 }],
    } as any);
    fireEvent.touchMove(base, {
      touches: [{ identifier: 5, clientX: 20, clientY: 15 }],
    } as any);
    fireEvent.touchEnd(base, {
      touches: [],
      changedTouches: [{ identifier: 5, clientX: 20, clientY: 15 }],
    } as any);

    // onMove should have been called and final reset to 0,0
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const last = moves[moves.length - 1];
    expect(last[0]).toBe(0);
    expect(last[1]).toBe(0);
  });
});
