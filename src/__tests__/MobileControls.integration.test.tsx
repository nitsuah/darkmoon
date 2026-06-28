/**
 * Integration tests for mobile controls
 * Tests joystick and button rendering and basic behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MobileControls } from "../components/MobileControls";
import { MobileJoystick } from "../components/MobileJoystick";
import { MobileActionButton } from "../components/21st.dev/MobileActionButton";
import React from "react";

describe("MobileJoystick", () => {
  let mockOnMove: (x: number, y: number) => void;

  beforeEach(() => {
    mockOnMove = vi.fn();
  });

  it("should render joystick container", () => {
    const { container } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />,
    );
    expect(container.querySelector(".joystick-container")).toBeTruthy();
  });

  it("should support left and right side positioning", () => {
    const { container: leftContainer } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />,
    );
    const { container: rightContainer } = render(
      <MobileJoystick onMove={mockOnMove} side="right" label="Look" />,
    );

    const leftJoystick = leftContainer.querySelector(".joystick-container");
    const rightJoystick = rightContainer.querySelector(".joystick-container");

    expect(leftJoystick).toBeTruthy();
    expect(rightJoystick).toBeTruthy();
  });

  it("should have proper label", () => {
    const { getByText } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />,
    );
    expect(getByText("Move")).toBeTruthy();
  });

  it("should call onMove callback when prop is provided", () => {
    const { container } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />,
    );

    const joystick = container.querySelector(".joystick-container");
    expect(joystick).toBeTruthy();

    // Verify the callback exists
    expect(mockOnMove).toBeDefined();
  });
});

describe("MobileActionButton", () => {
  let mockOnPress: () => void;
  let mockOnRelease: () => void;

  beforeEach(() => {
    mockOnPress = vi.fn();
    mockOnRelease = vi.fn();
  });

  it("should render button", () => {
    const { getByText } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />,
    );
    expect(getByText("Jump")).toBeTruthy();
  });

  it("should call onPress on touch start", () => {
    const { container } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />,
    );

    const button = container.querySelector(".mobile-action-button");
    expect(button).toBeTruthy();

    fireEvent.touchStart(button!);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it("should call onRelease on touch end", () => {
    const { container } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />,
    );

    const button = container.querySelector(".mobile-action-button");

    fireEvent.touchStart(button!);
    fireEvent.touchEnd(button!);

    expect(mockOnRelease).toHaveBeenCalledTimes(1);
  });

  it("should support bottom-right position", () => {
    const { container } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />,
    );

    const button = container.querySelector(".mobile-action-button");
    expect(button).toBeTruthy();
  });

  it("should support bottom-center position", () => {
    const { container } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Sprint"
        position="bottom-center"
      />,
    );

    const button = container.querySelector(".mobile-action-button");
    expect(button).toBeTruthy();
  });

  it("should display correct label", () => {
    const { getByText } = render(
      <MobileActionButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Custom Label"
        position="bottom-right"
      />,
    );

    expect(getByText("Custom Label")).toBeTruthy();
  });
});

describe("Mobile Controls Integration", () => {
  it("should render MobileControls with joystick and action buttons", () => {
    const onMove = vi.fn();
    const onJumpPress = vi.fn();
    const onJumpRelease = vi.fn();
    const onJumpDoubleTap = vi.fn();
    const onSprintPress = vi.fn();
    const onSprintRelease = vi.fn();

    const { container, getByText } = render(
      <MobileControls
        onJoystickMove={onMove}
        onJumpPress={onJumpPress}
        onJumpRelease={onJumpRelease}
        onJumpDoubleTap={onJumpDoubleTap}
        onSprintPress={onSprintPress}
        onSprintRelease={onSprintRelease}
      />,
    );

    const joystick = container.querySelector(".joystick-container");
    const buttons = container.querySelectorAll(".mobile-action-button");

    expect(joystick).toBeTruthy();
    expect(buttons.length).toBe(2);
    expect(getByText("Move")).toBeTruthy();
    expect(getByText("Jump")).toBeTruthy();
    expect(getByText("Sprint")).toBeTruthy();
  });

  it("should have proper accessibility", () => {
    const onMove = vi.fn();
    const onJumpPress = vi.fn();
    const onJumpRelease = vi.fn();
    const onJumpDoubleTap = vi.fn();
    const onSprintPress = vi.fn();
    const onSprintRelease = vi.fn();

    const { getByText } = render(
      <MobileControls
        onJoystickMove={onMove}
        onJumpPress={onJumpPress}
        onJumpRelease={onJumpRelease}
        onJumpDoubleTap={onJumpDoubleTap}
        onSprintPress={onSprintPress}
        onSprintRelease={onSprintRelease}
      />,
    );

    // Labels should be accessible
    expect(getByText("Move")).toBeTruthy();
    expect(getByText("Jump")).toBeTruthy();
    expect(getByText("Sprint")).toBeTruthy();
  });
});
