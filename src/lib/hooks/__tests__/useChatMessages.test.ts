import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatMessages } from "../useChatMessages";

describe("useChatMessages", () => {
  it("adds, clears, and toggles visibility", () => {
    const { result } = renderHook(() => useChatMessages());

    expect(result.current.chatMessages).toHaveLength(0);
    expect(result.current.chatVisible).toBe(false);

    act(() => {
      result.current.setChatVisible(true);
      result.current.addChatMessage({
        id: "m1",
        playerId: "p1",
        playerName: "Player 1",
        message: "hello",
        timestamp: 1,
      });
    });

    expect(result.current.chatVisible).toBe(true);
    expect(result.current.chatMessages).toHaveLength(1);
    expect(result.current.chatMessages[0].message).toBe("hello");

    act(() => {
      result.current.clearChatMessages();
    });

    expect(result.current.chatMessages).toHaveLength(0);
  });

  it("keeps only the latest 50 messages", () => {
    const { result } = renderHook(() => useChatMessages());

    act(() => {
      for (let i = 1; i <= 55; i += 1) {
        result.current.addChatMessage({
          id: `m-${i}`,
          playerId: "p1",
          playerName: "Player 1",
          message: `msg-${i}`,
          timestamp: i,
        });
      }
    });

    expect(result.current.chatMessages).toHaveLength(50);
    expect(result.current.chatMessages[0].id).toBe("m-6");
    expect(result.current.chatMessages[49].id).toBe("m-55");
  });
});
