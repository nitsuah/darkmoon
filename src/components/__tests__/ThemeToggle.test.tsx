import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "../ThemeToggle";

const toggleTheme = vi.fn();
const mockUseTheme = vi.fn(() => ({ theme: "dark", toggleTheme }));

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => mockUseTheme(),
}));

describe("ThemeToggle", () => {
  it("renders dark-mode label and toggles", () => {
    mockUseTheme.mockReturnValue({ theme: "dark", toggleTheme });
    render(<ThemeToggle />);

    const btn = screen.getByLabelText("Switch to light mode");
    fireEvent.click(btn);
    expect(toggleTheme).toHaveBeenCalled();
  });

  it("renders light-mode label", () => {
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme });
    render(<ThemeToggle />);

    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });
});
