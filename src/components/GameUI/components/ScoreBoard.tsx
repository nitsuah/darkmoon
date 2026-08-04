import * as React from "react";
import { GameState, Player } from "../../GameManager";

interface Props {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
}

const ScoreBoard: React.FC<Props> = ({
  gameState,
  players,
  currentPlayerId,
}) => {
  const scoreLabel =
    gameState.mode === "ctf"
      ? "caps"
      : gameState.mode === "tag"
        ? "pts"
        : "kills";

  const sorted = Array.from(players.values()).sort(
    (a, b) => (gameState.scores[b.id] ?? 0) - (gameState.scores[a.id] ?? 0),
  );

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 1003,
        fontFamily: "monospace",
        backgroundColor: "rgba(0,0,0,0.88)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "8px",
        padding: "18px 28px",
        minWidth: "280px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: "bold",
          color: "#ffdd44",
          letterSpacing: "3px",
          textAlign: "center",
          marginBottom: "12px",
        }}
      >
        {gameState.mode.toUpperCase()} — SCORES
      </div>
      {sorted.map((p, i) => {
        const score = gameState.scores[p.id] ?? 0;
        const isMe = p.id === currentPlayerId;
        const isIT = p.isIt && gameState.mode === "tag";
        const isDowned = p.respawnAt !== undefined;
        const hp = p.health;
        const maxHp = p.maxHealth;
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              padding: "4px 0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              color: isMe ? "#ffdd44" : i === 0 ? "#ffffff" : "#aaaaaa",
              fontWeight: isMe ? "bold" : "normal",
            }}
          >
            <span style={{ minWidth: "20px", color: "#666" }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
            </span>
            <span style={{ flex: 1 }}>{p.name}</span>
            {gameState.mode !== "tag" &&
              hp !== undefined &&
              maxHp !== undefined && (
                <span
                  style={{
                    fontSize: "10px",
                    color:
                      hp / maxHp > 0.5
                        ? "#44ff44"
                        : hp / maxHp > 0.25
                          ? "#ffaa00"
                          : "#ff4444",
                  }}
                >
                  {isDowned ? "💀" : `${hp}hp`}
                </span>
              )}
            {isIT && (
              <span style={{ fontSize: "10px", color: "#ff4444" }}>IT</span>
            )}
            <span style={{ minWidth: "40px", textAlign: "right" }}>
              {score} {scoreLabel}
            </span>
          </div>
        );
      })}
      <div
        style={{
          textAlign: "center",
          fontSize: "9px",
          color: "#555",
          marginTop: "10px",
        }}
      >
        HOLD TAB
      </div>
    </div>
  );
};

export default ScoreBoard;
