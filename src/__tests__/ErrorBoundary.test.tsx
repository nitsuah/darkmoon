import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../components/ErrorBoundary";
import React from "react";

// Component that throws an error on mount
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = true,
  message = "Test error",
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe("ErrorBoundary Component", () => {
  // Suppress console.error for cleaner test output
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Normal Rendering", () => {
    it("should render children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("should render multiple children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should catch errors and display default fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("🌑")).toBeInTheDocument();
    });

    it("should display custom error message from thrown error", () => {
      const customMessage = "Custom error message";

      render(
        <ErrorBoundary>
          <ThrowError message={customMessage} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it("should display generic message when error has no message", () => {
      render(
        <ErrorBoundary>
          <ThrowError message="" />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText("An unexpected error occurred"),
      ).toBeInTheDocument();
    });

    it("should log error to console", () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      render(
        <ErrorBoundary>
          <ThrowError message="Logged error" />
        </ErrorBoundary>,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("Custom Fallback", () => {
    it("should render custom fallback when provided", () => {
      const customFallback = <div>Custom fallback UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });

    it("should prefer custom fallback over default UI", () => {
      const customFallback = <div>Override default</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError message="Error message" />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Override default")).toBeInTheDocument();
      expect(screen.queryByText("Error message")).not.toBeInTheDocument();
    });
  });

  describe("Reload Functionality", () => {
    it("should display reload button in default fallback", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole("button", { name: /reload page/i }),
      ).toBeInTheDocument();
    });

    it("should call window.location.reload when reload button is clicked", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const reloadButton = screen.getByRole("button", { name: /reload page/i });
      reloadButton.click();

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe("Styling and Accessibility", () => {
    it("should have full viewport height for error display", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const container = screen.getByText("Something went wrong").parentElement;
      expect(container).toHaveStyle({ height: "100vh" });
    });

    it("should center error content", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const container = screen.getByText("Something went wrong").parentElement;
      expect(container).toHaveStyle({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
    });

    it("should have dark background for error display", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const container = screen.getByText("Something went wrong").parentElement;
      expect(container).toHaveStyle({ backgroundColor: "#1a1a1a" });
    });
  });
});
