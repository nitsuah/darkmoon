import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, describe, it } from "vitest";
import Home from "../pages/Home";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";

describe("Home Page", () => {
  it("renders the main header", () => {
    render(
      <ThemeProvider>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Home />
        </BrowserRouter>
      </ThemeProvider>
    );
    // Text now has spaces between PLAY, moon emoji, and DARKMOON
    expect(screen.getByText(/PLAY.*DARKMOON/i)).toBeInTheDocument();
  });
});
