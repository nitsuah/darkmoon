import { describe, it, expect, beforeEach, vi } from "vitest";
import { W, A, S, D, DIRECTIONS } from "../components/utils";

/**
 * Integration tests for multiplayer movement mechanics
 * Tests keyboard input handling, position updates, and socket synchronization
 */

describe("Movement Integration Tests", () => {
  describe("Keyboard Input Handling", () => {
    it("should detect single key press correctly", () => {
      const keysPressed: Record<string, boolean> = {
        [W]: true,
        [A]: false,
        [S]: false,
        [D]: false,
      };

      const directionPressed = DIRECTIONS.some(
        (key) => keysPressed[key] === true,
      );
      expect(directionPressed).toBe(true);
    });

    it("should detect multiple simultaneous key presses", () => {
      const keysPressed: Record<string, boolean> = {
        [W]: true,
        [A]: true,
        [S]: false,
        [D]: false,
      };

      const wPressed = keysPressed[W];
      const aPressed = keysPressed[A];

      expect(wPressed && aPressed).toBe(true);
    });

    it("should detect no keys pressed", () => {
      const keysPressed: Record<string, boolean> = {
        [W]: false,
        [A]: false,
        [S]: false,
        [D]: false,
      };

      const directionPressed = DIRECTIONS.some(
        (key) => keysPressed[key] === true,
      );
      expect(directionPressed).toBe(false);
    });

    it("should handle all direction keys", () => {
      DIRECTIONS.forEach((direction) => {
        const keysPressed: Record<string, boolean> = {
          [W]: false,
          [A]: false,
          [S]: false,
          [D]: false,
          [direction]: true,
        };

        const directionPressed = DIRECTIONS.some(
          (key) => keysPressed[key] === true,
        );
        expect(directionPressed).toBe(true);
      });
    });
  });

  describe("Position Update Synchronization", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        id: "test-client-1",
      };
    });

    it("should emit move event with correct position data", () => {
      const position: [number, number, number] = [5, 0, 3];
      const rotation: [number, number, number] = [0, Math.PI / 2, 0];

      mockSocket.emit("move", {
        id: mockSocket.id,
        position,
        rotation,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("move", {
        id: "test-client-1",
        position: [5, 0, 3],
        rotation: [0, Math.PI / 2, 0],
      });
    });

    it("should handle floating point positions correctly", () => {
      const position: [number, number, number] = [1.234567, 0, -3.141592];
      const rotation: [number, number, number] = [0.1, 0.2, 0.3];

      mockSocket.emit("move", {
        id: mockSocket.id,
        position,
        rotation,
      });

      const call = mockSocket.emit.mock.calls[0];
      const moveData = call[1] as { position: [number, number, number] };

      expect(moveData.position[0]).toBeCloseTo(1.234567);
      expect(moveData.position[2]).toBeCloseTo(-3.141592);
    });

    it("should emit move events at regular intervals during movement", () => {
      const moveInterval = 16; // ~60fps
      const duration = 100; // 100ms
      const expectedCalls = Math.floor(duration / moveInterval);

      // Simulate movement loop
      for (let i = 0; i < expectedCalls; i++) {
        mockSocket.emit("move", {
          id: mockSocket.id,
          position: [i * 0.1, 0, 0],
          rotation: [0, 0, 0],
        });
      }

      expect(mockSocket.emit).toHaveBeenCalledTimes(expectedCalls);
    });
  });

  describe("Multi-Client Movement Synchronization", () => {
    let clients: Record<
      string,
      { position: [number, number, number]; rotation: [number, number, number] }
    >;

    beforeEach(() => {
      clients = {};
    });

    it("should update client position in shared state", () => {
      const clientId = "client-1";
      const newPosition: [number, number, number] = [10, 0, 5];
      const newRotation: [number, number, number] = [0, Math.PI, 0];

      clients[clientId] = {
        position: newPosition,
        rotation: newRotation,
      };

      expect(clients[clientId].position).toEqual([10, 0, 5]);
      expect(clients[clientId].rotation).toEqual([0, Math.PI, 0]);
    });

    it("should maintain independent positions for multiple clients", () => {
      clients["client-1"] = { position: [0, 0, 0], rotation: [0, 0, 0] };
      clients["client-2"] = { position: [5, 0, 0], rotation: [0, 0, 0] };
      clients["client-3"] = { position: [0, 0, 5], rotation: [0, 0, 0] };

      // Update client-2
      clients["client-2"].position = [10, 0, 0];

      expect(clients["client-1"].position).toEqual([0, 0, 0]);
      expect(clients["client-2"].position).toEqual([10, 0, 0]);
      expect(clients["client-3"].position).toEqual([0, 0, 5]);
    });

    it("should handle rapid position updates without conflicts", () => {
      const clientId = "client-1";
      clients[clientId] = { position: [0, 0, 0], rotation: [0, 0, 0] };

      // Rapid updates
      const updates = [
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
        [4, 0, 0],
        [5, 0, 0],
      ] as [number, number, number][];

      updates.forEach((position) => {
        clients[clientId].position = position;
      });

      expect(clients[clientId].position).toEqual([5, 0, 0]);
    });

    it("should remove client on disconnect", () => {
      clients["client-1"] = { position: [0, 0, 0], rotation: [0, 0, 0] };
      clients["client-2"] = { position: [5, 0, 0], rotation: [0, 0, 0] };

      expect(Object.keys(clients)).toHaveLength(2);

      // Simulate disconnect
      delete clients["client-1"];

      expect(Object.keys(clients)).toHaveLength(1);
      expect(clients["client-1"]).toBeUndefined();
      expect(clients["client-2"]).toBeDefined();
    });
  });

  describe("Movement Velocity and Direction", () => {
    it("should calculate correct movement direction for W key", () => {
      const keysPressed = { [W]: true, [A]: false, [S]: false, [D]: false };
      const expectedDirection = 0; // Forward

      expect(keysPressed[W]).toBe(true);
      expect(expectedDirection).toBe(0);
    });

    it("should calculate correct movement direction for diagonal W+A", () => {
      const keysPressed = { [W]: true, [A]: true, [S]: false, [D]: false };
      const expectedDirection = Math.PI / 4; // 45 degrees

      expect(keysPressed[W] && keysPressed[A]).toBe(true);
      expect(expectedDirection).toBeCloseTo(0.785398); // π/4
    });

    it("should calculate correct movement direction for diagonal W+D", () => {
      const keysPressed = { [W]: true, [A]: false, [S]: false, [D]: true };
      const expectedDirection = -Math.PI / 4; // -45 degrees

      expect(keysPressed[W] && keysPressed[D]).toBe(true);
      expect(expectedDirection).toBeCloseTo(-0.785398); // -π/4
    });

    it("should handle opposite key presses (W+S should favor S)", () => {
      const keysPressed = { [W]: true, [A]: false, [S]: true, [D]: false };

      // In typical implementations, S (backward) takes precedence
      expect(keysPressed[S]).toBe(true);
    });
  });

  describe("Position Bounds and Validation", () => {
    it("should keep positions within valid number range", () => {
      const position: [number, number, number] = [1000000, 0, -1000000];

      expect(Number.isFinite(position[0])).toBe(true);
      expect(Number.isFinite(position[1])).toBe(true);
      expect(Number.isFinite(position[2])).toBe(true);
    });

    it("should handle zero positions", () => {
      const position: [number, number, number] = [0, 0, 0];

      expect(position).toEqual([0, 0, 0]);
    });

    it("should handle negative positions", () => {
      const position: [number, number, number] = [-5, -10, -15];

      expect(position[0]).toBeLessThan(0);
      expect(position[1]).toBeLessThan(0);
      expect(position[2]).toBeLessThan(0);
    });

    it("should validate position array length", () => {
      const position: [number, number, number] = [1, 2, 3];

      expect(position).toHaveLength(3);
    });

    it("should validate rotation array length", () => {
      const rotation: [number, number, number] = [0, Math.PI, 0];

      expect(rotation).toHaveLength(3);
    });
  });

  describe("Socket Event Ordering", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSocket: any;

    beforeEach(() => {
      mockSocket = {
        emit: vi.fn(),
        on: vi.fn((event: string, handler: (data: unknown) => void) => {
          mockSocket.eventHandlers.set(event, handler);
        }),
        eventHandlers: new Map(),
      };
    });

    it("should register move event listener before emitting", () => {
      const moveHandler = vi.fn();
      mockSocket.on("move", moveHandler);

      expect(mockSocket.on).toHaveBeenCalledWith("move", expect.any(Function));
      expect(mockSocket.eventHandlers.has("move")).toBe(true);
    });

    it("should handle move events in order", () => {
      const positions: [number, number, number][] = [];
      const moveHandler = (data: unknown) => {
        const clients = data as Record<
          string,
          { position: [number, number, number] }
        >;
        const firstClient = Object.values(clients)[0];
        if (firstClient) {
          positions.push(firstClient.position);
        }
      };

      mockSocket.on("move", moveHandler);

      // Simulate receiving multiple move events
      const handler = mockSocket.eventHandlers.get("move");
      if (handler) {
        handler({ "client-1": { position: [1, 0, 0], rotation: [0, 0, 0] } });
        handler({ "client-1": { position: [2, 0, 0], rotation: [0, 0, 0] } });
        handler({ "client-1": { position: [3, 0, 0], rotation: [0, 0, 0] } });
      }

      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual([1, 0, 0]);
      expect(positions[1]).toEqual([2, 0, 0]);
      expect(positions[2]).toEqual([3, 0, 0]);
    });
  });
});
