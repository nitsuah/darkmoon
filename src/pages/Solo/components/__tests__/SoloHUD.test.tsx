import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SoloHUD from "../SoloHUD";

vi.mock("../../../../components/Tutorial", () => ({
  default: () => <div>Tutorial</div>,
}));
vi.mock("../../../../components/HelpModal", () => ({
  default: () => <div>Help</div>,
}));
vi.mock("../../../../components/PerformanceMonitor", () => ({
  default: ({
    onPerformanceChange,
  }: {
    onPerformanceChange: (fps: number) => void;
  }) => <button onClick={() => onPerformanceChange(58)}>Perf</button>,
}));
vi.mock("../../../../components/PauseMenu", () => ({
  default: ({
    isVisible,
    onResume,
  }: {
    isVisible: boolean;
    onResume: () => void;
  }) => (isVisible ? <button onClick={onResume}>Resume</button> : null),
}));
vi.mock("../../../../components/ChatBox", () => ({
  default: ({ onSendMessage }: { onSendMessage: (m: string) => void }) => (
    <button onClick={() => onSendMessage("hi")}>Send</button>
  ),
}));
vi.mock("../../../../components/UtilityMenu", () => ({
  default: ({ onToggleChat }: { onToggleChat: () => void }) => (
    <button onClick={onToggleChat}>ToggleChat</button>
  ),
}));
vi.mock("../../../../components/GameUI", () => ({
  default: ({
    onStartGame,
    onEndGame,
    onToggleDebug,
  }: {
    onStartGame: () => void;
    onEndGame: () => void;
    onToggleDebug?: () => void;
  }) => (
    <div>
      <button onClick={onStartGame}>Start</button>
      <button onClick={onEndGame}>End</button>
      <button onClick={onToggleDebug}>Debug</button>
    </div>
  ),
}));
vi.mock("../../../../components/MobileControls", () => ({
  MobileControls: ({
    onJoystickMove,
    onJumpPress,
    onJumpRelease,
    onJumpDoubleTap,
  }: {
    onJoystickMove: (x: number, y: number) => void;
    onJumpPress: () => void;
    onJumpRelease: () => void;
    onJumpDoubleTap: () => void;
  }) => (
    <div>
      <button onClick={() => onJoystickMove(1, -1)}>Joy</button>
      <button onClick={onJumpPress}>JumpPress</button>
      <button onClick={onJumpRelease}>JumpRelease</button>
      <button onClick={onJumpDoubleTap}>JumpDouble</button>
    </div>
  ),
}));

const baseProps: React.ComponentProps<typeof SoloHUD> = {
  isMobileDevice: true,
  onJoystickMove: vi.fn(),
  onJumpPress: vi.fn(),
  onJumpRelease: vi.fn(),
  onJumpDoubleTap: vi.fn(),
  onSprintPress: vi.fn(),
  onSprintRelease: vi.fn(),
  gameState: { mode: "none", isActive: false, timeRemaining: 0, scores: {} },
  players: new Map(),
  currentPlayerId: "p1",
  onStartGame: vi.fn(),
  onEndGame: vi.fn(),
  botDebugMode: false,
  onToggleDebug: vi.fn(),
  notifications: [{ id: "n1", message: "Hello", type: "info" }],
  currentFPS: 60,
  setQuality: vi.fn(),
  isPaused: true,
  onResume: vi.fn(),
  onRestart: vi.fn(),
  onQuit: vi.fn(),
  chatVisible: false,
  setChatVisible: vi.fn(),
  chatMessages: [],
  onSendMessage: vi.fn(),
};

describe("SoloHUD", () => {
  it("renders overlays and wires interactions", () => {
    render(<SoloHUD {...baseProps} />);

    expect(screen.getByText("Tutorial")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Start"));
    fireEvent.click(screen.getByText("End"));
    fireEvent.click(screen.getByText("Debug"));
    fireEvent.click(screen.getByText("ToggleChat"));
    fireEvent.click(screen.getByText("Resume"));
    fireEvent.click(screen.getByText("Send"));

    expect(baseProps.onStartGame).toHaveBeenCalled();
    expect(baseProps.onEndGame).toHaveBeenCalled();
    expect(baseProps.onToggleDebug).toHaveBeenCalled();
    expect(baseProps.onResume).toHaveBeenCalled();
    expect(baseProps.onSendMessage).toHaveBeenCalledWith("hi");
  });

  it("renders without mobile controls when not mobile", () => {
    render(<SoloHUD {...baseProps} isMobileDevice={false} />);
    expect(screen.queryByText("Joy")).toBeNull();
  });
});
