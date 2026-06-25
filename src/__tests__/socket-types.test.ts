import { describe, it, expect } from "vitest";
import type { Clients, PlayerState, MoveEventData } from "../types/socket";

describe("Socket Type Validation", () => {
  it("should validate PlayerState structure", () => {
    const validPlayerState: PlayerState = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };

    expect(validPlayerState.position).toHaveLength(3);
    expect(validPlayerState.rotation).toHaveLength(3);
    validPlayerState.position.forEach((coord) => {
      expect(typeof coord).toBe("number");
    });
  });

  it("should validate Clients dictionary structure", () => {
    const validClients: Clients = {
      "player-1": { position: [1, 0, 0], rotation: [0, 0, 0] },
      "player-2": { position: [0, 1, 0], rotation: [0, Math.PI, 0] },
      "player-3": { position: [0, 0, 1], rotation: [0, 0, Math.PI / 2] },
    };

    expect(Object.keys(validClients)).toHaveLength(3);
    Object.values(validClients).forEach((state) => {
      expect(state.position).toHaveLength(3);
      expect(state.rotation).toHaveLength(3);
    });
  });

  it("should validate MoveEventData structure", () => {
    const validMoveEvent: MoveEventData = {
      id: "player-1",
      position: [5, 2, -3],
      rotation: [0, Math.PI / 4, 0],
    };

    expect(typeof validMoveEvent.id).toBe("string");
    expect(validMoveEvent.id.length).toBeGreaterThan(0);
    expect(validMoveEvent.position).toHaveLength(3);
    expect(validMoveEvent.rotation).toHaveLength(3);
  });

  it("should handle edge case positions", () => {
    const edgeCaseState: PlayerState = {
      position: [-1000, 0, 1000],
      rotation: [Math.PI * 2, 0, -Math.PI],
    };

    expect(edgeCaseState.position[0]).toBe(-1000);
    expect(edgeCaseState.position[2]).toBe(1000);
    expect(edgeCaseState.rotation[0]).toBeCloseTo(Math.PI * 2);
  });

  it("should handle floating point precision in positions", () => {
    const preciseState: PlayerState = {
      position: [1.234567, 2.345678, 3.456789],
      rotation: [0.111111, 0.222222, 0.333333],
    };

    expect(preciseState.position[0]).toBeCloseTo(1.234567, 6);
    expect(preciseState.position[1]).toBeCloseTo(2.345678, 6);
    expect(preciseState.position[2]).toBeCloseTo(3.456789, 6);
  });
});

describe("Socket Event Handlers", () => {
  it("should correctly filter out own client ID", () => {
    const mockSocketId = "my-socket-id";
    const clients: Clients = {
      "my-socket-id": { position: [0, 0, 0], rotation: [0, 0, 0] },
      "other-player-1": { position: [1, 0, 0], rotation: [0, 0, 0] },
      "other-player-2": { position: [2, 0, 0], rotation: [0, 0, 0] },
    };

    const otherClients = Object.keys(clients)
      .filter((id) => id !== mockSocketId)
      .map((id) => ({ id, ...clients[id] }));

    expect(otherClients).toHaveLength(2);
    expect(otherClients.find((c) => c.id === mockSocketId)).toBeUndefined();
  });

  it("should handle empty clients object", () => {
    const clients: Clients = {};

    const clientArray = Object.keys(clients);
    expect(clientArray).toHaveLength(0);
  });

  it("should preserve client state during updates", () => {
    const initialClients: Clients = {
      "player-1": { position: [0, 0, 0], rotation: [0, 0, 0] },
    };

    const updatedClients: Clients = {
      ...initialClients,
      "player-1": { position: [5, 0, 0], rotation: [0, Math.PI / 2, 0] },
      "player-2": { position: [10, 0, 0], rotation: [0, 0, 0] },
    };

    expect(Object.keys(updatedClients)).toHaveLength(2);
    expect(updatedClients["player-1"].position).toEqual([5, 0, 0]);
    expect(updatedClients["player-2"]).toBeDefined();
  });
});
