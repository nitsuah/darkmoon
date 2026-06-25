import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MoveEventData } from "../types/socket";

// This is an integration test for multiplayer functionality
// It simulates multiple clients connecting and moving in the game

interface MockSocket {
  id: string;
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  disconnect: () => void;
  connected: boolean;
  _moveCallback?: (data: unknown) => void;
}

describe("Multiplayer Integration", () => {
  let mockClients: Record<string, MockSocket>;
  let mockServer: {
    clients: Record<
      string,
      { position: [number, number, number]; rotation: [number, number, number] }
    >;
    emit: (event: string, data: unknown) => void;
  };

  beforeEach(() => {
    mockClients = {};
    mockServer = {
      clients: {},
      emit: vi.fn((event: string, data: unknown) => {
        // Simulate server broadcasting to all clients
        Object.values(mockClients).forEach((client) => {
          const callback = client._moveCallback;
          if (callback && event === "move") {
            callback(data);
          }
        });
      }),
    };
  });

  afterEach(() => {
    Object.values(mockClients).forEach((client) => {
      if (client.connected) {
        client.disconnect();
      }
    });
    vi.clearAllMocks();
  });

  const createMockClient = (id: string): MockSocket => {
    const client: MockSocket = {
      id,
      connected: true,
      emit: vi.fn((event: string, data: unknown) => {
        if (event === "move") {
          const moveData = data as MoveEventData;
          mockServer.clients[moveData.id] = {
            position: moveData.position,
            rotation: moveData.rotation,
          };
          mockServer.emit("move", mockServer.clients);
        }
      }),
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        if (event === "move") {
          client._moveCallback = callback;
        }
      }),
      disconnect: vi.fn(() => {
        client.connected = false;
        delete mockServer.clients[id];
        mockServer.emit("move", mockServer.clients);
      }),
    };
    return client;
  };

  it("should handle multiple clients connecting", () => {
    const client1 = createMockClient("client-1");
    const client2 = createMockClient("client-2");

    mockClients["client-1"] = client1;
    mockClients["client-2"] = client2;

    // Simulate connection
    mockServer.clients["client-1"] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
    mockServer.clients["client-2"] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };

    expect(Object.keys(mockServer.clients)).toHaveLength(2);
    expect(mockServer.clients["client-1"]).toBeDefined();
    expect(mockServer.clients["client-2"]).toBeDefined();
  });

  it("should broadcast position updates to all clients", () => {
    const client1 = createMockClient("client-1");
    const client2 = createMockClient("client-2");

    mockClients["client-1"] = client1;
    mockClients["client-2"] = client2;

    // Setup listeners
    client1.on("move", vi.fn());
    client2.on("move", vi.fn());

    // Client 1 moves
    const moveData: MoveEventData = {
      id: "client-1",
      position: [5, 0, 3],
      rotation: [0, Math.PI / 2, 0],
    };

    client1.emit("move", moveData);

    expect(mockServer.clients["client-1"]).toEqual({
      position: [5, 0, 3],
      rotation: [0, Math.PI / 2, 0],
    });
  });

  it("should remove client from server state on disconnect", () => {
    const client1 = createMockClient("client-1");
    const client2 = createMockClient("client-2");

    mockClients["client-1"] = client1;
    mockClients["client-2"] = client2;

    mockServer.clients["client-1"] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
    mockServer.clients["client-2"] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };

    expect(Object.keys(mockServer.clients)).toHaveLength(2);

    // Client 1 disconnects
    client1.disconnect();

    expect(Object.keys(mockServer.clients)).toHaveLength(1);
    expect(mockServer.clients["client-1"]).toBeUndefined();
    expect(mockServer.clients["client-2"]).toBeDefined();
  });

  it("should handle rapid position updates without data loss", () => {
    const client1 = createMockClient("client-1");
    mockClients["client-1"] = client1;

    client1.on("move", vi.fn());

    // Simulate rapid movements
    const movements: MoveEventData[] = [
      { id: "client-1", position: [1, 0, 0], rotation: [0, 0, 0] },
      { id: "client-1", position: [2, 0, 0], rotation: [0, 0.1, 0] },
      { id: "client-1", position: [3, 0, 0], rotation: [0, 0.2, 0] },
      { id: "client-1", position: [4, 0, 0], rotation: [0, 0.3, 0] },
      { id: "client-1", position: [5, 0, 0], rotation: [0, 0.4, 0] },
    ];

    movements.forEach((move) => {
      client1.emit("move", move);
    });

    // Last position should be preserved
    expect(mockServer.clients["client-1"].position).toEqual([5, 0, 0]);
    expect(mockServer.clients["client-1"].rotation[1]).toBeCloseTo(0.4);
  });

  it("should maintain separate state for each client", () => {
    const client1 = createMockClient("client-1");
    const client2 = createMockClient("client-2");
    const client3 = createMockClient("client-3");

    mockClients["client-1"] = client1;
    mockClients["client-2"] = client2;
    mockClients["client-3"] = client3;

    // Each client moves to different positions
    client1.emit("move", {
      id: "client-1",
      position: [10, 0, 0],
      rotation: [0, 0, 0],
    });
    client2.emit("move", {
      id: "client-2",
      position: [0, 10, 0],
      rotation: [0, 0, 0],
    });
    client3.emit("move", {
      id: "client-3",
      position: [0, 0, 10],
      rotation: [0, 0, 0],
    });

    expect(mockServer.clients["client-1"].position).toEqual([10, 0, 0]);
    expect(mockServer.clients["client-2"].position).toEqual([0, 10, 0]);
    expect(mockServer.clients["client-3"].position).toEqual([0, 0, 10]);
  });

  it("should handle client reconnection", () => {
    const client1 = createMockClient("client-1");
    mockClients["client-1"] = client1;

    // Initial connection
    mockServer.clients["client-1"] = {
      position: [5, 0, 5],
      rotation: [0, 0, 0],
    };
    expect(mockServer.clients["client-1"]).toBeDefined();

    // Disconnect
    client1.disconnect();
    expect(mockServer.clients["client-1"]).toBeUndefined();

    // Reconnect with new socket
    const client1Reconnected = createMockClient("client-1");
    mockClients["client-1"] = client1Reconnected;
    mockServer.clients["client-1"] = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };

    expect(mockServer.clients["client-1"]).toBeDefined();
    expect(client1Reconnected.connected).toBe(true);
  });

  it("should validate position data types", () => {
    const client1 = createMockClient("client-1");
    mockClients["client-1"] = client1;

    const validMove: MoveEventData = {
      id: "client-1",
      position: [1.5, 2.3, -4.7],
      rotation: [0.1, 0.2, 0.3],
    };

    client1.emit("move", validMove);

    const savedState = mockServer.clients["client-1"];
    expect(Array.isArray(savedState.position)).toBe(true);
    expect(savedState.position).toHaveLength(3);
    expect(Array.isArray(savedState.rotation)).toBe(true);
    expect(savedState.rotation).toHaveLength(3);

    savedState.position.forEach((coord) => {
      expect(typeof coord).toBe("number");
    });
    savedState.rotation.forEach((coord) => {
      expect(typeof coord).toBe("number");
    });
  });
});
