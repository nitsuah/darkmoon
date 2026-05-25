import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import Home from "../pages/Home";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("Home Page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the main header", () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </ThemeProvider>,
    );
    // Text now has spaces between PLAY, moon emoji, and DARKMOON
    expect(screen.getByText(/PLAY.*DARKMOON/i)).toBeInTheDocument();
  });

  it("navigates on desktop CTA and mode card click", () => {
    render(
      <ThemeProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("START PLAYING"));
    expect(navigateMock).toHaveBeenCalledWith("/solo");

    fireEvent.click(screen.getByText("Solo Practice"));
    expect(navigateMock).toHaveBeenCalledWith("/solo");
  });

  it("flips card on mobile first tap and navigates on second tap", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 768,
    });

    render(
      <ThemeProvider>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </ThemeProvider>,
    );

    const soloCardTitle = screen.getByText("Solo Practice");

    fireEvent.click(soloCardTitle);
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.click(soloCardTitle);
    expect(navigateMock).toHaveBeenCalledWith("/solo");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
  });
});
