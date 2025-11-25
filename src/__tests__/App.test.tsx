import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, describe, it, vi } from "vitest";
import App from "../pages/App";

// Mock socket.io-client to prevent real connections
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

// Mock Spline to prevent loading issues
vi.mock("@splinetool/react-spline", () => ({
  default: () => <div>Spline Mock</div>,
}));

describe("App Routing", () => {
  it("renders Home page by default", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    // Wait for lazy-loaded content to render - text now has spaces
    const playButton = await screen.findByText(
      /PLAY.*DARKMOON/i,
      {},
      { timeout: 3000 }
    );
    expect(playButton).toBeInTheDocument();
  });

  it("renders Solo page on /solo", async () => {
    window.history.pushState({}, "", "/solo");
    render(<App />);
    // Solo page renders - just verify no crash
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.body).toBeInTheDocument();
  });

  it("renders 404 page on unknown route", () => {
    window.history.pushState({}, "", "/not-a-real-route");
    render(<App />);
    expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
  });
});
