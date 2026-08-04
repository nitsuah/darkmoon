import * as React from "react";
import { GameState } from "../../GameManager";

interface Props {
  gameState: GameState;
  currentPlayerId: string;
  isMinimal: boolean;
  autoRestartSecondsLeft: number | null;
  galleryHighScore: number;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

const GameResultsScreen: React.FC<Props> = ({
  gameState,
  currentPlayerId,
  isMinimal,
  autoRestartSecondsLeft,
  galleryHighScore,
  isNewRecord,
  onPlayAgain,
  onMainMenu,
}) => {
  const winner = gameState.gameResults![0];
  const isGallery = gameState.mode === "shooting_gallery";
  const isWinner = isGallery || winner.id === currentPlayerId;
  const scoreLabel =
    gameState.mode === "ctf"
      ? "caps"
      : gameState.mode === "tag" || isGallery
        ? "pts"
        : "kills";

  const galleryShots = gameState.galleryShots ?? 0;
  const galleryHits = gameState.galleryHits ?? 0;
  const galleryAcc =
    galleryShots > 0 ? Math.round((galleryHits / galleryShots) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgba(0,0,0,0.92)",
        border: isGallery
          ? "2px solid #ffd700"
          : "2px solid rgba(255,255,255,0.3)",
        borderRadius: "10px",
        color: "white",
        fontFamily: "monospace",
        fontSize: isMinimal ? "10px" : "13px",
        zIndex: 1001,
        minWidth: isMinimal ? "160px" : "240px",
        textAlign: "center",
        padding: isMinimal ? "10px 12px" : "20px 28px",
      }}
    >
      <div
        style={{
          fontSize: isMinimal ? "18px" : "28px",
          fontWeight: "bold",
          color: isGallery ? "#ffd700" : isWinner ? "#ffdd44" : "#ff6666",
          textShadow: isGallery
            ? "0 0 14px #ffa500"
            : isWinner
              ? "0 0 14px #ffaa00"
              : "0 0 10px #ff4444",
          marginBottom: "10px",
          letterSpacing: "2px",
        }}
      >
        {isGallery ? "GALLERY CLOSED!" : isWinner ? "VICTORY!" : "DEFEATED"}
      </div>

      {isGallery && isNewRecord && (
        <div
          style={{
            fontSize: isMinimal ? "13px" : "18px",
            color: "#ffd700",
            fontWeight: "bold",
            marginBottom: "6px",
            textShadow: "0 0 14px #ffa500",
            letterSpacing: "2px",
          }}
        >
          🏆 NEW RECORD!
        </div>
      )}

      {isGallery && !isNewRecord && galleryHighScore > 0 && (
        <div
          style={{
            fontSize: isMinimal ? "9px" : "11px",
            color: "#888",
            marginBottom: "6px",
          }}
        >
          Best: {galleryHighScore} pts
        </div>
      )}

      {isGallery && (
        <div
          style={{
            fontSize: isMinimal ? "11px" : "14px",
            color: "#aaa",
            marginBottom: "8px",
          }}
        >
          Accuracy: {galleryHits}/{galleryShots} ({galleryAcc}%)
        </div>
      )}

      <div
        style={{
          marginBottom: "12px",
          fontSize: isMinimal ? "10px" : "12px",
          color: "#aaa",
        }}
      >
        {gameState.mode.toUpperCase()} — FINAL SCORES
      </div>

      <div style={{ marginBottom: "14px" }}>
        {gameState.gameResults!.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              padding: "3px 0",
              color:
                r.id === currentPlayerId
                  ? "#ffdd44"
                  : i === 0
                    ? "#ffffff"
                    : "#aaaaaa",
              fontWeight: r.id === currentPlayerId ? "bold" : "normal",
            }}
          >
            <span>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"} {r.name}
            </span>
            <span>
              {r.score} {scoreLabel}
            </span>
          </div>
        ))}
      </div>

      {autoRestartSecondsLeft !== null && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: isMinimal ? "9px" : "11px",
            color: "#aaaaaa",
            marginBottom: "8px",
            letterSpacing: "1px",
          }}
        >
          {autoRestartSecondsLeft > 0
            ? `AUTO-RESTART IN ${autoRestartSecondsLeft}s`
            : "RESTARTING..."}
        </div>
      )}

      <button
        onClick={onPlayAgain}
        style={{
          padding: isMinimal ? "4px 8px" : "6px 14px",
          backgroundColor: "rgba(74, 144, 226, 0.85)",
          border: "1px solid #4a90e2",
          borderRadius: "4px",
          color: "white",
          cursor: "pointer",
          fontSize: isMinimal ? "10px" : "12px",
          width: "100%",
          marginBottom: "6px",
        }}
      >
        Play Again
      </button>

      <button
        onClick={onMainMenu}
        style={{
          padding: isMinimal ? "3px 6px" : "4px 10px",
          backgroundColor: "rgba(100,100,100,0.7)",
          border: "1px solid #666",
          borderRadius: "4px",
          color: "#ccc",
          cursor: "pointer",
          fontSize: isMinimal ? "9px" : "10px",
          width: "100%",
        }}
      >
        Main Menu
      </button>
    </div>
  );
};

export default GameResultsScreen;
