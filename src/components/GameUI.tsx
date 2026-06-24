import * as React from "react";
import { GameState, KillEvent, Player } from "./GameManager";
import { WEAPONS } from "./combat/WeaponManager";
import { STREAK_LABELS } from "./gameModes/DeathmatchMode";
import { TAG_STREAK_LABELS } from "./gameModes/TagMode";

interface GameUIProps {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
  onStartGame: (mode: string) => void;
  onEndGame: () => void;
  botDebugMode?: boolean;
  onToggleDebug?: () => void;
  /** Seconds until auto-restart fires; null = no auto-restart pending. */
  autoRestartSecondsLeft?: number | null;
}

const GALLERY_HS_KEY = "darkmoon_gallery_highscore";

const GameUI: React.FC<GameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  onStartGame,
  onEndGame,
  botDebugMode = false,
  onToggleDebug,
  autoRestartSecondsLeft = null,
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

  // Score tension: warn when any player is 1 kill from winning in deathmatch.
  const tensionWarning: string | null = (() => {
    if (
      gameState.mode !== "deathmatch" ||
      !gameState.isActive ||
      !gameState.killLimit
    )
      return null;
    const limit = gameState.killLimit;
    let highest = -1;
    let leaderId = "";
    Object.entries(gameState.scores).forEach(([id, score]) => {
      if (score > highest) {
        highest = score;
        leaderId = id;
      }
    });
    if (highest < limit - 2) return null;
    const leaderName = players.get(leaderId)?.name ?? leaderId;
    const needed = limit - highest;
    if (needed === 1)
      return `${leaderName.toUpperCase()} NEEDS 1 MORE KILL TO WIN!`;
    if (needed === 2)
      return `${leaderName.toUpperCase()} NEEDS 2 MORE KILLS TO WIN`;
    return null;
  })();

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

  // Hit direction indicator: show a red arc at the screen edge pointing toward the attacker.
  const [hitAngle, setHitAngle] = React.useState<number | null>(null);
  const hitAngleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  React.useEffect(() => {
    const onPlayerDamaged = (e: Event) => {
      const angle = (e as CustomEvent<{ angle: number }>).detail.angle;
      if (hitAngleTimerRef.current) clearTimeout(hitAngleTimerRef.current);
      setHitAngle(angle);
      hitAngleTimerRef.current = setTimeout(() => setHitAngle(null), 900);
    };
    window.addEventListener("player-damaged", onPlayerDamaged);
    return () => {
      window.removeEventListener("player-damaged", onPlayerDamaged);
      if (hitAngleTimerRef.current) clearTimeout(hitAngleTimerRef.current);
    };
  }, []);

  // Damage flash: red vignette when player health drops
  const prevHealthRef = React.useRef<number | null>(null);
  const [damageFlash, setDamageFlash] = React.useState(false);
  React.useEffect(() => {
    const health = currentPlayer?.health ?? null;
    if (
      prevHealthRef.current !== null &&
      health !== null &&
      health < prevHealthRef.current
    ) {
      setDamageFlash(true);
      const t = setTimeout(() => setDamageFlash(false), 500);
      prevHealthRef.current = health;
      return () => clearTimeout(t);
    }
    prevHealthRef.current = health;
    return undefined;
  }, [currentPlayer?.health]);

  // Hit marker: crosshair flashes on player's shot connects.
  const [hitMarker, setHitMarker] = React.useState(false);
  // Increment key each hit to retrigger the expanding ring CSS animation.
  const [hitRingKey, setHitRingKey] = React.useState(0);
  React.useEffect(() => {
    const handle = () => {
      setHitMarker(true);
      setHitRingKey((k) => k + 1);
      setTimeout(() => setHitMarker(false), 300);
    };
    window.addEventListener("player-hit-landed", handle);
    return () => window.removeEventListener("player-hit-landed", handle);
  }, []);

  // Track real mouse position so the crosshair follows the cursor.
  const [mousePos, setMousePos] = React.useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });
  React.useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Gallery high-score — persisted in localStorage.
  const [galleryHighScore, setGalleryHighScore] = React.useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(GALLERY_HS_KEY) ?? "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [isNewRecord, setIsNewRecord] = React.useState(false);

  // Detect gallery game-over and update high score.
  React.useEffect(() => {
    if (gameState.isActive) {
      setIsNewRecord(false);
      return;
    }
    if (
      gameState.mode === "shooting_gallery" &&
      gameState.gameResults &&
      gameState.gameResults.length > 0
    ) {
      const score = gameState.gameResults[0].score ?? 0;
      try {
        const prev =
          parseInt(localStorage.getItem(GALLERY_HS_KEY) ?? "0", 10) || 0;
        if (score > prev) {
          localStorage.setItem(GALLERY_HS_KEY, String(score));
          setGalleryHighScore(score);
          setIsNewRecord(true);
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [gameState.isActive, gameState.mode, gameState.gameResults]);

  // Gallery combo/streak display — updated by gallery-combo CustomEvents.
  const [galleryCombo, setGalleryCombo] = React.useState(0);
  const [galleryMultiplier, setGalleryMultiplier] = React.useState(1);
  React.useEffect(() => {
    const onCombo = (e: unknown) => {
      const d = (e as { detail: { combo: number; multiplier: number } }).detail;
      setGalleryCombo(d.combo);
      setGalleryMultiplier(d.multiplier);
    };
    window.addEventListener("gallery-combo", onCombo);
    return () => window.removeEventListener("gallery-combo", onCombo);
  }, []);

  // Crosshair spread: expands on fire, decays back to 0.
  const [crosshairSpread, setCrosshairSpread] = React.useState(0);
  const spreadDecayRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  React.useEffect(() => {
    const onFired = (e: unknown) => {
      const weaponId = (e as { detail: { weaponId: string } }).detail.weaponId;
      const addSpread = weaponId === "smg" ? 8 : weaponId === "shotgun" ? 6 : 3;
      setCrosshairSpread((prev) => Math.min(prev + addSpread, 24));
      if (spreadDecayRef.current) clearInterval(spreadDecayRef.current);
      spreadDecayRef.current = setInterval(() => {
        setCrosshairSpread((prev) => {
          if (prev <= 0) {
            if (spreadDecayRef.current) clearInterval(spreadDecayRef.current);
            return 0;
          }
          return prev - 2;
        });
      }, 50);
    };
    window.addEventListener("weapon-fired", onFired);
    return () => window.removeEventListener("weapon-fired", onFired);
  }, []);

  // Tab scoreboard overlay
  const [showScoreboard, setShowScoreboard] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Tab") setShowScoreboard(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Weapon/health pickup toast — brief bottom-center flash
  const [pickupToast, setPickupToast] = React.useState<string | null>(null);
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onWeapon = (e: unknown) => {
      const { weaponId } = (e as { detail: { weaponId: string } }).detail;
      const name = WEAPONS[weaponId]?.name ?? weaponId;
      setPickupToast(`PICKED UP ${name.toUpperCase()}`);
      clearTimeout(timer);
      timer = setTimeout(() => setPickupToast(null), 2200);
    };
    const onHealth = (e: unknown) => {
      const { amount } = (e as { detail: { amount: number } }).detail;
      setPickupToast(`+${amount} HEALTH`);
      clearTimeout(timer);
      timer = setTimeout(() => setPickupToast(null), 2200);
    };
    window.addEventListener("weapon-pickup", onWeapon);
    window.addEventListener("health-pickup", onHealth);
    return () => {
      window.removeEventListener("weapon-pickup", onWeapon);
      window.removeEventListener("health-pickup", onHealth);
      clearTimeout(timer);
    };
  }, []);

  // Kill announcement: "YOU KILLED [name]" banner for 2s on personal kills
  const lastKillKeyRef = React.useRef<string | null>(null);
  const [killAnnouncement, setKillAnnouncement] = React.useState<string | null>(
    null,
  );
  React.useEffect(() => {
    const feed = gameState.killFeed ?? [];
    if (feed.length === 0) return;
    const latest = feed[feed.length - 1];
    const key = `${latest.killerId}-${latest.timestamp}`;
    if (key === lastKillKeyRef.current) return undefined;
    lastKillKeyRef.current = key;
    if (latest.killerId !== currentPlayerId) return undefined;
    const weaponLabel = WEAPONS[latest.weaponId]?.name ?? latest.weaponId;
    setKillAnnouncement(`${latest.targetName} [${weaponLabel}]`);
    const t = setTimeout(() => setKillAnnouncement(null), 2000);
    return () => clearTimeout(t);
  }, [gameState.killFeed, currentPlayerId]);

  // Main game status display (always visible during active game)
  if (gameState.isActive) {
    return (
      <>
        <style>{`
          @keyframes darkmoon-damage-flash {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}</style>
        {damageFlash && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at center, transparent 25%, rgba(200,0,0,0.7) 100%)",
              animation: "darkmoon-damage-flash 0.5s ease-out forwards",
              zIndex: 998,
            }}
          />
        )}

        {hitAngle !== null && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 997,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "220px",
                height: "220px",
                position: "relative",
                transform: `rotate(${hitAngle}rad)`,
              }}
            >
              {/* Red arc at top of the circle, pointing toward attacker direction */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "36px",
                  height: "36px",
                  background:
                    "radial-gradient(ellipse at center top, rgba(255,40,40,0.95) 0%, rgba(255,40,40,0) 70%)",
                  clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                  filter: "drop-shadow(0 0 6px #ff2222)",
                }}
              />
            </div>
          </div>
        )}
        {killAnnouncement && (
          <div
            style={{
              position: "fixed",
              top: "28%",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 1002,
              textAlign: "center",
              fontFamily: "monospace",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#ffdd00",
                letterSpacing: "2px",
                marginBottom: "2px",
              }}
            >
              YOU KILLED
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                color: "#fff",
                textShadow: "0 0 12px #ff8800, 0 0 4px #ffcc00",
              }}
            >
              {killAnnouncement}
            </div>
          </div>
        )}
        {pickupToast && (
          <div
            style={{
              position: "fixed",
              bottom: "90px",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 1002,
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: "13px",
              fontWeight: "bold",
              color: "#00ffcc",
              textShadow: "0 0 8px #00ffcc88",
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(0,255,200,0.4)",
              borderRadius: "4px",
              padding: "3px 10px",
            }}
          >
            {pickupToast}
          </div>
        )}
        {showScoreboard &&
          !isMinimal &&
          (() => {
            const scoreLabel =
              gameState.mode === "ctf"
                ? "caps"
                : gameState.mode === "tag"
                  ? "pts"
                  : "kills";
            const sorted = Array.from(players.values()).sort(
              (a, b) =>
                (gameState.scores[b.id] ?? 0) - (gameState.scores[a.id] ?? 0),
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
                        color: isMe
                          ? "#ffdd44"
                          : i === 0
                            ? "#ffffff"
                            : "#aaaaaa",
                        fontWeight: isMe ? "bold" : "normal",
                      }}
                    >
                      <span style={{ minWidth: "20px", color: "#666" }}>
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `${i + 1}.`}
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
                        <span style={{ fontSize: "10px", color: "#ff4444" }}>
                          IT
                        </span>
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
          })()}
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

          {(() => {
            const t = gameState.timeRemaining;
            const isLow = t <= 15 && gameState.mode === "shooting_gallery";
            const pulse = isLow && Math.floor(Date.now() / 500) % 2 === 0;
            return (
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
            );
          })()}

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
                    const acc =
                      shots > 0 ? Math.round((hits / shots) * 100) : 0;
                    return `Hits: ${hits}/${shots} (${acc}% acc)`;
                  })()}
                </div>
              )}
              {!isMinimal && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "#888",
                    marginBottom: "4px",
                  }}
                >
                  🔴=10 🟠=25 🟡=50 ⭐=100
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
                {k.weaponId === "tag" ? (
                  <>
                    🏃 {k.killerName}{" "}
                    <span style={{ color: "#aaaaaa" }}>tagged</span>{" "}
                    {k.targetName}
                  </>
                ) : (
                  <>
                    💀 {k.killerName}{" "}
                    <span style={{ color: "#aaaaaa" }}>
                      [{WEAPONS[k.weaponId]?.name ?? k.weaponId}]
                    </span>{" "}
                    → {k.targetName}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Minimap radar — top-right, combat + tag modes, hidden on minimal */}
        {(gameState.mode === "deathmatch" ||
          gameState.mode === "ctf" ||
          gameState.mode === "tag") &&
          !isMinimal &&
          (() => {
            const MAP_PX = 90;
            const ARENA = 50; // world units from center to wall (±50)
            const toMapCoord = (worldVal: number) =>
              ((worldVal + ARENA) / (ARENA * 2)) * MAP_PX;
            const allPlayers = Array.from(players.values());
            return (
              <div
                style={{
                  position: "fixed",
                  top: "52px",
                  right: "10px",
                  width: MAP_PX,
                  height: MAP_PX,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "4px",
                  zIndex: 998,
                  pointerEvents: "none",
                  overflow: "hidden",
                }}
              >
                {/* Cover crate outlines */}
                {[
                  [0, -8],
                  [0, 8],
                  [8, 0],
                  [-8, 0],
                ].map(([wx, wz], i) => {
                  const px = toMapCoord(wx) - 3;
                  const py = toMapCoord(wz) - 3;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: px,
                        top: py,
                        width: 6,
                        height: 6,
                        background: "rgba(100,120,130,0.5)",
                        borderRadius: "1px",
                      }}
                    />
                  );
                })}
                {/* CTF flag dots */}
                {gameState.mode === "ctf" &&
                  (gameState.flags ?? []).map((flag) => {
                    const pos = flag.carrierId ? undefined : flag.position;
                    if (!pos) return null;
                    const fx = toMapCoord(pos[0]);
                    const fz = toMapCoord(pos[2]);
                    const flagColor = flag.team === "a" ? "#4488ff" : "#ff5533";
                    return (
                      <div
                        key={`flag-${flag.team}`}
                        style={{
                          position: "absolute",
                          left: fx - 4,
                          top: fz - 4,
                          width: 8,
                          height: 8,
                          background: flagColor,
                          clipPath: "polygon(0 0, 100% 25%, 0 50%, 0 100%)",
                          opacity: 0.9,
                        }}
                      />
                    );
                  })}
                {/* Player and bot dots */}
                {allPlayers.map((p) => {
                  const isMe = p.id === currentPlayerId;
                  const isDowned = p.respawnAt !== undefined;
                  const isIt = p.isIt;
                  const px = toMapCoord(p.position[0]);
                  const pz = toMapCoord(p.position[2]);
                  const size = isMe ? 6 : 4;
                  const color = isDowned
                    ? "#555"
                    : isIt
                      ? "#ff3333"
                      : isMe
                        ? "#ffffff"
                        : p.team === "a"
                          ? "#44aaff"
                          : p.team === "b"
                            ? "#ff8844"
                            : "#88ff88";
                  return (
                    <div
                      key={p.id}
                      style={{
                        position: "absolute",
                        left: px - size / 2,
                        top: pz - size / 2,
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        background: color,
                        boxShadow: isMe ? `0 0 4px ${color}` : undefined,
                      }}
                    />
                  );
                })}
              </div>
            );
          })()}

        {/* Crosshair — combat, tag, and gallery modes; follows real mouse cursor */}
        {(gameState.mode === "deathmatch" ||
          gameState.mode === "ctf" ||
          gameState.mode === "tag" ||
          gameState.mode === "shooting_gallery") &&
          respawnSecondsLeft === null &&
          !isMinimal && (
            <div
              style={{
                position: "fixed",
                top: mousePos.y,
                left: mousePos.x,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 997,
                width: `${20 + crosshairSpread * 2}px`,
                height: `${20 + crosshairSpread * 2}px`,
              }}
            >
              {/* Horizontal bar — left segment */}
              {(() => {
                const hitColor =
                  gameState.mode === "shooting_gallery"
                    ? "#ffd700"
                    : "rgba(255,60,60,1)";
                const barColor = hitMarker
                  ? hitColor
                  : "rgba(255,255,255,0.85)";
                return (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        width: `${6 + crosshairSpread}px`,
                        height: "2px",
                        marginTop: "-1px",
                        backgroundColor: barColor,
                        transition: "background-color 0.05s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: 0,
                        width: `${6 + crosshairSpread}px`,
                        height: "2px",
                        marginTop: "-1px",
                        backgroundColor: barColor,
                        transition: "background-color 0.05s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        width: "2px",
                        height: `${6 + crosshairSpread}px`,
                        marginLeft: "-1px",
                        backgroundColor: barColor,
                        transition: "background-color 0.05s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 0,
                        width: "2px",
                        height: `${6 + crosshairSpread}px`,
                        marginLeft: "-1px",
                        backgroundColor: barColor,
                        transition: "background-color 0.05s",
                      }}
                    />
                    {/* Expanding ring — plays once per hit via key change */}
                    {hitRingKey > 0 && (
                      <div
                        key={hitRingKey}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          borderRadius: "50%",
                          border: `2px solid ${hitColor}`,
                          transform: "translate(-50%, -50%)",
                          animation: "hitRingExpand 0.28s ease-out forwards",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          )}

        {/* Bottom-center ammo + health bar — combat, tag, and gallery modes */}
        {(gameState.mode === "deathmatch" ||
          gameState.mode === "ctf" ||
          gameState.mode === "tag" ||
          gameState.mode === "shooting_gallery") &&
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
              {/* Health bar — combat modes only (no health in tag mode) */}
              {gameState.mode !== "tag" &&
                (() => {
                  const hp =
                    currentPlayer.health ?? currentPlayer.maxHealth ?? 100;
                  const maxHp = currentPlayer.maxHealth ?? 100;
                  const frac = Math.max(0, Math.min(1, hp / maxHp));
                  const barColor =
                    frac > 0.5
                      ? "#44ff44"
                      : frac > 0.25
                        ? "#ffaa00"
                        : "#ff3333";
                  return (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "9px",
                            color: barColor,
                            fontWeight: "bold",
                            lineHeight: 1,
                          }}
                        >
                          HP {hp}/{maxHp}
                        </div>
                        <div
                          style={{
                            width: "80px",
                            height: "7px",
                            background: "#1a1a1a",
                            borderRadius: "2px",
                            overflow: "hidden",
                            border: "1px solid #333",
                          }}
                        >
                          <div
                            style={{
                              width: `${frac * 100}%`,
                              height: "100%",
                              background: barColor,
                              transition: "width 0.15s, background 0.3s",
                            }}
                          />
                        </div>
                      </div>
                      <span style={{ color: "#444" }}>|</span>
                    </>
                  );
                })()}
              {/* Weapon name + ammo pips */}
              {currentPlayer.equippedWeaponId &&
                (() => {
                  const wDef = WEAPONS[currentPlayer.equippedWeaponId];
                  const ammo = currentPlayer.currentAmmo;
                  const maxAmmo = wDef?.maxAmmo;
                  const reloadPct = currentPlayer.reloadProgress;
                  const isReloading =
                    reloadPct !== null &&
                    reloadPct !== undefined &&
                    reloadPct < 1;
                  const wColor =
                    currentPlayer.equippedWeaponId === "rocket"
                      ? "#ff4422"
                      : currentPlayer.equippedWeaponId === "grenade"
                        ? "#44ff00"
                        : currentPlayer.equippedWeaponId === "shotgun"
                          ? "#ff9933"
                          : currentPlayer.equippedWeaponId === "smg"
                            ? "#ff44cc"
                            : "#33ffe6";
                  return (
                    <>
                      <span style={{ color: wColor }}>
                        {wDef?.name ?? currentPlayer.equippedWeaponId}
                      </span>
                      {isReloading ? (
                        <span
                          style={{ color: "#ffcc00", letterSpacing: "1px" }}
                        >
                          {" RELOADING "}
                          <span
                            style={{
                              color: "#555",
                              display: "inline-block",
                              width: "40px",
                              background: "#222",
                              borderRadius: "2px",
                              verticalAlign: "middle",
                              height: "6px",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                width: `${((reloadPct ?? 0) * 100).toFixed(0)}%`,
                                background: "#ffcc00",
                                height: "100%",
                              }}
                            />
                          </span>
                        </span>
                      ) : (
                        <span
                          style={{ color: "#aaaaaa", letterSpacing: "1px" }}
                        >
                          {ammo === null || ammo === undefined
                            ? "∞"
                            : maxAmmo && maxAmmo <= 10
                              ? Array.from({ length: maxAmmo }, (_, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      color: i < ammo ? wColor : "#444",
                                    }}
                                  >
                                    ●
                                  </span>
                                ))
                              : `${ammo}`}
                        </span>
                      )}
                      <span style={{ color: "#555", fontSize: "10px" }}>
                        {isReloading ? "" : " [R]=reload"}
                      </span>
                      <span style={{ color: "#555", fontSize: "10px" }}>
                        [1-5]
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
              {(() => {
                const lastDeath = [...(gameState.killFeed ?? [])]
                  .reverse()
                  .find((k) => k.targetId === currentPlayerId);
                return lastDeath ? (
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: isMinimal ? "10px" : "14px",
                      color: "#ffaaaa",
                      marginTop: "4px",
                      letterSpacing: "1px",
                    }}
                  >
                    KILLED BY {lastDeath.killerName.toUpperCase()}
                  </div>
                ) : null;
              })()}
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

        {tensionWarning !== null && (
          <div
            style={{
              position: "fixed",
              top: "22%",
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 994,
              fontFamily: "monospace",
              fontSize: isMinimal ? "11px" : "17px",
              fontWeight: "bold",
              color: "#ff8822",
              textShadow: "0 0 10px #ff4400",
              letterSpacing: "2px",
              whiteSpace: "nowrap",
              animation: "criticalPulse 0.6s ease-in-out infinite alternate",
            }}
          >
            {tensionWarning}
          </div>
        )}

        {visibleStreak !== null &&
          (gameState.mode === "deathmatch" ||
            gameState.mode === "ctf" ||
            gameState.mode === "tag") && (
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
                  color: gameState.mode === "tag" ? "#00ffff" : "#ffcc00",
                  textShadow:
                    gameState.mode === "tag"
                      ? "0 0 18px #0088ff, 0 0 6px #00ffff"
                      : "0 0 18px #ff8800, 0 0 6px #ffcc00",
                  letterSpacing: "3px",
                }}
              >
                {gameState.mode === "tag"
                  ? (TAG_STREAK_LABELS[visibleStreak.count] ??
                    `${visibleStreak.count}x CHAIN`)
                  : (STREAK_LABELS[visibleStreak.count] ??
                    `${visibleStreak.count}x STREAK`)}
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
    const isGallery = gameState.mode === "shooting_gallery";
    const isWinner = isGallery || winner.id === currentPlayerId;
    const scoreLabel =
      gameState.mode === "ctf"
        ? "caps"
        : gameState.mode === "tag"
          ? "pts"
          : isGallery
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
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"}{" "}
                {r.name}
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

  // Low-health vignette: pulsing red edge overlay when HP < 30 in combat modes
  const criticalHealth =
    currentPlayer !== undefined &&
    currentPlayer.health !== undefined &&
    currentPlayer.health < 30 &&
    currentPlayer.respawnAt === undefined &&
    (gameState.mode === "deathmatch" || gameState.mode === "ctf") &&
    gameState.isActive;

  // Game lobby/start screen
  return (
    <>
      {criticalHealth && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 999,
            boxShadow: "inset 0 0 120px 40px rgba(220,0,0,0.55)",
            animation: "criticalPulse 0.8s ease-in-out infinite alternate",
          }}
        />
      )}
      <style>{`
        @keyframes criticalPulse {
          from { opacity: 0.5; }
          to { opacity: 1; }
        }
        @keyframes hitRingExpand {
          from { width: 4px; height: 4px; opacity: 1; }
          to { width: 44px; height: 44px; opacity: 0; }
        }
        .reticle::before, .reticle::after {
          content: "";
          position: absolute;
          background: rgba(255,255,255,0.85);
        }
        .reticle::before {
          width: 14px; height: 2px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .reticle::after {
          width: 2px; height: 14px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
      `}</style>
      {gameState.isActive && !isMobile && (
        <div
          className="reticle"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            width: "20px",
            height: "20px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 1001,
          }}
        />
      )}
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
            style={{
              marginBottom: "8px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
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
            {/* Shooting Gallery — always available solo or multiplayer */}
            <button
              onClick={() => onStartGame("shooting_gallery")}
              style={{
                padding: isMinimal
                  ? "3px 5px"
                  : isMobile
                    ? "6px 8px"
                    : "6px 10px",
                backgroundColor: "rgba(255, 200, 0, 0.85)",
                border: "1px solid #ffd700",
                borderRadius: "3px",
                color: "#111",
                cursor: "pointer",
                fontSize: isMinimal ? "14px" : isMobile ? "14px" : "11px",
                fontWeight: "bold",
                width: "100%",
              }}
            >
              {isMinimal || isMobile ? "🎯" : "🎯 Shooting Gallery"}
            </button>

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
                border: botDebugMode
                  ? "1px solid #dc3545"
                  : "1px solid #ff8c00",
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
    </>
  );
};

export default GameUI;
