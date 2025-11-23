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
      const updated = [...prev, message];
      // Keep only last MAX_CHAT_MESSAGES
      if (updated.length > MAX_CHAT_MESSAGES) {
        return updated.slice(-MAX_CHAT_MESSAGES);
      }
      return updated;
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
