import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpModal from "../components/HelpModal";
import React from "react";

describe("HelpModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility", () => {
    it("should not be visible by default", () => {
      render(<HelpModal />);
      expect(screen.queryByText("Help & Controls")).toBeNull();
    });

    it("should open when H key is pressed", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });
      expect(screen.getByText("Help & Controls")).toBeDefined();
    });

    it("should handle uppercase H key", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "H" });
      expect(screen.getByText("Help & Controls")).toBeDefined();
    });

    it("should toggle closed when H is pressed again", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });
      expect(screen.getByText("Help & Controls")).toBeDefined();

      fireEvent.keyDown(window, { key: "h" });
      expect(screen.queryByText("Help & Controls")).toBeNull();
    });
  });

  describe("Closing", () => {
    it("should close when close button is clicked", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });
      expect(screen.getByText("Help & Controls")).toBeDefined();

      const closeButton = screen.getByText("×");
      fireEvent.click(closeButton);
      expect(screen.queryByText("Help & Controls")).toBeNull();
    });

    it("should close when clicking overlay", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      const overlay = screen
        .getByText("Help & Controls")
        .closest(".help-modal-overlay");
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(screen.queryByText("Help & Controls")).toBeNull();
    });

    it("should not close when clicking modal content", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      const content = screen.getByText("Movement");
      fireEvent.click(content);
      expect(screen.getByText("Help & Controls")).toBeDefined();
    });
  });

  describe("Content", () => {
    it("should display movement controls section", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(screen.getByText("Movement")).toBeDefined();
      expect(screen.getByText("Move Forward")).toBeDefined();
      expect(screen.getByText("Move Left")).toBeDefined();
      expect(screen.getByText("Move Backward")).toBeDefined();
      expect(screen.getByText("Move Right")).toBeDefined();
    });

    it("should display interface controls section", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(screen.getByText("Interface")).toBeDefined();
      expect(screen.getByText("Toggle this help menu")).toBeDefined();
    });

    it("should display multiplayer section", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(screen.getByText("Multiplayer & Games")).toBeDefined();
      expect(
        screen.getByText('Your character is the blue box (red when "IT")'),
      ).toBeDefined();
    });

    it("should show keyboard keys as kbd elements", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      // Check for specific kbd content
      const wKey = screen.getByText("W");
      expect(wKey.closest("kbd")).toBeDefined();
    });
  });

  describe("Event Listeners", () => {
    it("should clean up event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = render(<HelpModal />);

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });
});
