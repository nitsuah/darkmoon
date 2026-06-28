import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../components/LoadingSpinner";

describe("LoadingSpinner Component", () => {
  describe("Rendering", () => {
    it("should render loading text", () => {
      render(<LoadingSpinner />);
      expect(screen.getByText("Loading DARKMOON...")).toBeInTheDocument();
    });

    it("should render spinner element", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".spinner");
      expect(spinner).toBeInTheDocument();
    });

    it("should have dark background", () => {
      render(<LoadingSpinner />);
      const wrapper = screen.getByText("Loading DARKMOON...").parentElement;
      expect(wrapper).toHaveStyle({ backgroundColor: "#1a1a1a" });
    });
  });

  describe("Layout and Positioning", () => {
    it("should be centered vertically and horizontally", () => {
      render(<LoadingSpinner />);
      const wrapper = screen.getByText("Loading DARKMOON...").parentElement;

      expect(wrapper).toHaveStyle({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
    });

    it("should take full viewport height", () => {
      render(<LoadingSpinner />);
      const wrapper = screen.getByText("Loading DARKMOON...").parentElement;
      expect(wrapper).toHaveStyle({ height: "100vh" });
    });

    it("should take full width", () => {
      render(<LoadingSpinner />);
      const wrapper = screen.getByText("Loading DARKMOON...").parentElement;
      expect(wrapper).toHaveStyle({ width: "100%" });
    });

    it("should stack elements vertically", () => {
      render(<LoadingSpinner />);
      const wrapper = screen.getByText("Loading DARKMOON...").parentElement;
      expect(wrapper).toHaveStyle({ flexDirection: "column" });
    });
  });

  describe("Spinner Styling", () => {
    it("should have circular border via CSS class", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".spinner");
      expect(spinner).toHaveClass("spinner");
    });

    it("should have large size class", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".spinner");
      expect(spinner).toHaveClass("spinner-large");
    });

    it("should have spin animation via CSS class", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".spinner");
      expect(spinner).toHaveClass("spinner");
    });
  });

  describe("Text Styling", () => {
    it("should have loading text with top margin", () => {
      render(<LoadingSpinner />);
      const text = screen.getByText("Loading DARKMOON...");
      expect(text).toHaveStyle({ marginTop: "20px" });
    });

    it("should have appropriate font size", () => {
      render(<LoadingSpinner />);
      const text = screen.getByText("Loading DARKMOON...");
      expect(text).toHaveStyle({ fontSize: "16px" });
    });
  });

  describe("Animation Keyframes", () => {
    it("should inject spin animation keyframes into DOM", () => {
      const { container } = render(<LoadingSpinner />);
      const style = container.querySelector("style");

      expect(style).toBeInTheDocument();
      expect(style?.textContent).toContain("@keyframes spin");
      expect(style?.textContent).toContain("transform: rotate(0deg)");
      expect(style?.textContent).toContain("transform: rotate(360deg)");
    });
  });
});
