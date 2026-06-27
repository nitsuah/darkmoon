import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import React from "react";

// Test component that uses the theme
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle">
        Toggle
      </button>
    </div>
  );
};

describe("ThemeContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("ThemeProvider", () => {
    it("should provide default dark theme", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    it("should toggle between dark and light themes", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      );

      const themeElement = screen.getByTestId("theme");
      const toggleButton = screen.getByTestId("toggle");

      expect(themeElement).toHaveTextContent("dark");

      fireEvent.click(toggleButton);
      expect(themeElement).toHaveTextContent("light");

      fireEvent.click(toggleButton);
      expect(themeElement).toHaveTextContent("dark");
    });

    it("should persist theme to localStorage", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      );

      const toggleButton = screen.getByTestId("toggle");
      fireEvent.click(toggleButton);

      expect(window.localStorage.getItem("darkmoon-theme")).toBe("light");
    });

    it("should load saved theme from localStorage", () => {
      window.localStorage.setItem("darkmoon-theme", "light");

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });

    it("should set data-theme attribute on document element", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      );

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      const toggleButton = screen.getByTestId("toggle");
      fireEvent.click(toggleButton);

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("useTheme", () => {
    it("should throw error when used outside ThemeProvider", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useTheme must be used within a ThemeProvider");

      console.error = originalError;
    });
  });
});
