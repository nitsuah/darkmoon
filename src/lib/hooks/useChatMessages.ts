import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

const MAX_CHAT_MESSAGES = 50;

/**
 * Hook for managing chat messages
 * Maintains message history with a maximum limit
 */
export const useChatMessages = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatVisible, setChatVisible] = useState(false);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => {
      // Only allocate/slice when at capacity
      if (prev.length >= MAX_CHAT_MESSAGES) {
        return [...prev.slice(-(MAX_CHAT_MESSAGES - 1)), message];
      }
      return [...prev, message];
    });
  }, []);

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    chatMessages,
    chatVisible,
    setChatVisible,
    addChatMessage,
    clearChatMessages,
  };
};
