import * as React from "react";
import { GameState, Player } from "../../GameManager";
import { WEAPONS } from "../../combat/WeaponManager";

interface Props {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayer: Player | undefined;
  itPlayer: Player | null | undefined;
  currentPlayerId: string;
  isMinimal: boolean;
  isMobile: boolean;
  onEndGame: () => void;
  onMainMenu: () => void;
  botDebugMode: boolean;
  onToggleDebug?: () => void;
  galleryDebugMode: boolean;
  onToggleGalleryDebug?: () => void;
  galleryHighScore: number;
  galleryCombo: number;
  galleryMultiplier: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const btnStyle = (color: string, border: string): React.CSSProperties => ({
  width: "100%",
  padding: "5px 8px",
  marginTop: "4px",
  background: color,
  border: `1px solid ${border}`,
  borderRadius: "3px",
  color: "white",
  fontFamily: "monospace",
  fontSize: "11px",
  cursor: "pointer",
  textAlign: "center",
  userSelect: "none",
});

const GameStatusPanel: React.FC<Props> = ({
  gameState,
  players,
  currentPlayer,
  itPlayer,
  currentPlayerId,
  isMinimal,
  isMobile,
  onEndGame,
  onMainMenu,
  botDebugMode,
  onToggleDebug,
  galleryDebugMode,
  onToggleGalleryDebug,
  galleryHighScore,
  galleryCombo,
  galleryMultiplier,
}) => {
  const t = gameState.timeRemaining;
  const isGallery = gameState.mode === "shooting_gallery";
  const isLow = t <= 15 && isGallery;
  const [pulseTick, setPulseTick] = React.useState(false);
  React.useEffect(() => {
    if (!isLow) {
      setPulseTick(false);
      return;
    }
    const id = setInterval(() => setPulseTick((p) => !p), 500);
    return () => clearInterval(id);
  }, [isLow]);
  const pulse = isLow && pulseTick;

  const panelWidth = isMinimal ? 70 : isMobile ? 120 : 170;

  return (
    <div
      style={{
        position: "fixed",
        top: isMinimal ? "8px" : "10px",
        left: isMinimal ? "8px" : "10px",
        width: panelWidth,
        padding: isMinimal ? "3px 5px" : "7px 10px",
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
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
            marginBottom: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {gameState.mode === "tag"
            ? "🏃 TAG"
            : gameState.mode === "deathmatch"
              ? "💀 DEATHMATCH"
              : gameState.mode === "ctf"
                ? "🚩 CTF"
                : gameState.mode === "shooting_gallery"
                  ? "🎯 GALLERY"
                  : gameState.mode.toUpperCase()}
        </div>
      )}

      <div
        style={{
          marginBottom: isMinimal ? "2px" : "5px",
          fontSize: isMinimal ? "13px" : isLow ? "14px" : "12px",
          fontWeight: isLow || isMinimal ? "bold" : "normal",
          color: isLow ? (pulse ? "#ff3333" : "#ff8888") : undefined,
          textShadow: isLow ? "0 0 8px #ff0000" : undefined,
          textAlign: "center",
          transition: "color 0.25s",
        }}
      >
        ⏱️ {formatTime(t)}
      </div>

      {/* TAG MODE INFO */}
      {gameState.mode === "tag" && !isMinimal && (
        <>
          <div
            style={{
              marginBottom: "4px",
              padding: "3px 5px",
              backgroundColor: currentPlayer?.isIt
                ? "rgba(255,100,100,0.3)"
                : "rgba(100,255,100,0.3)",
              borderRadius: "3px",
              border: currentPlayer?.isIt
                ? "1px solid #ff6464"
                : "1px solid #64ff64",
              fontSize: "10px",
              textAlign: "center",
            }}
          >
            {currentPlayer?.isIt
              ? "🏃 YOU ARE IT!"
              : `${itPlayer?.name || "Someone"} is IT`}
          </div>
          {currentPlayer?.isIt && (
            <div
              style={{
                fontSize: "9px",
                color: "#ffff64",
                marginBottom: "3px",
                textAlign: "center",
              }}
            >
              Click to fire laser tag!
            </div>
          )}
          {currentPlayer?.health !== undefined && (
            <div style={{ marginBottom: "3px" }}>
              <div
                style={{ fontSize: "9px", color: "#aaa", marginBottom: "1px" }}
              >
                ❤️ {currentPlayer.health ?? currentPlayer.maxHealth ?? 100} /{" "}
                {currentPlayer.maxHealth ?? 100}
              </div>
              <div
                style={{
                  height: "5px",
                  background: "#222",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(1, (currentPlayer.health ?? 100) / (currentPlayer.maxHealth ?? 100))) * 100}%`,
                    height: "100%",
                    background:
                      (currentPlayer.health ?? 100) /
                        (currentPlayer.maxHealth ?? 100) >
                      0.5
                        ? "#44ff44"
                        : (currentPlayer.health ?? 100) /
                              (currentPlayer.maxHealth ?? 100) >
                            0.25
                          ? "#ffaa00"
                          : "#ff3333",
                    transition: "width 0.15s",
                  }}
                />
              </div>
            </div>
          )}
          {/* Tag scores */}
          <div style={{ fontSize: "9px", color: "#aaa", marginBottom: "3px" }}>
            {Array.from(players.values())
              .map((p) => ({
                name: p.name,
                score: gameState.scores[p.id] || 0,
              }))
              .sort((a, b) => b.score - a.score)
              .map((e) => (
                <div key={e.name}>
                  🏷️ {e.name}: {Math.floor(e.score)}
                </div>
              ))}
          </div>
        </>
      )}

      {/* DEATHMATCH INFO */}
      {gameState.mode === "deathmatch" && !isMinimal && (
        <>
          <div
            style={{
              marginBottom: "4px",
              padding: "3px 5px",
              backgroundColor: "rgba(100,255,100,0.15)",
              borderRadius: "3px",
              border: "1px solid #64ff64",
              fontSize: "10px",
            }}
          >
            ❤️ {currentPlayer?.health ?? 100} /{" "}
            {currentPlayer?.maxHealth ?? 100}
          </div>
          {currentPlayer?.equippedWeaponId && (
            <div
              style={{ marginBottom: "3px", fontSize: "9px", color: "#aaddff" }}
            >
              🔫{" "}
              {WEAPONS[currentPlayer.equippedWeaponId]?.name ??
                currentPlayer.equippedWeaponId}{" "}
              [
              {currentPlayer.currentAmmo === null ||
              currentPlayer.currentAmmo === undefined
                ? "∞"
                : currentPlayer.currentAmmo}
              ]
            </div>
          )}
          <div style={{ fontSize: "9px", color: "#aaa", marginBottom: "3px" }}>
            {Array.from(players.values())
              .map((p) => ({
                name: p.name,
                kills: gameState.scores[p.id] || 0,
              }))
              .sort((a, b) => b.kills - a.kills)
              .map((e) => (
                <div key={e.name}>
                  💀 {e.name}: {e.kills}
                  {gameState.killLimit ? ` / ${gameState.killLimit}` : ""}
                </div>
              ))}
          </div>
        </>
      )}

      {/* CTF INFO */}
      {gameState.mode === "ctf" && !isMinimal && (
        <>
          <div
            style={{
              marginBottom: "4px",
              padding: "3px 5px",
              backgroundColor:
                currentPlayer?.team === "a"
                  ? "rgba(74,144,226,0.3)"
                  : "rgba(220,53,69,0.3)",
              borderRadius: "3px",
              border:
                currentPlayer?.team === "a"
                  ? "1px solid #4a90e2"
                  : "1px solid #dc3545",
              fontSize: "10px",
            }}
          >
            {currentPlayer?.team === "a" ? "🔵 Team A" : "🔴 Team B"}
          </div>
          <div style={{ marginBottom: "3px", fontSize: "9px" }}>
            🔵 {gameState.scores["a"] ?? 0} - {gameState.scores["b"] ?? 0} 🔴
          </div>
          <div
            style={{
              marginBottom: "3px",
              padding: "3px 5px",
              backgroundColor: "rgba(100,255,100,0.15)",
              borderRadius: "3px",
              border: "1px solid #64ff64",
              fontSize: "10px",
            }}
          >
            ❤️ {currentPlayer?.health ?? 100} /{" "}
            {currentPlayer?.maxHealth ?? 100}
          </div>
          {gameState.flags?.some((f) => f.carrierId === currentPlayerId) && (
            <div
              style={{
                marginBottom: "3px",
                fontSize: "9px",
                color: "#ffff64",
                fontWeight: "bold",
              }}
            >
              🚩 Carrying flag! Return to base!
            </div>
          )}
        </>
      )}

      {/* GALLERY INFO */}
      {gameState.mode === "shooting_gallery" && !isMinimal && (
        <>
          <div
            style={{
              marginBottom: "3px",
              padding: "3px 5px",
              backgroundColor: "rgba(255,215,0,0.15)",
              borderRadius: "3px",
              border: "1px solid #ffd700",
              fontSize: "10px",
              color: "#ffd700",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            🎯 {gameState.scores[currentPlayerId] ?? 0} pts
          </div>
          {galleryHighScore > 0 && (
            <div
              style={{
                fontSize: "9px",
                color: "#888",
                textAlign: "center",
                marginBottom: "2px",
              }}
            >
              Best: {galleryHighScore}
            </div>
          )}
          {galleryCombo >= 3 && (
            <div
              style={{
                marginBottom: "3px",
                padding: "2px 5px",
                backgroundColor: "rgba(255,120,0,0.25)",
                borderRadius: "3px",
                border: "1px solid #ff8800",
                fontSize: "10px",
                color: "#ff8800",
                fontWeight: "bold",
                textAlign: "center",
                textShadow: "0 0 8px #ff6600",
              }}
            >
              {galleryMultiplier >= 4
                ? "GODLIKE"
                : galleryMultiplier >= 3
                  ? "RAMPAGE"
                  : "COMBO"}{" "}
              x{galleryMultiplier}
            </div>
          )}
          <div
            style={{
              fontSize: "9px",
              color: "#888",
              marginBottom: "3px",
              textAlign: "center",
            }}
          >
            {(() => {
              const s = gameState.galleryShots ?? 0;
              const h = gameState.galleryHits ?? 0;
              return `${h}/${s} (${s > 0 ? Math.round((h / s) * 100) : 0}%)`;
            })()}
          </div>
        </>
      )}

      {/* BUTTONS — always stacked, mode-aware */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          marginTop: "4px",
        }}
      >
        <button
          onClick={onEndGame}
          style={btnStyle("rgba(180,30,30,0.85)", "#dc3545")}
        >
          {isMinimal ? "⏹️" : "⏹ Stop Game"}
        </button>

        <button
          onClick={onMainMenu}
          style={btnStyle("rgba(50,50,80,0.85)", "#666")}
        >
          {isMinimal ? "🏠" : "🏠 Main Menu"}
        </button>

        {/* Debug toggle — shown in all modes */}
        {onToggleDebug && (
          <button
            onClick={onToggleDebug}
            style={btnStyle(
              botDebugMode ? "rgba(180,30,30,0.8)" : "rgba(200,120,0,0.8)",
              botDebugMode ? "#dc3545" : "#ff8c00",
            )}
          >
            {isMinimal ? "🔧" : botDebugMode ? "⏹ Debug OFF" : "🔧 Debug ON"}
          </button>
        )}

        {/* Gallery debug only in gallery mode */}
        {onToggleGalleryDebug && gameState.mode === "shooting_gallery" && (
          <button
            onClick={onToggleGalleryDebug}
            style={btnStyle(
              galleryDebugMode ? "rgba(180,30,30,0.8)" : "rgba(0,140,80,0.8)",
              galleryDebugMode ? "#dc3545" : "#00aa64",
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

export default GameStatusPanel;
