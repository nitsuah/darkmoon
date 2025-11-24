import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../lib/hooks/useChatMessages";

interface ChatBoxProps {
  isVisible: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentPlayerId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  isVisible,
  onToggle,
  messages,
  onSendMessage,
  currentPlayerId,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      setInputMessage("");
      onToggle();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isVisible) {
    return null; // Chat icon in Solo.tsx handles visibility, no need for separate button
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "60px", // Below mute/chat buttons at top: 10px + ~40px height
        left: "10px",
        width: "400px",
        height: "300px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
        }}
      >
        <span>Chat</span>
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
            padding: "0",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          padding: "8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                padding: "4px 6px",
                backgroundColor:
                  msg.playerId === currentPlayerId
                    ? "rgba(74, 144, 226, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                borderRadius: "4px",
                borderLeft:
                  msg.playerId === currentPlayerId
                    ? "3px solid #4a90e2"
                    : "3px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color:
                      msg.playerId === currentPlayerId ? "#4a90e2" : "#888",
                    fontWeight: "bold",
                  }}
                >
                  {msg.playerName}
                </span>
                <span style={{ color: "#666", fontSize: "10px" }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div style={{ color: "white", wordWrap: "break-word" }}>
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} style={{ padding: "8px" }}>
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Esc to close)"
          maxLength={200}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            color: "white",
            fontSize: "12px",
            fontFamily: "monospace",
            outline: "none",
          }}
        />
        <div
          style={{
            marginTop: "4px",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "10px",
            textAlign: "right",
          }}
        >
          {inputMessage.length}/200
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
