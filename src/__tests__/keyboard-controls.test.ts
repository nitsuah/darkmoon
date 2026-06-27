import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  KeyDisplay,
  W,
  A,
  S,
  D,
  Q,
  E,
  SHIFT,
  SPACE,
  DIRECTIONS,
} from "../components/utils";

/**
 * Tests for keyboard controls and KeyDisplay component
 */

describe("Keyboard Controls", () => {
  let keyDisplay: KeyDisplay;
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container for the key display elements
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Remove any key display elements (uppercase labels)
    document.querySelectorAll('[style*="position: absolute"]').forEach((el) => {
      if (
        el.textContent &&
        ["W", "A", "S", "D", "Q", "E", "SHIFT", "SPACE"].includes(
          el.textContent as string,
        )
      ) {
        el.remove();
      }
    });
  });

  describe("Key Constants", () => {
    it("should define all direction keys", () => {
      expect(W).toBe("w");
      expect(A).toBe("a");
      expect(S).toBe("s");
      expect(D).toBe("d");
      expect(SHIFT).toBe("shift");
    });

    it("should include all direction keys in DIRECTIONS array", () => {
      expect(DIRECTIONS).toEqual(["w", "a", "s", "d", "q", "e"]);
      expect(DIRECTIONS).toHaveLength(6);
    });
  });

  describe("KeyDisplay Component", () => {
    it("should create display elements for all keys", () => {
      keyDisplay = new KeyDisplay();

      expect(keyDisplay.map.size).toBe(8); // W,A,S,D,Q,E,SHIFT,SPACE
      expect(keyDisplay.map.has(W)).toBe(true);
      expect(keyDisplay.map.has(A)).toBe(true);
      expect(keyDisplay.map.has(S)).toBe(true);
      expect(keyDisplay.map.has(D)).toBe(true);
      expect(keyDisplay.map.has(Q)).toBe(true);
      expect(keyDisplay.map.has(E)).toBe(true);
      expect(keyDisplay.map.has(SHIFT)).toBe(true);
      expect(keyDisplay.map.has(SPACE)).toBe(true);
    });

    it("should set initial color to purple", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.map.forEach((element) => {
        expect(element.style.color).toBe("rgba(128, 0, 128, 0.7)");
      });
    });

    it("should position elements absolutely", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.map.forEach((element) => {
        expect(element.style.position).toBe("absolute");
      });
    });

    it("should display correct key labels", () => {
      keyDisplay = new KeyDisplay();

      expect(keyDisplay.map.get(W)?.textContent).toBe("W");
      expect(keyDisplay.map.get(A)?.textContent).toBe("A");
      expect(keyDisplay.map.get(S)?.textContent).toBe("S");
      expect(keyDisplay.map.get(D)?.textContent).toBe("D");
      expect(keyDisplay.map.get(SHIFT)?.textContent).toBe("SHIFT");
    });

    it("should change color to red on key down", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.down("w");
      expect(keyDisplay.map.get(W)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );

      keyDisplay.down("a");
      expect(keyDisplay.map.get(A)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );
    });

    it("should change color back to purple on key up", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.down("w");
      expect(keyDisplay.map.get(W)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );

      keyDisplay.up("w");
      expect(keyDisplay.map.get(W)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
    });

    it("should handle uppercase key input", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.down("W");
      expect(keyDisplay.map.get(W)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );

      keyDisplay.up("W");
      expect(keyDisplay.map.get(W)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
    });

    it("should handle invalid keys gracefully", () => {
      keyDisplay = new KeyDisplay();

      expect(() => keyDisplay.down("x")).not.toThrow();
      expect(() => keyDisplay.up("x")).not.toThrow();
    });

    it("should update positions based on window size", () => {
      keyDisplay = new KeyDisplay();

      const bottomY = window.innerHeight - 80;
      const wElement = keyDisplay.map.get(W);
      const aElement = keyDisplay.map.get(A);

      expect(wElement?.style.top).toBe(`${bottomY - 30}px`);
      expect(aElement?.style.top).toBe(`${bottomY}px`);
    });
  });

  describe("Keyboard Event Integration", () => {
    it("should track multiple simultaneous key presses", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.down("w");
      keyDisplay.down("a");

      expect(keyDisplay.map.get(W)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );
      expect(keyDisplay.map.get(A)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );
      expect(keyDisplay.map.get(S)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
      expect(keyDisplay.map.get(D)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
    });

    it("should handle rapid key press/release", () => {
      keyDisplay = new KeyDisplay();

      for (let i = 0; i < 10; i++) {
        keyDisplay.down("w");
        keyDisplay.up("w");
      }

      expect(keyDisplay.map.get(W)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
    });

    it("should maintain independent state for each key", () => {
      keyDisplay = new KeyDisplay();

      keyDisplay.down("w");
      keyDisplay.down("d");
      keyDisplay.up("w");

      expect(keyDisplay.map.get(W)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
      expect(keyDisplay.map.get(D)?.style.color).toBe(
        "rgba(255, 100, 100, 0.9)",
      );
      expect(keyDisplay.map.get(A)?.style.color).toBe("rgba(128, 0, 128, 0.7)");
    });
  });
});
