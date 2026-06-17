import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { expect, describe, it, vi, beforeEach } from "vitest";
import Lobby from "../pages/Lobby";
import { BrowserRouter } from "react-router-dom";

const socketHandlers: Record<string, (payload: unknown) => void> = {};
const mockSocket = {
  id: "self-id",
  emit: vi.fn(),
  on: vi.fn((event: string, handler: (payload: unknown) => void) => {
    socketHandlers[event] = handler;
  }),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
}));

vi.mock("@react-three/drei", () => {
  const OrbitControls = React.forwardRef((_props, ref) => {
    const controls = {
      object: {
        position: { toArray: (arr: number[]) => arr.push(1, 2, 3) },
        rotation: { toArray: (arr: number[]) => arr.push(0.1, 0.2, 0.3) },
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    if (typeof ref === "function") ref(controls);
    return <div data-testid="orbit-controls" />;
  });
  OrbitControls.displayName = "MockOrbitControls";

  return {
    OrbitControls,
    Text: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    Billboard: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    Stats: () => <div data-testid="stats" />,
  };
});

describe("Lobby Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((k) => delete socketHandlers[k]);
  });

  it("connects socket and renders scene shell", async () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    expect(await screen.findByTestId("canvas-mock")).toBeInTheDocument();
    expect(mockSocket.on).toHaveBeenCalledWith("move", expect.any(Function));
  });

  it("renders remote clients and ignores own socket id", async () => {
    render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(socketHandlers.move).toBeTypeOf("function");
    });

    act(() => {
      socketHandlers.move({
        "self-id": {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
        "peer-1": {
          position: [1, 2, 3],
          rotation: [0.1, 0.2, 0.3],
        },
      });
    });

    expect(await screen.findByText("peer-1")).toBeInTheDocument();
    expect(screen.queryByText("self-id")).toBeNull();
  });

  it("disconnects socket on unmount", () => {
    const { unmount } = render(
      <BrowserRouter>
        <Lobby />
      </BrowserRouter>,
    );

    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
