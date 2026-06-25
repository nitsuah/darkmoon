import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Footer from "../components/Footer";

describe("Footer Component", () => {
  it("renders footer with Twitter link", () => {
    render(<Footer />);

    const link = screen.getByRole("link", { name: /built by @nitsuahlabs/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://twitter.com/nitsuahlabs");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders Twitter logo image", () => {
    render(<Footer />);

    const logo = screen.getByAltText("Twitter Logo");
    expect(logo).toBeDefined();
    expect(logo.className).toContain("twitter-logo");
  });

  it("has correct container class", () => {
    const { container } = render(<Footer />);

    const footerContainer = container.querySelector(".footer-container");
    expect(footerContainer).toBeDefined();
    expect(footerContainer).not.toBeNull();
  });
});
