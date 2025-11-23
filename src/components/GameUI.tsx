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
  // Detect mobile viewport and landscape orientation
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  const [isLandscape, setIsLandscape] = React.useState(
    window.innerWidth > window.innerHeight
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use ultra-minimal mode on mobile landscape
  const isMinimal = isMobile && isLandscape;

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
          top: isMinimal ? "8px" : "10px",
          right: isMinimal ? "8px" : isMobile ? "10px" : "120px",
          padding: isMinimal ? "3px 5px" : isMobile ? "6px 8px" : "8px 12px",
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: isMinimal ? "3px" : "6px",
          color: "white",
          fontFamily: "monospace",
          fontSize: isMinimal ? "8px" : isMobile ? "10px" : "12px",
          zIndex: 1000,
          minWidth: isMinimal ? "auto" : isMobile ? "auto" : "180px",
          maxWidth: isMinimal ? "80px" : "auto",
          textAlign: "center",
        }}
      >
        {/* Hide game mode text on minimal - just show timer */}
        {!isMinimal && (
          <div
            style={{
              marginBottom: "6px",
              fontSize: isMobile ? "11px" : "13px",
              fontWeight: "bold",
            }}
          >
            {isMobile
              ? gameState.mode.toUpperCase().substring(0, 3)
              : `${gameState.mode.toUpperCase()} GAME`}
          </div>
        )}

        <div
          style={{
            marginBottom: isMinimal ? "2px" : "6px",
            fontSize: isMinimal ? "13px" : isMobile ? "10px" : "11px",
            fontWeight: isMinimal ? "bold" : "normal",
          }}
        >
          ⏱️ {formatTime(gameState.timeRemaining)}
        </div>

        {gameState.mode === "tag" && (
          <>
            <div
              style={{
                marginBottom: isMinimal ? "2px" : "6px",
                padding: isMinimal ? "2px 3px" : "4px 8px",
                backgroundColor: currentPlayer?.isIt
                  ? "rgba(255, 100, 100, 0.3)"
                  : "rgba(100, 255, 100, 0.3)",
                borderRadius: "3px",
                border: currentPlayer?.isIt
                  ? "1px solid #ff6464"
                  : "1px solid #64ff64",
                fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
              }}
            >
              {isMinimal || isMobile
                ? currentPlayer?.isIt
                  ? "🏃 IT!"
                  : `${itPlayer?.name?.substring(0, 6) || "?"}`
                : currentPlayer?.isIt
                ? "🏃 YOU ARE IT!"
                : `${itPlayer?.name || "Someone"} is IT`}
            </div>

            {currentPlayer?.isIt && !isMobile && !isMinimal && (
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
            marginTop: isMinimal ? "2px" : "4px",
            padding: isMinimal ? "2px 4px" : isMobile ? "3px 6px" : "3px 6px",
            backgroundColor: "rgba(255, 100, 100, 0.8)",
            border: "1px solid #ff6464",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            fontSize: isMinimal ? "10px" : isMobile ? "9px" : "10px",
            width: "100%",
          }}
        >
          {isMinimal || isMobile ? "⏹️" : "End Game"}
        </button>

        {/* Debug mode toggle - always available */}
        {onToggleDebug && (
          <button
            onClick={onToggleDebug}
            style={{
              marginTop: isMinimal ? "2px" : "4px",
              padding: isMinimal ? "2px 4px" : isMobile ? "3px 6px" : "3px 6px",
              backgroundColor: botDebugMode
                ? "rgba(220, 53, 69, 0.8)"
                : "rgba(255, 140, 0, 0.8)",
              border: botDebugMode ? "1px solid #dc3545" : "1px solid #ff8c00",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: isMinimal ? "10px" : isMobile ? "9px" : "10px",
              width: "100%",
            }}
          >
            {isMinimal || isMobile
              ? "🔧"
              : botDebugMode
              ? "⏹️ Stop Debug"
              : "🔧 Debug Mode"}
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

      {/* Hide player count on minimal */}
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

      {/* Always show game controls in solo mode (players.size 0-1) or multiplayer (2+) */}
      {players.size >= 2 || players.size <= 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMinimal ? "2px" : "6px",
          }}
        >
          <button
            onClick={() => onStartGame(players.size <= 1 ? "solo" : "tag")}
            style={{
              padding: isMinimal
                ? "3px 5px"
                : isMobile
                ? "6px 8px"
                : "6px 10px",
              backgroundColor: "rgba(74, 144, 226, 0.8)",
              border: "1px solid #4a90e2",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: isMinimal ? "14px" : isMobile ? "14px" : "11px",
              width: "100%",
            }}
          >
            {isMinimal || isMobile
              ? "▶️"
              : `Start Tag ${players.size <= 1 ? "(Practice)" : ""}`}
          </button>

          <button
            onClick={() => onToggleDebug && onToggleDebug()}
            style={{
              padding: isMinimal
                ? "3px 5px"
                : isMobile
                ? "6px 8px"
                : "6px 10px",
              backgroundColor: botDebugMode
                ? "rgba(220, 53, 69, 0.8)"
                : "rgba(255, 140, 0, 0.8)",
              border: botDebugMode ? "1px solid #dc3545" : "1px solid #ff8c00",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: isMinimal ? "14px" : isMobile ? "14px" : "11px",
              width: "100%",
            }}
          >
            {isMinimal || isMobile
              ? "🔧"
              : botDebugMode
              ? "⏹️ Stop Debug"
              : "🔧 Start Debug"}
          </button>

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

export default GameUI;
