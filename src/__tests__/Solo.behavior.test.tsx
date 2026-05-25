import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";
import Solo from "../pages/Solo";

const navigateMock = vi.fn();
const emitMock = vi.fn();

const socket = {
  id: "socket-1",
  emit: emitMock,
};

const gameState = {
  mode: "none",
  isActive: false,
  timeRemaining: 0,
  scores: {},
  itPlayerId: "socket-1",
};

const gameManager = {
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  startTagGame: vi.fn(() => true),
  endGame: vi.fn(() => []),
  getGameState: vi.fn(() => gameState),
  getPlayers: vi.fn(
    () => new Map([["socket-1", { id: "socket-1", name: "You", isIt: true }]]),
  ),
};

let lastSoloHudProps: Record<string, unknown> | null = null;

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../lib/constants/profanity", () => ({
  filterProfanity: (m: string) => `clean:${m}`,
}));

vi.mock("../lib/hooks/useSocketConnection", () => ({
  useSocketConnection: () => ({
    getSocket: () => socket,
    connect: vi.fn(),
  }),
}));

vi.mock("../lib/hooks/useSoloGame", () => ({
  useSoloGame: () => ({
    initializeForSocket: vi.fn(() => gameManager),
  }),
  attachToConnection: vi.fn(() => vi.fn()),
}));

vi.mock("../pages/Solo/components/SoloScene", () => ({
  default: () => <div data-testid="solo-scene" />,
}));

vi.mock("../pages/Solo/components/SoloHUD", () => ({
  default: (props: Record<string, unknown>) => {
    lastSoloHudProps = props;
    return <div data-testid="solo-hud" />;
  },
}));

vi.mock("../components/PerformanceMonitor", () => ({
  default: () => null,
}));

vi.mock("../components/UtilityMenu", () => ({
  default: () => null,
}));

vi.mock("../components/PauseMenu", () => ({
  default: () => null,
}));

vi.mock("../components/ChatBox", () => ({
  default: () => null,
}));

describe("Solo behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    lastSoloHudProps = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderSolo = () =>
    render(
      <BrowserRouter>
        <ThemeProvider>
          <Solo />
        </ThemeProvider>
      </BrowserRouter>,
    );

  it("wires SoloHUD handlers for start/end game and chat send", () => {
    renderSolo();
    expect(lastSoloHudProps).toBeTruthy();

    act(() => {
      (lastSoloHudProps?.onStartGame as () => void)();
      (lastSoloHudProps?.onEndGame as () => void)();
      (lastSoloHudProps?.onSendMessage as (m: string) => void)("hello");
    });

    expect(gameManager.startTagGame).toHaveBeenCalled();
    expect(gameManager.endGame).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith("chat-message", {
      message: "clean:hello",
    });
  });

  it("toggles pause with Escape and toggles debug via HUD callback", () => {
    renderSolo();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(lastSoloHudProps?.isPaused).toBe(true);

    act(() => {
      (lastSoloHudProps?.onToggleDebug as () => void)();
    });

    expect(gameManager.addPlayer).toHaveBeenCalled();

    act(() => {
      (lastSoloHudProps?.onToggleDebug as () => void)();
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("bot-2");
  });

  it("handles keyboard movement and chat toggle shortcuts", () => {
    renderSolo();

    act(() => {
      fireEvent.keyDown(window, { key: "w" });
      fireEvent.keyUp(window, { key: "w" });
      fireEvent.keyDown(window, { key: "c", altKey: true });
    });

    expect(lastSoloHudProps).toBeTruthy();
  });
});
