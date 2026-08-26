import * as React from "react";
import { Player, StartableMode } from "../../GameManager";

interface Props {
  players: Map<string, Player>;
  isMinimal: boolean;
  isMobile: boolean;
  botDebugMode: boolean;
  galleryDebugMode: boolean;
  onStartGame: (mode: StartableMode) => void;
  onToggleDebug?: () => void;
  onToggleGalleryDebug?: () => void;
  onMainMenu: () => void;
}

const btn = (
  bg: string,
  border: string,
  mobile: boolean = false,
): React.CSSProperties => ({
  width: "100%",
  padding: mobile ? "10px 8px" : "6px 8px",
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: mobile ? "6px" : "3px",
  color: "white",
  fontFamily: "monospace",
  fontSize: mobile ? "13px" : "11px",
  cursor: "pointer",
  textAlign: "center",
  userSelect: "none",
  minHeight: mobile ? "44px" : undefined,
});

const GameLobbyPanel: React.FC<Props> = ({
  players,
  isMinimal,
  isMobile,
  botDebugMode,
  galleryDebugMode,
  onStartGame,
  onToggleDebug,
  onToggleGalleryDebug,
  onMainMenu,
}) => {
  const panelWidth = isMinimal ? 70 : isMobile ? 160 : 170;

  return (
    <div
      style={{
        position: "fixed",
        top: isMinimal ? "8px" : "10px",
        left: isMinimal ? "8px" : "10px",
        width: panelWidth,
        padding: isMinimal ? "3px 5px" : "8px 10px",
        backgroundColor: "rgba(0,0,0,0.88)",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: isMinimal ? "3px" : "6px",
        color: "white",
        fontFamily: "monospace",
        fontSize: isMinimal ? "8px" : "11px",
        zIndex: 1000,
        boxSizing: "border-box",
      }}
    >
      {!isMinimal && (
        <div
          style={{
            marginBottom: "6px",
            fontSize: "12px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          🎮 Game Modes
        </div>
      )}
      {!isMinimal && (
        <div
          style={{
            marginBottom: "6px",
            color: "#aaa",
            fontSize: "9px",
            textAlign: "center",
          }}
        >
          {players.size === 1 ? "1 player (vs Bot)" : `${players.size} players`}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={() => onStartGame("shooting_gallery")}
          style={btn("rgba(200,160,0,0.85)", "#ffd700", isMobile)}
        >
          {isMinimal ? "🎯" : "🎯 Shooting Gallery"}
        </button>

        <button
          onClick={() => onStartGame("tag")}
          style={btn("rgba(55,120,200,0.8)", "#4a90e2", isMobile)}
        >
          {isMinimal ? "▶️" : `🏃 Tag${players.size <= 1 ? " (Practice)" : ""}`}
        </button>

        {players.size >= 2 && (
          <button
            onClick={() => onStartGame("deathmatch")}
            style={btn("rgba(180,40,40,0.8)", "#dc3545", isMobile)}
          >
            {isMinimal ? "🔫" : "💀 Deathmatch"}
          </button>
        )}

        {players.size >= 2 && (
          <button
            onClick={() => onStartGame("ctf")}
            style={btn("rgba(120,60,170,0.8)", "#9b59b6", isMobile)}
          >
            {isMinimal ? "🚩" : "🚩 CTF"}
          </button>
        )}

        <div
          style={{
            height: "1px",
            background: "rgba(255,255,255,0.12)",
            margin: "2px 0",
          }}
        />

        <button
          onClick={onMainMenu}
          style={btn("rgba(50,50,80,0.85)", "#555", isMobile)}
        >
          {isMinimal ? "🏠" : "🏠 Main Menu"}
        </button>

        {onToggleDebug && (
          <button
            onClick={onToggleDebug}
            style={btn(
              botDebugMode ? "rgba(180,30,30,0.8)" : "rgba(200,120,0,0.8)",
              botDebugMode ? "#dc3545" : "#ff8c00",
              isMobile,
            )}
          >
            {isMinimal ? "🔧" : botDebugMode ? "⏹ Debug OFF" : "🔧 Debug Mode"}
          </button>
        )}

        {onToggleGalleryDebug && (
          <button
            onClick={onToggleGalleryDebug}
            style={btn(
              galleryDebugMode ? "rgba(180,30,30,0.8)" : "rgba(0,140,80,0.8)",
              galleryDebugMode ? "#dc3545" : "#00aa64",
              isMobile,
            )}
          >
            {isMinimal
              ? "🎯"
              : galleryDebugMode
                ? "⏹ Gallery OFF"
                : "🎯 Gallery Debug"}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameLobbyPanel;
