import * as React from "react";
import { GameState, Player } from "../../GameManager";
import { WEAPONS } from "../../combat/WeaponManager";
import { Button } from "../../21st.dev/Button";
import "../../../styles/Button.css";

interface Props {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayer: Player | undefined;
  itPlayer: Player | null | undefined;
  currentPlayerId: string;
  isMinimal: boolean;
  isMobile: boolean;
  onEndGame: () => void;
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

const GameStatusPanel: React.FC<Props> = ({
  gameState,
  players,
  currentPlayer,
  itPlayer,
  currentPlayerId,
  isMinimal,
  isMobile,
  onEndGame,
  botDebugMode,
  onToggleDebug,
  galleryDebugMode,
  onToggleGalleryDebug,
  galleryHighScore,
  galleryCombo,
  galleryMultiplier,
}) => {
  const t = gameState.timeRemaining;
  const isLow = t <= 15 && gameState.mode === "shooting_gallery";
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
          fontSize: isMinimal
            ? "13px"
            : isLow
              ? "14px"
              : isMobile
                ? "10px"
                : "11px",
          fontWeight: isLow ? "bold" : isMinimal ? "bold" : "normal",
          color: isLow ? (pulse ? "#ff3333" : "#ff8888") : undefined,
          textShadow: isLow ? "0 0 8px #ff0000" : undefined,
          transition: "color 0.25s",
        }}
      >
        ⏱️ {formatTime(t)}
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
              Click to fire laser tag!
            </div>
          )}
        </>
      )}

      {gameState.mode === "deathmatch" && (
        <>
          <div
            style={{
              marginBottom: isMinimal ? "2px" : "6px",
              padding: isMinimal ? "2px 3px" : "4px 8px",
              backgroundColor: "rgba(100, 255, 100, 0.2)",
              borderRadius: "3px",
              border: "1px solid #64ff64",
              fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
            }}
          >
            ❤️ {currentPlayer?.health ?? currentPlayer?.maxHealth ?? 100}
            {!isMinimal && ` / ${currentPlayer?.maxHealth ?? 100}`}
          </div>
          {!isMinimal && currentPlayer?.equippedWeaponId && (
            <div
              style={{
                marginBottom: "6px",
                fontSize: isMobile ? "9px" : "10px",
                color: "#aaddff",
              }}
            >
              🔫{" "}
              {WEAPONS[currentPlayer.equippedWeaponId]?.name ??
                currentPlayer.equippedWeaponId}{" "}
              [
              {currentPlayer.currentAmmo === null ||
              currentPlayer.currentAmmo === undefined
                ? "∞"
                : currentPlayer.currentAmmo}
              ] [1-5]
            </div>
          )}
          {!isMinimal && (
            <div
              style={{
                marginBottom: "6px",
                fontSize: isMobile ? "9px" : "10px",
                textAlign: "left",
              }}
            >
              {Array.from(players.values())
                .map((p) => ({
                  name: p.name,
                  kills: gameState.scores[p.id] || 0,
                }))
                .sort((a, b) => b.kills - a.kills)
                .map((entry) => (
                  <div key={entry.name}>
                    💀 {entry.name}: {entry.kills}
                    {gameState.killLimit ? ` / ${gameState.killLimit}` : ""}
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {gameState.mode === "ctf" && (
        <>
          <div
            style={{
              marginBottom: isMinimal ? "2px" : "6px",
              padding: isMinimal ? "2px 3px" : "4px 8px",
              backgroundColor:
                currentPlayer?.team === "a"
                  ? "rgba(74, 144, 226, 0.3)"
                  : "rgba(220, 53, 69, 0.3)",
              borderRadius: "3px",
              border:
                currentPlayer?.team === "a"
                  ? "1px solid #4a90e2"
                  : "1px solid #dc3545",
              fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
            }}
          >
            {currentPlayer?.team === "a" ? "🔵 Team A" : "🔴 Team B"}
          </div>
          <div
            style={{
              marginBottom: isMinimal ? "2px" : "6px",
              padding: isMinimal ? "2px 3px" : "4px 8px",
              backgroundColor: "rgba(100, 255, 100, 0.2)",
              borderRadius: "3px",
              border: "1px solid #64ff64",
              fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
            }}
          >
            ❤️ {currentPlayer?.health ?? currentPlayer?.maxHealth ?? 100}
            {!isMinimal && ` / ${currentPlayer?.maxHealth ?? 100}`}
          </div>
          {!isMinimal && currentPlayer?.equippedWeaponId && (
            <div
              style={{
                marginBottom: "6px",
                fontSize: isMobile ? "9px" : "10px",
                color: "#aaddff",
              }}
            >
              🔫{" "}
              {WEAPONS[currentPlayer.equippedWeaponId]?.name ??
                currentPlayer.equippedWeaponId}{" "}
              [
              {currentPlayer.currentAmmo === null ||
              currentPlayer.currentAmmo === undefined
                ? "∞"
                : currentPlayer.currentAmmo}
              ] [1-5]
            </div>
          )}
          {!isMinimal && (
            <div
              style={{
                marginBottom: "6px",
                fontSize: isMobile ? "9px" : "10px",
              }}
            >
              🔵 {gameState.scores["a"] ?? 0} - {gameState.scores["b"] ?? 0} 🔴
            </div>
          )}
          {gameState.flags?.some(
            (flag) => flag.carrierId === currentPlayerId,
          ) && (
            <div
              style={{
                marginBottom: isMinimal ? "2px" : "6px",
                fontSize: isMinimal ? "8px" : isMobile ? "9px" : "10px",
                color: "#ffff64",
                fontWeight: "bold",
              }}
            >
              🚩 Carrying flag! Return to base!
            </div>
          )}
        </>
      )}

      {gameState.mode === "shooting_gallery" && (
        <>
          <div
            style={{
              marginBottom: isMinimal ? "2px" : "6px",
              padding: isMinimal ? "2px 3px" : "4px 8px",
              backgroundColor: "rgba(255,215,0,0.15)",
              borderRadius: "3px",
              border: "1px solid #ffd700",
              fontSize: isMinimal ? "8px" : isMobile ? "10px" : "11px",
              color: "#ffd700",
              fontWeight: "bold",
            }}
          >
            🎯 {gameState.scores[currentPlayerId] ?? 0} pts
          </div>
          {!isMinimal && galleryHighScore > 0 && (
            <div
              style={{
                marginBottom: "3px",
                fontSize: "9px",
                color: "#888",
                textAlign: "center",
              }}
            >
              Best: {galleryHighScore} pts
            </div>
          )}
          {!isMinimal && galleryCombo >= 3 && (
            <div
              style={{
                marginBottom: "4px",
                padding: "2px 6px",
                backgroundColor: "rgba(255,120,0,0.25)",
                borderRadius: "3px",
                border: "1px solid #ff8800",
                fontSize: "11px",
                color: "#ff8800",
                fontWeight: "bold",
                textAlign: "center",
                textShadow: "0 0 8px #ff6600",
                letterSpacing: "1px",
              }}
            >
              {galleryMultiplier >= 4
                ? "GODLIKE"
                : galleryMultiplier >= 3
                  ? "RAMPAGE"
                  : "COMBO"}{" "}
              x{galleryMultiplier} ({galleryCombo})
            </div>
          )}
          {!isMinimal && (
            <div
              style={{
                marginBottom: "6px",
                fontSize: "10px",
                color: "#aaaaaa",
              }}
            >
              {(() => {
                const shots = gameState.galleryShots ?? 0;
                const hits = gameState.galleryHits ?? 0;
                const acc = shots > 0 ? Math.round((hits / shots) * 100) : 0;
                return `Hits: ${hits}/${shots} (${acc}% acc)`;
              })()}
            </div>
          )}
          {!isMinimal && (
            <div
              style={{ fontSize: "9px", color: "#888", marginBottom: "4px" }}
            >
              🔴=10 🟠=25 🟡=50 ⭐=100
            </div>
          )}
        </>
      )}

      <Button
        onClick={onEndGame}
        variant="danger"
        size={isMinimal ? "small" : isMobile ? "small" : "medium"}
        className="game-ui-button-container"
        aria-label="End Game"
        title={isMinimal || isMobile ? "End Game" : undefined}
      >
        {isMinimal || isMobile ? "⏹️" : "End Game"}
      </Button>

      {onToggleDebug && (
        <Button
          onClick={onToggleDebug}
          variant={botDebugMode ? "danger" : "warning"}
          size={isMinimal ? "small" : isMobile ? "small" : "medium"}
          className="game-ui-button-container"
          aria-label={botDebugMode ? "Stop Debug Mode" : "Start Debug Mode"}
          title={
            isMinimal || isMobile
              ? botDebugMode
                ? "Stop Debug Mode"
                : "Start Debug Mode"
              : undefined
          }
        >
          {isMinimal || isMobile
            ? "🔧"
            : botDebugMode
              ? "⏹️ Stop Debug"
              : "🔧 Debug Mode"}
        </Button>
      )}

      {onToggleGalleryDebug && (
        <Button
          onClick={onToggleGalleryDebug}
          variant={galleryDebugMode ? "danger" : "success"}
          size={isMinimal ? "small" : isMobile ? "small" : "medium"}
          className="game-ui-button-container"
          aria-label={
            galleryDebugMode ? "Stop Gallery Debug" : "Start Gallery Debug"
          }
          title={
            isMinimal || isMobile
              ? galleryDebugMode
                ? "Stop Gallery Debug"
                : "Start Gallery Debug"
              : undefined
          }
        >
          {isMinimal || isMobile
            ? "🎯"
            : galleryDebugMode
              ? "⏹️ Stop Gallery"
              : "🎯 Gallery Debug"}
        </Button>
      )}
    </div>
  );
};

export default GameStatusPanel;
