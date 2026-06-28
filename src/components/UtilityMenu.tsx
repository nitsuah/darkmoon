import React, { useState, useEffect } from "react";
import { getSoundManager } from "./SoundManager";
import { QualityLevel } from "./QualitySettings";
import { useTheme } from "../contexts/ThemeContext";
import { createLogger } from "../lib/utils/logger";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";

const log = createLogger("UtilityMenu");

interface UtilityMenuProps {
  onToggleChat?: () => void;
  isChatVisible?: boolean;
  currentFPS?: number;
  onQualityChange?: (quality: QualityLevel) => void;
}

const UtilityMenu: React.FC<UtilityMenuProps> = ({
  onToggleChat,
  isChatVisible = false,
  currentFPS = 60,
  onQualityChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight,
  );
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
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
      log.warn("Sound manager not ready:", error);
    }
  };

  const handleQualityChange = (level: QualityLevel) => {
    onQualityChange?.(level);
    setShowQualityMenu(false);
    setIsExpanded(false);
  };

  // Use minimal sizing on mobile landscape
  const isMinimal = isMobile && isLandscape;
  const mainButtonSize = isMinimal ? 44 : isMobile ? 52 : 60;
  const drawerButtonSize = isMinimal ? 36 : isMobile ? 44 : 50;

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMinimal ? "12px" : "20px",
        right: isMinimal ? "12px" : "20px",
        zIndex: 10002,
      }}
    >
      {/* Quality settings dropdown - shown above drawer when active */}
      {showQualityMenu && (
        <div
          style={{
            position: "absolute",
            bottom: isMinimal ? "50px" : "70px",
            right: isMinimal ? "50px" : "70px",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: isMinimal ? "6px" : "8px",
            minWidth: isMinimal ? "100px" : "140px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: isMinimal ? "9px" : "11px",
              color: "#888",
              marginBottom: "6px",
              textAlign: "center",
            }}
          >
            FPS: {currentFPS.toFixed(0)}
          </div>
          {(["auto", "high", "medium", "low"] as QualityLevel[]).map(
            (level) => (
              <button
                key={level}
                onClick={() => handleQualityChange(level)}
                style={{
                  width: "100%",
                  padding: isMinimal ? "6px" : "8px",
                  marginBottom: "4px",
                  backgroundColor: "rgba(74, 144, 226, 0.3)",
                  border: "1px solid rgba(74, 144, 226, 0.5)",
                  borderRadius: "4px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: isMinimal ? "10px" : "12px",
                  textTransform: "capitalize",
                }}
              >
                {level === "auto" ? "Auto (Recommended)" : level}
              </button>
            ),
          )}
        </div>
      )}

      {/* Slide-out drawer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: isMinimal ? "6px" : "8px",
          transition: "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        }}
      >
        {/* Drawer buttons - slide in from right */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: isMinimal ? "6px" : "8px",
            transform: isExpanded
              ? "translateX(0)"
              : `translateX(${
                  (drawerButtonSize + (isMinimal ? 6 : 8)) * 4 + mainButtonSize
                }px)`,
            opacity: isExpanded ? 1 : 0,
            transition: "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        >
          <Button
            onClick={() => {
              toggleTheme();
              setIsExpanded(false);
            }}
            className="round-btn"
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            style={{
              width: `${drawerButtonSize}px`,
              height: `${drawerButtonSize}px`,
              fontSize: isMinimal ? "16px" : "20px",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </Button>

          {/* Mute Button */}
          <Button
            onClick={() => {
              handleToggleMute();
              setIsExpanded(false);
            }}
            className="round-btn"
            title={isMuted ? "Unmute" : "Mute"}
            style={{
              width: `${drawerButtonSize}px`,
              height: `${drawerButtonSize}px`,
              fontSize: isMinimal ? "16px" : "20px",
              border: `2px solid ${isMuted ? "#ff6464" : "#64ff64"}`,
            }}
          >
            {isMuted ? "🔇" : "🔊"}
          </Button>

          {/* Quality/Settings Button */}
          <Button
            onClick={() => {
              setShowQualityMenu(!showQualityMenu);
            }}
            className="round-btn"
            title="Quality Settings"
            style={{
              width: `${drawerButtonSize}px`,
              height: `${drawerButtonSize}px`,
              fontSize: isMinimal ? "16px" : "20px",
              backgroundColor: showQualityMenu
                ? "rgba(102, 126, 234, 0.7)"
                : "rgba(0, 0, 0, 0.85)",
            }}
          >
            ⚙️
          </Button>

          {/* Chat Button */}
          {onToggleChat && (
            <Button
              onClick={() => {
                onToggleChat();
                setIsExpanded(false);
              }}
              className="round-btn"
              title="Show Chat"
              style={{
                width: `${drawerButtonSize}px`,
                height: `${drawerButtonSize}px`,
                fontSize: isMinimal ? "16px" : "20px",
                border: `2px solid ${
                  isChatVisible ? "#4a90e2" : "rgba(255, 255, 255, 0.3)"
                }`,
              }}
            >
              💬
            </Button>
          )}
        </div>

        {/* Main toggle button */}
        <Button
          onClick={() => {
            setIsExpanded(!isExpanded);
            setShowQualityMenu(false);
          }}
          className="round-btn"
          title="Open Utilities"
          style={{
            width: `${mainButtonSize}px`,
            height: `${mainButtonSize}px`,
            fontSize: isMinimal ? "20px" : isMobile ? "24px" : "28px",
            boxShadow: isExpanded
              ? "0 0 20px rgba(102, 126, 234, 0.6)"
              : "0 4px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {isExpanded ? "✕" : "☰"}
        </Button>
      </div>
    </div>
  );
};

export default UtilityMenu;
