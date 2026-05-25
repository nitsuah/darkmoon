import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatBox from "../ChatBox";

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

const messages = [
  {
    id: "m1",
    playerId: "p1",
    playerName: "Player 1",
    message: "hello there",
    timestamp: Date.now(),
  },
];

describe("ChatBox", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <ChatBox
        isVisible={false}
        onToggle={vi.fn()}
        messages={[]}
        onSendMessage={vi.fn()}
        currentPlayerId="p1"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows empty state when visible with no messages", () => {
    render(
      <ChatBox
        isVisible
        onToggle={vi.fn()}
        messages={[]}
        onSendMessage={vi.fn()}
        currentPlayerId="p1"
      />,
    );

    expect(screen.getByText("No messages yet. Say hello!")).toBeInTheDocument();
  });

  it("sends trimmed message on submit and on Enter", () => {
    const onSend = vi.fn();

    render(
      <ChatBox
        isVisible
        onToggle={vi.fn()}
        messages={messages}
        onSendMessage={onSend}
        currentPlayerId="p1"
      />,
    );

    const input = screen.getByPlaceholderText(
      "Type a message... (Enter to send, Esc to close)",
    );

    fireEvent.change(input, { target: { value: "  hi  " } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith("hi");

    fireEvent.change(input, { target: { value: "from-enter" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("from-enter");
  });

  it("clears input and toggles on Escape", () => {
    const onToggle = vi.fn();

    render(
      <ChatBox
        isVisible
        onToggle={onToggle}
        messages={messages}
        onSendMessage={vi.fn()}
        currentPlayerId="p1"
      />,
    );

    const input = screen.getByPlaceholderText(
      "Type a message... (Enter to send, Esc to close)",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "to-clear" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input.value).toBe("");
    expect(onToggle).toHaveBeenCalled();
  });
});
