import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ControlPanel from "../ControlPanel";

const soundManager = {
  getIsMuted: vi.fn(() => false),
  toggleMute: vi.fn(),
};

vi.mock("../SoundManager", () => ({
  getSoundManager: () => soundManager,
}));

describe("ControlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mute and optional chat buttons", () => {
    const onToggleChat = vi.fn();
    render(<ControlPanel onToggleChat={onToggleChat} isChatVisible={false} />);

    fireEvent.click(screen.getByTitle("Mute"));
    expect(soundManager.toggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Show Chat"));
    expect(onToggleChat).toHaveBeenCalled();
  });

  it("handles missing chat callback", () => {
    render(<ControlPanel />);
    expect(screen.getByTitle("Mute")).toBeInTheDocument();
    expect(screen.queryByTitle("Show Chat")).toBeNull();
  });
});
