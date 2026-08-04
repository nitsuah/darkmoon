import * as React from "react";
import { Player } from "../../GameManager";

interface Props {
  players: Map<string, Player>;
  isMinimal: boolean;
  isMobile: boolean;
  botDebugMode: boolean;
  galleryDebugMode: boolean;
  onStartGame: (mode: string) => void;
  onToggleDebug?: () => void;
  onToggleGalleryDebug?: () => void;
}

function btnPad(isMinimal: boolean, isMobile: boolean) {
  return isMinimal ? "3px 5px" : isMobile ? "6px 8px" : "6px 10px";
}

function btnFontSize(isMinimal: boolean, isMobile: boolean) {
  return isMinimal ? "14px" : isMobile ? "14px" : "11px";
}

const GameLobbyPanel: React.FC<Props> = ({
  players,
  isMinimal,
  isMobile,
  botDebugMode,
  galleryDebugMode,
  onStartGame,
  onToggleDebug,
  onToggleGalleryDebug,
}) => {
  const btnBase: React.CSSProperties = {
    borderRadius: "3px",
    color: "white",
    cursor: "pointer",
    width: "100%",
    padding: btnPad(isMinimal, isMobile),
    fontSize: btnFontSize(isMinimal, isMobile),
  };

  return (
    <div
      style={{
        position: "fixed",
        top: isMinimal ? "8px" : "10px",
        right: isMinimal ? "8px" : "10px",
        padding: isMinimal ? "3px 5px" : isMobile ? "6px 8px" : "10px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: isMinimal ? "3px" : "6px",
        color: "white",
        fontFamily: "monospace",
        fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
        zIndex: 1000,
        minWidth: isMinimal ? "auto" : isMobile ? "auto" : "160px",
        maxWidth: isMinimal ? "70px" : "auto",
        textAlign: "center",
      }}
    >
      {!isMobile && !isMinimal && (
        <div
          style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}
        >
          🎮 Game Modes
        </div>
      )}

      {!isMinimal && (
        <div
          style={{
            marginBottom: "6px",
            color: "#aaa",
            fontSize: isMobile ? "9px" : "10px",
          }}
        >
          {isMobile ? `👥 ${players.size}` : `Players: ${players.size}`}
        </div>
      )}

      {players.size >= 2 || players.size <= 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMinimal ? "2px" : "6px",
          }}
        >
          <button
            onClick={() => onStartGame("shooting_gallery")}
            style={{
              ...btnBase,
              backgroundColor: "rgba(255, 200, 0, 0.85)",
              border: "1px solid #ffd700",
              color: "#111",
              fontWeight: "bold",
            }}
          >
            {isMinimal || isMobile ? "🎯" : "🎯 Shooting Gallery"}
          </button>

          <button
            onClick={() => onStartGame(players.size <= 1 ? "solo" : "tag")}
            style={{
              ...btnBase,
              backgroundColor: "rgba(74, 144, 226, 0.8)",
              border: "1px solid #4a90e2",
            }}
          >
            {isMinimal || isMobile
              ? "▶️"
              : `Start Tag ${players.size <= 1 ? "(Practice)" : ""}`}
          </button>

          {players.size >= 2 && (
            <button
              onClick={() => onStartGame("deathmatch")}
              style={{
                ...btnBase,
                backgroundColor: "rgba(220, 53, 69, 0.8)",
                border: "1px solid #dc3545",
              }}
            >
              {isMinimal || isMobile ? "🔫" : "Start Deathmatch"}
            </button>
          )}

          {players.size >= 2 && (
            <button
              onClick={() => onStartGame("ctf")}
              style={{
                ...btnBase,
                backgroundColor: "rgba(155, 89, 182, 0.8)",
                border: "1px solid #9b59b6",
              }}
            >
              {isMinimal || isMobile ? "🚩" : "Start CTF"}
            </button>
          )}

          <button
            onClick={() => onToggleDebug && onToggleDebug()}
            style={{
              ...btnBase,
              backgroundColor: botDebugMode
                ? "rgba(220, 53, 69, 0.8)"
                : "rgba(255, 140, 0, 0.8)",
              border: botDebugMode ? "1px solid #dc3545" : "1px solid #ff8c00",
            }}
          >
            {isMinimal || isMobile
              ? "🔧"
              : botDebugMode
                ? "⏹️ Stop Debug"
                : "🔧 Start Debug"}
          </button>

          {onToggleGalleryDebug && (
            <button
              onClick={onToggleGalleryDebug}
              style={{
                ...btnBase,
                marginTop: "3px",
                backgroundColor: galleryDebugMode
                  ? "rgba(220, 53, 69, 0.8)"
                  : "rgba(0, 170, 100, 0.8)",
                border: galleryDebugMode
                  ? "1px solid #dc3545"
                  : "1px solid #00aa64",
              }}
            >
              {isMinimal || isMobile
                ? "🎯"
                : galleryDebugMode
                  ? "⏹️ Stop Gallery Debug"
                  : "🎯 Gallery Debug"}
            </button>
          )}

          {!isMobile && !isMinimal && (
            <div
              style={{ fontSize: "9px", color: "#888", textAlign: "center" }}
            >
              {players.size <= 1 ? "Practice vs Bot" : "3 min • Tag to pass"}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            color: "#888",
            textAlign: "center",
            fontSize: isMinimal ? "8px" : isMobile ? "9px" : "10px",
          }}
        >
          {isMinimal || isMobile ? "Need 2+" : "Need 2+ players"}
        </div>
      )}
    </div>
  );
};

export default GameLobbyPanel;
