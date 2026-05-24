import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UtilityMenu from "../UtilityMenu";

const mockToggleTheme = vi.fn();
const mockSoundManager = {
  getIsMuted: vi.fn(() => false),
  toggleMute: vi.fn(),
};

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: mockToggleTheme }),
}));

vi.mock("../SoundManager", () => ({
  getSoundManager: () => mockSoundManager,
}));

describe("UtilityMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens drawer and triggers chat toggle", () => {
    const onToggleChat = vi.fn();

    render(
      <UtilityMenu
        onToggleChat={onToggleChat}
        isChatVisible={false}
        currentFPS={58}
        onQualityChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle("Open Utilities"));
    fireEvent.click(screen.getByTitle("Show Chat"));

    expect(onToggleChat).toHaveBeenCalled();
  });

  it("changes quality and toggles theme/mute", () => {
    const onQualityChange = vi.fn();

    render(<UtilityMenu onQualityChange={onQualityChange} currentFPS={60} />);

    fireEvent.click(screen.getByTitle("Open Utilities"));
    fireEvent.click(screen.getByTitle("Light Mode"));
    expect(mockToggleTheme).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Open Utilities"));
    fireEvent.click(screen.getByTitle("Mute"));
    expect(mockSoundManager.toggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Open Utilities"));
    fireEvent.click(screen.getByTitle("Quality Settings"));
    fireEvent.click(screen.getByText("Auto (Recommended)"));
    expect(onQualityChange).toHaveBeenCalledWith("auto");
  });
});
