import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PerformanceMonitor from "../components/PerformanceMonitor";

describe("PerformanceMonitor Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render FPS display", () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    });

    it("should display initial FPS value of 60", () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText(/FPS: 60/)).toBeInTheDocument();
    });

    it("should have correct styling", () => {
      render(<PerformanceMonitor />);
      const fpsElement = screen.getByRole("button");
      expect(fpsElement).toHaveStyle({
        position: "fixed",
        top: "10px",
        right: "10px",
      });
    });
  });

  describe("FPS Color Coding", () => {
    it("should display green color for high FPS", () => {
      render(<PerformanceMonitor />);
      const fpsElement = screen.getByRole("button");
      expect(fpsElement).toHaveStyle({ color: "rgb(0, 255, 0)" });
    });
  });

  describe("User Interactions", () => {
    it("should hide on click", async () => {
      const { act } = await import("@testing-library/react");
      render(<PerformanceMonitor />);
      const fpsElement = screen.getByRole("button");
      await act(async () => {
        fpsElement.click();
      });
      await waitFor(() => {
        expect(screen.queryByText(/FPS:/)).not.toBeInTheDocument();
      });
    });

    it("should have role button for accessibility", () => {
      render(<PerformanceMonitor />);
      expect(screen.getByRole("button")).toHaveAttribute("role", "button");
    });

    it("should have tabIndex for keyboard navigation", () => {
      render(<PerformanceMonitor />);
      expect(screen.getByRole("button")).toHaveAttribute("tabIndex", "0");
    });

    it("should display Click to hide title", () => {
      render(<PerformanceMonitor />);
      expect(screen.getByRole("button")).toHaveAttribute(
        "title",
        "Click to hide"
      );
    });
  });

  describe("FPS Calculation", () => {
    it("should use requestAnimationFrame", () => {
      const mockRAF = vi.spyOn(window, "requestAnimationFrame");
      render(<PerformanceMonitor />);
      expect(mockRAF).toHaveBeenCalled();
      mockRAF.mockRestore();
    });

    it("should cleanup on unmount", () => {
      const mockCAF = vi.spyOn(window, "cancelAnimationFrame");
      const { unmount } = render(<PerformanceMonitor />);
      unmount();
      expect(mockCAF).toHaveBeenCalled();
      mockCAF.mockRestore();
    });
  });
});
