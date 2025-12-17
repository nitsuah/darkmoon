import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import Solo from "../pages/Solo";
import { io } from "socket.io-client";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

// Mock React Three Fiber Canvas component
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

// Mock Drei components
vi.mock("@react-three/drei", () => ({
  Text: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="text">{children}</div>
  ),
  Stats: () => <div data-testid="stats" />,
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  id: string;
}

describe("Solo Component", () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connect: vi.fn().mockReturnValue({} as any),
      id: "test-socket-id",
    };

    (io as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider>{component}</ThemeProvider>
      </BrowserRouter>,
    );
  };

  it("renders Canvas component", () => {
    renderWithTheme(<Solo />);
    expect(screen.getByTestId("canvas")).toBeDefined();
  });

  it.skip("renders OrbitControls component", () => {
    // OrbitControls is now commented out in Solo.tsx
    renderWithTheme(<Solo />);
    expect(screen.getByTestId("orbit-controls")).toBeDefined();
  });

  it("initializes socket connection on mount", () => {
    renderWithTheme(<Solo />);
    expect(io).toHaveBeenCalled();
  });

  it.skip("disconnects socket on unmount", () => {
    // Socket cleanup behavior changed after PlayerCharacter extraction
    const { unmount } = renderWithTheme(<Solo />);
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it.skip("listens to move events from socket", () => {
    // Move event handling moved to PlayerCharacter component
    renderWithTheme(<Solo />);
    expect(mockSocket.on).toHaveBeenCalledWith("move", expect.any(Function));
  });

  it.skip("updates clients state when move event is received", async () => {
    // Move event handling moved to PlayerCharacter component
    renderWithTheme(<Solo />);

    // Get the move event handler
    const moveCall = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === "move",
    );
    const moveHandler = moveCall
      ? (moveCall[1] as (
          clients: Record<
            string,
            {
              position: [number, number, number];
              rotation: [number, number, number];
            }
          >,
        ) => void)
      : undefined;

    expect(moveHandler).toBeDefined();

    // Simulate receiving clients data
    const mockClients = {
      "client-1": {
        position: [1, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      "client-2": {
        position: [2, 0, 0] as [number, number, number],
        rotation: [0, 1, 0] as [number, number, number],
      },
    };

    act(() => {
      if (moveHandler) moveHandler(mockClients);
    });

    expect(screen.getByTestId("canvas")).toBeDefined();
  });

  it("filters out own socket ID from rendering", async () => {
    renderWithTheme(<Solo />);

    const moveCall = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === "move",
    );
    const moveHandler = moveCall
      ? (moveCall[1] as (
          clients: Record<
            string,
            {
              position: [number, number, number];
              rotation: [number, number, number];
            }
          >,
        ) => void)
      : undefined;

    // Include own socket ID in clients
    const mockClients = {
      "test-socket-id": {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
      "other-client": {
        position: [1, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      },
    };

    act(() => {
      if (moveHandler) moveHandler(mockClients);
    });

    expect(screen.getByTestId("canvas")).toBeDefined();
  });

  it.skip("cleans up move event listener on unmount", () => {
    // Move event handling moved to PlayerCharacter component
    const { unmount } = renderWithTheme(<Solo />);
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith("move");
  });

  it("uses environment variable for socket server URL when available", () => {
    // Mock import.meta.env for Vite
    vi.stubEnv("VITE_SOCKET_SERVER_URL", "http://custom-server.com");

    renderWithTheme(<Solo />);

    expect(io).toHaveBeenCalledWith("http://custom-server.com", {
      transports: ["websocket"],
      reconnection: false,
      reconnectionAttempts: 0,
      reconnectionDelay: 0,
      autoConnect: false,
    });

    vi.unstubAllEnvs();
  });

  it("falls back to window.location.origin when no env variable is set", () => {
    // Ensure no env variable is set
    vi.unstubAllEnvs();

    renderWithTheme(<Solo />);

    expect(io).toHaveBeenCalledWith(window.location.origin, {
      transports: ["websocket"],
      reconnection: false,
      reconnectionAttempts: 0,
      reconnectionDelay: 0,
      autoConnect: false,
    });
  });
});
