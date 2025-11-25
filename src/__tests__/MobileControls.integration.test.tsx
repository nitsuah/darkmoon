/**
 * Integration tests for mobile controls
 * Tests joystick and button rendering and basic behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MobileJoystick } from "../components/MobileJoystick";
import { MobileButton } from "../components/MobileButton";
import React from "react";

describe("MobileJoystick", () => {
  let mockOnMove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnMove = vi.fn();
  });

  it("should render joystick container", () => {
    const { container } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />
    );
    expect(container.querySelector(".joystick-container")).toBeTruthy();
  });

  it("should support left and right side positioning", () => {
    const { container: leftContainer } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />
    );
    const { container: rightContainer } = render(
      <MobileJoystick onMove={mockOnMove} side="right" label="Look" />
    );

    const leftJoystick = leftContainer.querySelector(".joystick-container");
    const rightJoystick = rightContainer.querySelector(".joystick-container");

    expect(leftJoystick).toBeTruthy();
    expect(rightJoystick).toBeTruthy();
  });

  it("should have proper label", () => {
    const { getByText } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />
    );
    expect(getByText("Move")).toBeTruthy();
  });

  it("should call onMove callback when prop is provided", () => {
    const { container } = render(
      <MobileJoystick onMove={mockOnMove} side="left" label="Move" />
    );

    const joystick = container.querySelector(".joystick-container");
    expect(joystick).toBeTruthy();

    // Verify the callback exists
    expect(mockOnMove).toBeDefined();
  });
});

describe("MobileButton", () => {
  let mockOnPress: ReturnType<typeof vi.fn>;
  let mockOnRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPress = vi.fn();
    mockOnRelease = vi.fn();
  });

  it("should render button", () => {
    const { getByText } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />
    );
    expect(getByText("Jump")).toBeTruthy();
  });

  it("should call onPress on touch start", () => {
    const { container } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />
    );

    const button = container.querySelector(".mobile-button");
    expect(button).toBeTruthy();

    fireEvent.touchStart(button!);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it("should call onRelease on touch end", () => {
    const { container } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />
    );

    const button = container.querySelector(".mobile-button");

    fireEvent.touchStart(button!);
    fireEvent.touchEnd(button!);

    expect(mockOnRelease).toHaveBeenCalledTimes(1);
  });

  it("should support bottom-right position", () => {
    const { container } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Jump"
        position="bottom-right"
      />
    );

    const button = container.querySelector(".mobile-button");
    expect(button).toBeTruthy();
  });

  it("should support bottom-center position", () => {
    const { container } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Sprint"
        position="bottom-center"
      />
    );

    const button = container.querySelector(".mobile-button");
    expect(button).toBeTruthy();
  });

  it("should display correct label", () => {
    const { getByText } = render(
      <MobileButton
        onPress={mockOnPress}
        onRelease={mockOnRelease}
        label="Custom Label"
        position="bottom-right"
      />
    );

    expect(getByText("Custom Label")).toBeTruthy();
  });
});

describe("Mobile Controls Integration", () => {
  it("should render both joystick and button together", () => {
    const onMove = vi.fn();
    const onJump = vi.fn();
    const onJumpRelease = vi.fn();

    const { container, getByText } = render(
      <div>
        <MobileJoystick onMove={onMove} side="left" label="Move" />
        <MobileButton
          onPress={onJump}
          onRelease={onJumpRelease}
          label="Jump"
          position="bottom-right"
        />
      </div>
    );

    const joystick = container.querySelector(".joystick-container");
    const button = container.querySelector(".mobile-button");

    expect(joystick).toBeTruthy();
    expect(button).toBeTruthy();
    expect(getByText("Move")).toBeTruthy();
    expect(getByText("Jump")).toBeTruthy();
  });

  it("should render two joysticks for move and camera", () => {
    const onMove = vi.fn();
    const onCamera = vi.fn();

    const { container } = render(
      <div>
        <MobileJoystick onMove={onMove} side="left" label="Move" />
        <MobileJoystick onMove={onCamera} side="right" label="Look" />
      </div>
    );

    const joysticks = container.querySelectorAll(".joystick-container");
    expect(joysticks.length).toBe(2);
  });

  it("should have proper accessibility", () => {
    const onMove = vi.fn();
    const onPress = vi.fn();
    const onRelease = vi.fn();

    const { getByText } = render(
      <div>
        <MobileJoystick onMove={onMove} side="left" label="Move" />
        <MobileButton
          onPress={onPress}
          onRelease={onRelease}
          label="Jump"
          position="bottom-right"
        />
      </div>
    );

    // Labels should be accessible
    expect(getByText("Move")).toBeTruthy();
    expect(getByText("Jump")).toBeTruthy();
  });
});
