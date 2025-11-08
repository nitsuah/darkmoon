import * as React from "react";
import { GameState, Player } from "./GameManager";

interface GameUIProps {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
  onStartGame: (mode: string) => void;
  onEndGame: () => void;
  botDebugMode?: boolean;
  onToggleDebug?: () => void;
}

const GameUI: React.FC<GameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  onStartGame,
  onEndGame,
  botDebugMode = false,
  onToggleDebug,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const currentPlayer = players.get(currentPlayerId);
  const itPlayer =
    gameState.mode === "tag" ? players.get(gameState.itPlayerId || "") : null;

  // Main game status display (always visible during active game)
  if (gameState.isActive) {
    return (
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "120px", // Moved further right to avoid FPS counter (which is at right: 10px)
          padding: "8px 12px",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "6px",
          color: "white",
          fontFamily: "monospace",
          fontSize: "12px",
          zIndex: 1000,
          minWidth: "180px",
          textAlign: "left",
        }}
      >
        <div
          style={{ marginBottom: "6px", fontSize: "13px", fontWeight: "bold" }}
        >
          {gameState.mode.toUpperCase()} GAME
        </div>

        <div style={{ marginBottom: "6px", fontSize: "11px" }}>
          ⏱️ {formatTime(gameState.timeRemaining)}
        </div>

        {gameState.mode === "tag" && (
          <>
            <div
              style={{
                marginBottom: "6px",
                padding: "4px 8px",
                backgroundColor: currentPlayer?.isIt
                  ? "rgba(255, 100, 100, 0.3)"
                  : "rgba(100, 255, 100, 0.3)",
                borderRadius: "3px",
                border: currentPlayer?.isIt
                  ? "1px solid #ff6464"
                  : "1px solid #64ff64",
                fontSize: "11px",
              }}
            >
              {currentPlayer?.isIt
                ? "🏃 YOU ARE IT!"
                : `${itPlayer?.name || "Someone"} is IT`}
            </div>

            {currentPlayer?.isIt && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#ffff64",
                  marginBottom: "4px",
                }}
              >
                Tag someone!
              </div>
            )}
          </>
        )}

        <button
          onClick={onEndGame}
          style={{
            marginTop: "4px",
            padding: "3px 6px",
            backgroundColor: "rgba(255, 100, 100, 0.8)",
            border: "1px solid #ff6464",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            fontSize: "10px",
            width: "100%",
          }}
        >
          End Game
        </button>

        {/* Debug mode toggle - always available */}
        {onToggleDebug && (
          <button
            onClick={onToggleDebug}
            style={{
              marginTop: "4px",
              padding: "3px 6px",
              backgroundColor: botDebugMode
                ? "rgba(220, 53, 69, 0.8)"
                : "rgba(255, 140, 0, 0.8)",
              border: botDebugMode ? "1px solid #dc3545" : "1px solid #ff8c00",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: "10px",
              width: "100%",
            }}
          >
            {botDebugMode ? "⏹️ Stop Debug" : "🔧 Debug Mode"}
          </button>
        )}
      </div>
    );
  }

  // Game lobby/start screen
  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px", // Top-right corner (FPS counter moved to bottom-right)
        padding: "10px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: "6px",
        color: "white",
        fontFamily: "monospace",
        fontSize: "11px",
        zIndex: 1000,
        minWidth: "160px",
      }}
    >
      <div
        style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}
      >
        🎮 Game Modes
      </div>

      <div style={{ marginBottom: "6px", color: "#aaa", fontSize: "10px" }}>
        Players: {players.size}
      </div>

      {/* Always show game controls in solo mode (players.size 0-1) or multiplayer (2+) */}
      {players.size >= 2 || players.size <= 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <button
            onClick={() => onStartGame(players.size <= 1 ? "solo" : "tag")}
            style={{
              padding: "6px 10px",
              backgroundColor: "rgba(74, 144, 226, 0.8)",
              border: "1px solid #4a90e2",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: "11px",
              width: "100%",
            }}
          >
            Start Tag {players.size <= 1 ? "(Practice)" : ""}
          </button>

          <button
            onClick={() => onToggleDebug && onToggleDebug()}
            style={{
              padding: "6px 10px",
              backgroundColor: botDebugMode
                ? "rgba(220, 53, 69, 0.8)"
                : "rgba(255, 140, 0, 0.8)",
              border: botDebugMode ? "1px solid #dc3545" : "1px solid #ff8c00",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: "11px",
              width: "100%",
            }}
          >
            {botDebugMode ? "⏹️ Stop Debug" : "🔧 Start Debug"}
          </button>

          <div style={{ fontSize: "9px", color: "#888", textAlign: "center" }}>
            {players.size <= 1 ? "Practice vs Bot" : "3 min • Tag to pass"}
          </div>
        </div>
      ) : (
        <div style={{ color: "#888", textAlign: "center", fontSize: "10px" }}>
          Need 2+ players
        </div>
      )}
    </div>
  );
};

export default GameUI;
