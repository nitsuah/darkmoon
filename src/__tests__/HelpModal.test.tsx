import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    it("should list the current movement and combat controls", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(screen.getByText("Movement")).toBeDefined();
      expect(screen.getByText("Combat")).toBeDefined();
      for (const key of ["W A S D", "SPACE", "R", "TAB / Scroll", "I", "ESC"]) {
        expect(screen.getByText(key).closest("kbd")).not.toBeNull();
      }
    });

    it("should describe solo play", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(screen.getByText(/playing solo against bots/)).toBeDefined();
      expect(screen.queryByText(/box/)).toBeNull();
    });

    it("should be a labelled dialog that Esc closes", () => {
      render(<HelpModal />);
      fireEvent.keyDown(window, { key: "h" });

      expect(
        screen.getByRole("dialog", { name: "Help & Controls" }),
      ).toBeDefined();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("should open from the Controls buttons", () => {
      render(<HelpModal />);
      act(() => {
        window.dispatchEvent(new CustomEvent("darkmoon-open-help"));
      });
      expect(screen.getByText("Help & Controls")).toBeDefined();
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
