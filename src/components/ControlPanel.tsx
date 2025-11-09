import React, { useState, useEffect } from "react";
import { getSoundManager } from "./SoundManager";

interface ControlPanelProps {
  onToggleChat?: () => void;
  isChatVisible?: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onToggleChat,
  isChatVisible = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check initial mute state
  useEffect(() => {
    try {
      const soundMgr = getSoundManager();
      if (soundMgr) {
        setIsMuted(soundMgr.getIsMuted());
      }
    } catch {
      // Sound manager not ready yet
    }
  }, []);

  const handleToggleMute = () => {
    try {
      const soundMgr = getSoundManager();
      if (soundMgr) {
        soundMgr.toggleMute();
        setIsMuted(soundMgr.getIsMuted());
      }
    } catch (error) {
      console.warn("Sound manager not ready:", error);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile ? "10px" : "10px",
        right: "10px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: "8px",
        zIndex: 10001, // Above QualitySettings (9998), below joysticks (10000)
      }}
    >
      {/* Mute Button */}
      <button
        onClick={handleToggleMute}
        style={{
          width: isMobile ? "40px" : "44px",
          height: isMobile ? "40px" : "44px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          border: `2px solid ${isMuted ? "#ff6464" : "#64ff64"}`,
          borderRadius: "50%",
          color: "white",
          cursor: "pointer",
          fontSize: isMobile ? "18px" : "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>

      {/* Chat Button */}
      {onToggleChat && (
        <button
          onClick={onToggleChat}
          style={{
            width: isMobile ? "40px" : "44px",
            height: isMobile ? "40px" : "44px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: `2px solid ${isChatVisible ? "#4a90e2" : "#888"}`,
            borderRadius: "50%",
            color: "white",
            cursor: "pointer",
            fontSize: isMobile ? "18px" : "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          title={isChatVisible ? "Hide Chat" : "Show Chat"}
        >
          💬
        </button>
      )}
    </div>
  );
};

export default ControlPanel;
