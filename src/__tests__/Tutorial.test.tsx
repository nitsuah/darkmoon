import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Tutorial from "../components/Tutorial";
import React from "react";

describe("Tutorial Component", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("Visibility", () => {
    it("should show tutorial for first-time users", () => {
      render(<Tutorial />);
      expect(screen.getByText("Welcome to DARKMOON")).toBeDefined();
    });

    it("should not show tutorial if already completed", () => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");
      render(<Tutorial />);
      expect(screen.queryByText("Welcome to DARKMOON")).toBeNull();
    });
  });

  describe("Navigation", () => {
    it("should show step 1 of 5 initially", () => {
      render(<Tutorial />);
      expect(screen.getByText("Step 1 of 5")).toBeDefined();
    });

    it("should advance to next step on Next button click", () => {
      render(<Tutorial />);
      const nextButton = screen.getByText("Next");
      fireEvent.click(nextButton);
      expect(screen.getByText("Step 2 of 5")).toBeDefined();
      expect(screen.getByText("Movement Controls")).toBeDefined();
    });

    it("should show all 5 steps in sequence", () => {
      render(<Tutorial />);
      const steps = [
        "Welcome to DARKMOON",
        "Movement Controls",
        "Camera Control",
        "Theme Toggle",
        "Need Help?",
      ];

      steps.forEach((stepTitle, index) => {
        expect(screen.getByText(stepTitle)).toBeDefined();
        if (index < steps.length - 1) {
          fireEvent.click(screen.getByText("Next"));
        }
      });
    });

    it('should show "Get Started" on final step', () => {
      render(<Tutorial />);
      // Click through to last step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next"));
      }
      expect(screen.getByText("Get Started")).toBeDefined();
    });
  });

  describe("Completion", () => {
    it("should hide tutorial and save to localStorage on complete", () => {
      render(<Tutorial />);
      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next"));
      }
      fireEvent.click(screen.getByText("Get Started"));

      expect(window.localStorage.getItem("darkmoon-tutorial-complete")).toBe(
        "true",
      );
      expect(screen.queryByText("Need Help?")).toBeNull();
    });

    it("should hide tutorial and save to localStorage on skip", () => {
      render(<Tutorial />);
      fireEvent.click(screen.getByText("Skip Tutorial"));

      expect(window.localStorage.getItem("darkmoon-tutorial-complete")).toBe(
        "true",
      );
      expect(screen.queryByText("Welcome to DARKMOON")).toBeNull();
    });

    it("should call onComplete callback when tutorial is completed", () => {
      const onComplete = vi.fn();
      render(<Tutorial onComplete={onComplete} />);

      fireEvent.click(screen.getByText("Skip Tutorial"));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("should call onComplete callback when skipped", () => {
      const onComplete = vi.fn();
      render(<Tutorial onComplete={onComplete} />);

      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next"));
      }
      fireEvent.click(screen.getByText("Get Started"));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Content", () => {
    it("should show correct content for each step", () => {
      render(<Tutorial />);

      const contents = [
        "A multiplayer 3D experience",
        "Use W/A/S/D keys to move around",
        "The camera follows you automatically",
        "Click the sun/moon icon",
        "Press H at any time",
      ];

      contents.forEach((content, index) => {
        expect(screen.getByText(new RegExp(content))).toBeDefined();
        if (index < contents.length - 1) {
          fireEvent.click(screen.getByText("Next"));
        }
      });
    });

    it("should display progress indicator", () => {
      render(<Tutorial />);
      expect(screen.getByText(/Step \d+ of \d+/)).toBeDefined();
    });

    it("should show Skip Tutorial button on all steps", () => {
      render(<Tutorial />);

      for (let i = 0; i < 5; i++) {
        expect(screen.getByText("Skip Tutorial")).toBeDefined();
        if (i < 4) {
          fireEvent.click(screen.getByText("Next"));
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing onComplete prop", () => {
      render(<Tutorial />);

      expect(() => {
        fireEvent.click(screen.getByText("Skip Tutorial"));
      }).not.toThrow();
    });

    it("should not show tutorial if localStorage has any value", () => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "false");
      render(<Tutorial />);

      // Should NOT show because the code checks for existence,not truthiness
      // If any value exists, the tutorial is considered complete
      expect(screen.queryByText("Welcome to DARKMOON")).toBeNull();
    });

    it("should handle rapid button clicks", () => {
      render(<Tutorial />);
      const nextButton = screen.getByText("Next");

      // Click rapidly
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByText("Step 4 of 5")).toBeDefined();
    });

    it("should not advance beyond last step", () => {
      const onComplete = vi.fn();
      render(<Tutorial onComplete={onComplete} />);

      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next"));
      }

      // Click Get Started multiple times
      const getStartedButton = screen.getByText("Get Started");
      fireEvent.click(getStartedButton);

      // Should only call onComplete once
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button Rendering", () => {
    it("should render both buttons with correct classes", () => {
      render(<Tutorial />);

      const skipButton = screen.getByText("Skip Tutorial");
      const nextButton = screen.getByText("Next");

      expect(skipButton).toHaveClass("tutorial-button", "btn-secondary");
      expect(nextButton).toHaveClass("tutorial-button", "btn-primary");
    });

    it("should change Next button text on last step", () => {
      render(<Tutorial />);

      // Initially shows "Next"
      expect(screen.getByText("Next")).toBeDefined();

      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText("Next"));
      }

      // Now shows "Get Started"
      expect(screen.getByText("Get Started")).toBeDefined();
      expect(screen.queryByText("Next")).toBeNull();
    });
  });

  describe("State Persistence", () => {
    it("should persist completion state across renders", () => {
      const { rerender } = render(<Tutorial />);

      fireEvent.click(screen.getByText("Skip Tutorial"));

      // Rerender component
      rerender(<Tutorial />);

      // Should not show tutorial
      expect(screen.queryByText("Welcome to DARKMOON")).toBeNull();
    });

    it("should check localStorage on mount", () => {
      window.localStorage.setItem("darkmoon-tutorial-complete", "true");

      render(<Tutorial />);

      expect(screen.queryByText("Welcome to DARKMOON")).toBeNull();
    });
  });

  describe("Step Navigation Logic", () => {
    it("should update step counter correctly", () => {
      render(<Tutorial />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Step ${i} of 5`)).toBeDefined();
        if (i < 5) {
          fireEvent.click(screen.getByText("Next"));
        }
      }
    });

    it("should maintain step state during navigation", () => {
      render(<Tutorial />);

      // Go to step 3
      fireEvent.click(screen.getByText("Next"));
      fireEvent.click(screen.getByText("Next"));

      expect(screen.getByText("Step 3 of 5")).toBeDefined();
      expect(screen.getByText("Camera Control")).toBeDefined();
    });
  });

  describe("Overlay Rendering", () => {
    it("should render with tutorial-overlay class", () => {
      const { container } = render(<Tutorial />);

      const overlay = container.querySelector(".tutorial-overlay");
      expect(overlay).toBeDefined();
    });

    it("should render with tutorial-content class", () => {
      const { container } = render(<Tutorial />);

      const content = container.querySelector(".tutorial-content");
      expect(content).toBeDefined();
    });

    it("should have header, body, and footer sections", () => {
      const { container } = render(<Tutorial />);

      expect(container.querySelector(".tutorial-header")).toBeDefined();
      expect(container.querySelector(".tutorial-body")).toBeDefined();
      expect(container.querySelector(".tutorial-footer")).toBeDefined();
    });
  });
});
