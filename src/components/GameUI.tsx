import * as React from "react";
import { GameState, KillEvent, Player } from "./GameManager";
import { WEAPONS } from "./combat/WeaponManager";
import { STREAK_LABELS } from "./gameModes/DeathmatchMode";

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
    window.innerWidth > window.innerHeight,
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

  // Kill feed: last 5 events (capped to 10 in GameManager), bottom-left overlay.
  const recentKills: KillEvent[] = (gameState.killFeed ?? []).slice(-5);

  // spawnProtectedUntil is cleared by onTick within ~1s of expiry — presence is enough.
  const isSpawnProtected = currentPlayer?.spawnProtectedUntil !== undefined;

  // Streak announcement: show briefly then fade; onTick clears the field after 3s.
  const streakAnnouncement = gameState.streakAnnouncement;
  const [visibleStreak, setVisibleStreak] = React.useState<{
    killerName: string;
    count: number;
  } | null>(null);

  React.useEffect(() => {
    if (streakAnnouncement === undefined) {
      setVisibleStreak(null);
      return;
    }
    setVisibleStreak({
      killerName: streakAnnouncement.killerName,
      count: streakAnnouncement.count,
    });
  }, [streakAnnouncement]);

  // Respawn countdown: restart the interval whenever the player's respawnAt stamp changes.
  const respawnAt = currentPlayer?.respawnAt;
  const [respawnSecondsLeft, setRespawnSecondsLeft] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    if (respawnAt === undefined) {
      setRespawnSecondsLeft(null);
      return;
    }
    const id = setInterval(() => {
      const secs = Math.ceil((respawnAt - Date.now()) / 1000);
      setRespawnSecondsLeft(Math.max(0, secs));
    }, 100);
    return () => clearInterval(id);
  }, [respawnAt]);

  // Main game status display (always visible during active game)
  if (gameState.isActive) {
    return (
      <>
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
                  ] [1/2/3]
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
                    .map((player) => ({
                      name: player.name,
                      kills: gameState.scores[player.id] || 0,
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
                  ] [1/2/3]
                </div>
              )}

              {!isMinimal && (
                <div
                  style={{
                    marginBottom: "6px",
                    fontSize: isMobile ? "9px" : "10px",
                  }}
                >
                  🔵 {gameState.scores["a"] ?? 0} - {gameState.scores["b"] ?? 0}{" "}
                  🔴
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
                padding: isMinimal
                  ? "2px 4px"
                  : isMobile
                    ? "3px 6px"
                    : "3px 6px",
                backgroundColor: botDebugMode
                  ? "rgba(220, 53, 69, 0.8)"
                  : "rgba(255, 140, 0, 0.8)",
                border: botDebugMode
                  ? "1px solid #dc3545"
                  : "1px solid #ff8c00",
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
        {!isMinimal && recentKills.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: "60px",
              left: "10px",
              fontFamily: "monospace",
              fontSize: "11px",
              pointerEvents: "none",
              zIndex: 999,
            }}
          >
            {recentKills.map((k) => (
              <div
                key={`${k.killerId}-${k.timestamp}`}
                style={{
                  backgroundColor: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "3px",
                  padding: "2px 6px",
                  marginBottom: "2px",
                  color: "#ffdd88",
                }}
              >
                💀 {k.killerName}{" "}
                <span style={{ color: "#aaaaaa" }}>
                  [{WEAPONS[k.weaponId]?.name ?? k.weaponId}]
                </span>{" "}
                → {k.targetName}
              </div>
            ))}
          </div>
        )}

        {/* Crosshair — combat and tag modes, hidden while downed */}
        {(gameState.mode === "deathmatch" ||
          gameState.mode === "ctf" ||
          gameState.mode === "tag") &&
          respawnSecondsLeft === null &&
          !isMinimal && (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 997,
                width: "20px",
                height: "20px",
              }}
            >
              {/* Horizontal bar */}
              <div
                style={{
                  position: "absolute",
                  top: "9px",
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "rgba(255,255,255,0.85)",
                }}
              />
              {/* Vertical bar */}
              <div
                style={{
                  position: "absolute",
                  left: "9px",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: "rgba(255,255,255,0.85)",
                }}
              />
            </div>
          )}

        {/* Bottom-center ammo + health bar — combat and tag modes */}
        {(gameState.mode === "deathmatch" ||
          gameState.mode === "ctf" ||
          gameState.mode === "tag") &&
          !isMinimal &&
          currentPlayer &&
          respawnSecondsLeft === null && (
            <div
              style={{
                position: "fixed",
                bottom: "14px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                fontFamily: "monospace",
                fontSize: "11px",
                pointerEvents: "none",
                zIndex: 997,
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "5px",
                padding: "4px 12px",
              }}
            >
              {/* Health — combat modes only (no health in tag mode) */}
              {gameState.mode !== "tag" && (
                <>
                  <span style={{ color: "#ff6666" }}>
                    ❤️ {currentPlayer.health ?? currentPlayer.maxHealth ?? 100}
                    <span style={{ color: "#666", marginLeft: "2px" }}>
                      /{currentPlayer.maxHealth ?? 100}
                    </span>
                  </span>
                  {/* Divider */}
                  <span style={{ color: "#444" }}>|</span>
                </>
              )}
              {/* Weapon name + ammo pips */}
              {currentPlayer.equippedWeaponId &&
                (() => {
                  const wDef = WEAPONS[currentPlayer.equippedWeaponId];
                  const ammo = currentPlayer.currentAmmo;
                  const maxAmmo = wDef?.maxAmmo;
                  const wColor =
                    currentPlayer.equippedWeaponId === "rocket"
                      ? "#ff4422"
                      : currentPlayer.equippedWeaponId === "shotgun"
                        ? "#ff9933"
                        : "#33ffe6";
                  return (
                    <>
                      <span style={{ color: wColor }}>
                        {wDef?.name ?? currentPlayer.equippedWeaponId}
                      </span>
                      <span style={{ color: "#aaaaaa", letterSpacing: "1px" }}>
                        {ammo === null || ammo === undefined
                          ? "∞"
                          : maxAmmo
                            ? Array.from({ length: maxAmmo }, (_, i) => (
                                <span
                                  key={i}
                                  style={{ color: i < ammo ? wColor : "#444" }}
                                >
                                  ●
                                </span>
                              ))
                            : ammo}
                      </span>
                      <span style={{ color: "#555", fontSize: "10px" }}>
                        [1/2/3]
                      </span>
                    </>
                  );
                })()}
            </div>
          )}

        {respawnSecondsLeft !== null &&
          (gameState.mode === "deathmatch" || gameState.mode === "ctf") && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 998,
                background: "rgba(0,0,0,0.45)",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: isMinimal ? "22px" : "38px",
                  fontWeight: "bold",
                  color: "#ff4444",
                  textShadow: "0 0 16px #ff0000",
                  letterSpacing: "2px",
                }}
              >
                DOWNED
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: isMinimal ? "14px" : "22px",
                  color: "#ffaaaa",
                  marginTop: "6px",
                }}
              >
                {respawnSecondsLeft > 0
                  ? `RESPAWNING IN ${respawnSecondsLeft}s`
                  : "RESPAWNING..."}
              </div>
            </div>
          )}

        {isSpawnProtected &&
          (gameState.mode === "deathmatch" || gameState.mode === "ctf") && (
            <div
              style={{
                position: "fixed",
                top: "40%",
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "none",
                zIndex: 996,
                fontFamily: "monospace",
                fontSize: isMinimal ? "12px" : "18px",
                fontWeight: "bold",
                color: "#00ffcc",
                textShadow: "0 0 10px #00ccaa",
                letterSpacing: "2px",
              }}
            >
              PROTECTED
            </div>
          )}

        {visibleStreak !== null &&
          (gameState.mode === "deathmatch" || gameState.mode === "ctf") && (
            <div
              style={{
                position: "fixed",
                top: "30%",
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "none",
                zIndex: 995,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: isMinimal ? "14px" : "26px",
                  fontWeight: "bold",
                  color: "#ffcc00",
                  textShadow: "0 0 18px #ff8800, 0 0 6px #ffcc00",
                  letterSpacing: "3px",
                }}
              >
                {STREAK_LABELS[visibleStreak.count] ??
                  `${visibleStreak.count}x STREAK`}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: isMinimal ? "10px" : "14px",
                  color: "#ffeeaa",
                  marginTop: "4px",
                }}
              >
                {visibleStreak.killerName}
              </div>
            </div>
          )}
      </>
    );
  }

  // Results screen — shown after an active game ends until the player starts a new one.
  if (
    !gameState.isActive &&
    gameState.gameResults &&
    gameState.gameResults.length > 0
  ) {
    const winner = gameState.gameResults[0];
    const isWinner = winner.id === currentPlayerId;
    const scoreLabel =
      gameState.mode === "ctf"
        ? "caps"
        : gameState.mode === "tag"
          ? "pts"
          : "kills";
    return (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0,0,0,0.92)",
          border: "2px solid rgba(255,255,255,0.3)",
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
            color: isWinner ? "#ffdd44" : "#ff6666",
            textShadow: isWinner ? "0 0 14px #ffaa00" : "0 0 10px #ff4444",
            marginBottom: "10px",
            letterSpacing: "2px",
          }}
        >
          {isWinner ? "VICTORY!" : "DEFEATED"}
        </div>

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
          {gameState.gameResults.map((r, i) => (
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
                {i + 1}. {r.name}
              </span>
              <span>
                {r.score} {scoreLabel}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onStartGame(gameState.mode)}
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
          onClick={onEndGame}
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

          {players.size >= 2 && (
            <button
              onClick={() => onStartGame("deathmatch")}
              style={{
                padding: isMinimal
                  ? "3px 5px"
                  : isMobile
                    ? "6px 8px"
                    : "6px 10px",
                backgroundColor: "rgba(220, 53, 69, 0.8)",
                border: "1px solid #dc3545",
                borderRadius: "3px",
                color: "white",
                cursor: "pointer",
                fontSize: isMinimal ? "14px" : isMobile ? "14px" : "11px",
                width: "100%",
              }}
            >
              {isMinimal || isMobile ? "🔫" : "Start Deathmatch"}
            </button>
          )}

          {players.size >= 2 && (
            <button
              onClick={() => onStartGame("ctf")}
              style={{
                padding: isMinimal
                  ? "3px 5px"
                  : isMobile
                    ? "6px 8px"
                    : "6px 10px",
                backgroundColor: "rgba(155, 89, 182, 0.8)",
                border: "1px solid #9b59b6",
                borderRadius: "3px",
                color: "white",
                cursor: "pointer",
                fontSize: isMinimal ? "14px" : isMobile ? "14px" : "11px",
                width: "100%",
              }}
            >
              {isMinimal || isMobile ? "🚩" : "Start CTF"}
            </button>
          )}

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
