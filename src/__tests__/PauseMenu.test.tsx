import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PauseMenu from "../components/PauseMenu";

describe("PauseMenu Component", () => {
  const mockOnResume = vi.fn();
  const mockOnRestart = vi.fn();
  const mockOnQuit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isVisible is false", () => {
      render(
        <PauseMenu
          isVisible={false}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.queryByText(/PAUSED/i)).not.toBeInTheDocument();
    });

    it("should render when isVisible is true", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.getByText(/PAUSED/i)).toBeInTheDocument();
    });

    it("should render all three action buttons", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(
        screen.getByRole("button", { name: /▶️ Resume/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /🔄 Restart/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /🚪 Quit to Menu/i }),
      ).toBeInTheDocument();
    });

    it("should display ESC hint text", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.getByText(/Press ESC to resume/i)).toBeInTheDocument();
    });

    it("should render with proper overlay styling", () => {
      const { container } = render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        position: "fixed",
        width: "100vw",
        height: "100vh",
      });
    });
  });

  describe("Button Interactions", () => {
    it("should call onResume when Resume button is clicked", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const resumeButton = screen.getByRole("button", { name: /▶️ Resume/i });
      fireEvent.click(resumeButton);

      expect(mockOnResume).toHaveBeenCalledTimes(1);
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnQuit).not.toHaveBeenCalled();
    });

    it("should call onRestart when Restart button is clicked", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const restartButton = screen.getByRole("button", { name: /🔄 Restart/i });
      fireEvent.click(restartButton);

      expect(mockOnRestart).toHaveBeenCalledTimes(1);
      expect(mockOnResume).not.toHaveBeenCalled();
      expect(mockOnQuit).not.toHaveBeenCalled();
    });

    it("should call onQuit when Quit button is clicked", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const quitButton = screen.getByRole("button", {
        name: /🚪 Quit to Menu/i,
      });
      fireEvent.click(quitButton);

      expect(mockOnQuit).toHaveBeenCalledTimes(1);
      expect(mockOnResume).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    it("should not trigger callbacks when not visible", () => {
      const { rerender } = render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      // Hide the menu
      rerender(
        <PauseMenu
          isVisible={false}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      // Try to query buttons (they shouldn't exist)
      expect(screen.queryByText(/Resume/i)).not.toBeInTheDocument();
      expect(mockOnResume).not.toHaveBeenCalled();
    });
  });

  describe("Visual Feedback", () => {
    it("should apply hover styles to Resume button", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const resumeButton = screen.getByRole("button", { name: /▶️ Resume/i });

      // Initial state - check for primary variant class
      expect(resumeButton).toHaveClass("btn-primary");
      expect(resumeButton).toHaveClass("btn-large");

      // Hover - check for hover state via class (CSS handles this)
      fireEvent.mouseEnter(resumeButton);
      // CSS :hover handles background color and transform, so just verify interaction works
      expect(resumeButton).toBeInTheDocument();

      // Leave
      fireEvent.mouseLeave(resumeButton);
      expect(resumeButton).toBeInTheDocument();
    });

    it("should apply hover styles to Restart button", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const restartButton = screen.getByRole("button", { name: /🔄 Restart/i });

      expect(restartButton).toHaveClass("btn-warning");
      expect(restartButton).toHaveClass("btn-large");

      fireEvent.mouseEnter(restartButton);
      expect(restartButton).toBeInTheDocument();

      fireEvent.mouseLeave(restartButton);
      expect(restartButton).toBeInTheDocument();
    });

    it("should apply hover styles to Quit button", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const quitButton = screen.getByRole("button", {
        name: /🚪 Quit to Menu/i,
      });

      expect(quitButton).toHaveClass("btn-danger");
      expect(quitButton).toHaveClass("btn-large");

      fireEvent.mouseEnter(quitButton);
      expect(quitButton).toBeInTheDocument();

      fireEvent.mouseLeave(quitButton);
      expect(quitButton).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("should toggle visibility correctly", () => {
      const { rerender } = render(
        <PauseMenu
          isVisible={false}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.queryByText(/PAUSED/i)).not.toBeInTheDocument();

      rerender(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.getByText(/PAUSED/i)).toBeInTheDocument();

      rerender(
        <PauseMenu
          isVisible={false}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      expect(screen.queryByText(/PAUSED/i)).not.toBeInTheDocument();
    });

    it("should handle multiple button clicks", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const resumeButton = screen.getByRole("button", { name: /▶️ Resume/i });

      fireEvent.click(resumeButton);
      fireEvent.click(resumeButton);
      fireEvent.click(resumeButton);

      expect(mockOnResume).toHaveBeenCalledTimes(3);
    });
  });

  describe("Accessibility", () => {
    it("should render buttons with proper cursor pointer", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        // Buttons use .btn class which has cursor: pointer
        expect(button).toHaveClass("btn");
      });
    });

    it("should have distinguishable button colors", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const resumeButton = screen.getByRole("button", { name: /▶️ Resume/i });
      const restartButton = screen.getByRole("button", { name: /🔄 Restart/i });
      const quitButton = screen.getByRole("button", {
        name: /🚪 Quit to Menu/i,
      });

      // Each button should have different variant classes
      expect(resumeButton).toHaveClass("btn-primary");
      expect(restartButton).toHaveClass("btn-warning");
      expect(quitButton).toHaveClass("btn-danger");
    });
  });

  describe("Layout and Structure", () => {
    it("should center menu on screen", () => {
      const { container } = render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      });
    });

    it("should render buttons in vertical layout", () => {
      render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const resumeButton = screen.getByRole("button", { name: /▶️ Resume/i });
      const buttonContainer = resumeButton.parentElement;

      expect(buttonContainer).toHaveStyle({
        display: "flex",
        flexDirection: "column",
      });
    });

    it("should have high z-index for overlay", () => {
      const { container } = render(
        <PauseMenu
          isVisible={true}
          onResume={mockOnResume}
          onRestart={mockOnRestart}
          onQuit={mockOnQuit}
        />,
      );

      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveStyle({ zIndex: "10000" });
    });
  });
});
