import * as React from "react";
import { GameState, KillEvent, Player, StartableMode } from "../GameManager";

import {
  useViewport,
  useStreakAnnouncement,
  useRespawnCountdown,
  useHitDirection,
  useDamageFlash,
  useHitMarker,
  useMousePosition,
  useGalleryHighScore,
  useBonusRound,
  useGalleryCombo,
  useCrosshairSpread,
  useScoreboard,
  usePickupToast,
  useKillAnnouncement,
} from "./hooks/useGameUIState";

import DamageFlash from "./components/DamageFlash";
import HitDirectionIndicator from "./components/HitDirectionIndicator";
import KillAnnouncement from "./components/KillAnnouncement";
import PickupToast from "./components/PickupToast";
import ScoreBoard from "./components/ScoreBoard";
import GameStatusPanel from "./components/GameStatusPanel";
import KillFeed from "./components/KillFeed";
import MinimapRadar from "./components/MinimapRadar";
import Crosshair from "./components/Crosshair";
import BottomHUD from "./components/BottomHUD";
import ReloadMeter from "./components/ReloadMeter";
import DeathScreen from "./components/DeathScreen";
import StreakAnnouncement from "./components/StreakAnnouncement";
import BonusRoundOverlay from "./components/BonusRoundOverlay";
import GameResultsScreen from "./components/GameResultsScreen";
import GameLobbyPanel from "./components/GameLobbyPanel";

interface GameUIProps {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
  onStartGame: (mode: StartableMode) => void;
  onEndGame: () => void;
  onMainMenu: () => void;
  botDebugMode?: boolean;
  onToggleDebug?: () => void;
  galleryDebugMode?: boolean;
  onToggleGalleryDebug?: () => void;
  autoRestartSecondsLeft?: number | null;
}

const COMBAT_MODES = new Set(["deathmatch", "ctf", "tag", "shooting_gallery"]);

const GameUI: React.FC<GameUIProps> = ({
  gameState,
  players,
  currentPlayerId,
  onStartGame,
  onEndGame,
  onMainMenu,
  botDebugMode = false,
  onToggleDebug,
  galleryDebugMode = false,
  onToggleGalleryDebug,
  autoRestartSecondsLeft = null,
}) => {
  const { isMobile, isMinimal } = useViewport();
  const currentPlayer = players.get(currentPlayerId);
  const itPlayer =
    gameState.mode === "tag" ? players.get(gameState.itPlayerId || "") : null;

  const visibleStreak = useStreakAnnouncement(gameState.streakAnnouncement);
  const respawnSecondsLeft = useRespawnCountdown(currentPlayer?.respawnAt);
  const hitAngle = useHitDirection();
  const damageFlash = useDamageFlash(currentPlayer?.health);
  const { hitMarker, hitRingKey } = useHitMarker();
  const mousePos = useMousePosition();
  const { galleryHighScore, isNewRecord } = useGalleryHighScore(gameState);
  const bonusRoundVisible = useBonusRound();
  const { galleryCombo, galleryMultiplier } = useGalleryCombo();
  const crosshairSpread = useCrosshairSpread();
  const showScoreboard = useScoreboard(gameState.isActive);
  const pickupToast = usePickupToast();
  const killAnnouncement = useKillAnnouncement(
    gameState.killFeed,
    currentPlayerId,
  );

  const recentKills: KillEvent[] = (gameState.killFeed ?? []).slice(-5);

  const tensionWarning = React.useMemo((): string | null => {
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
  }, [
    gameState.mode,
    gameState.isActive,
    gameState.killLimit,
    gameState.scores,
    players,
  ]);

  const isSpawnProtected =
    currentPlayer?.spawnProtectedUntil !== undefined &&
    currentPlayer.spawnProtectedUntil > Date.now();

  const isCombat = COMBAT_MODES.has(gameState.mode);
  const showCrosshair = isCombat && respawnSecondsLeft === null && !isMinimal;
  const showBottomHUD =
    isCombat &&
    !isMinimal &&
    Boolean(currentPlayer) &&
    respawnSecondsLeft === null;
  const showMinimap =
    (gameState.mode === "deathmatch" ||
      gameState.mode === "ctf" ||
      gameState.mode === "tag") &&
    !isMinimal;
  const reloadPct = currentPlayer?.reloadProgress ?? null;
  const showReloadMeter =
    showBottomHUD &&
    reloadPct !== null &&
    reloadPct !== undefined &&
    reloadPct < 1;

  // Active game overlay
  if (gameState.isActive) {
    const criticalHealth =
      currentPlayer !== undefined &&
      currentPlayer.health !== undefined &&
      currentPlayer.health < 30 &&
      currentPlayer.respawnAt === undefined &&
      (gameState.mode === "deathmatch" || gameState.mode === "ctf");
    return (
      <>
        <style>{`
          @keyframes criticalPulse { from { opacity: 0.5; } to { opacity: 1; } }
          @keyframes hitRingExpand { from { width: 4px; height: 4px; opacity: 1; } to { width: 44px; height: 44px; opacity: 0; } }
        `}</style>

        <DamageFlash active={damageFlash} />

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

        <HitDirectionIndicator hitAngle={hitAngle} />
        <KillAnnouncement announcement={killAnnouncement} />
        <PickupToast toast={pickupToast} />

        {showScoreboard && !isMinimal && (
          <ScoreBoard
            gameState={gameState}
            players={players}
            currentPlayerId={currentPlayerId}
          />
        )}

        <GameStatusPanel
          gameState={gameState}
          players={players}
          currentPlayer={currentPlayer}
          itPlayer={itPlayer}
          currentPlayerId={currentPlayerId}
          isMinimal={isMinimal}
          isMobile={isMobile}
          onEndGame={onEndGame}
          onMainMenu={onMainMenu}
          botDebugMode={botDebugMode}
          onToggleDebug={onToggleDebug}
          galleryDebugMode={galleryDebugMode}
          onToggleGalleryDebug={onToggleGalleryDebug}
          galleryHighScore={galleryHighScore}
          galleryCombo={galleryCombo}
          galleryMultiplier={galleryMultiplier}
        />

        {!isMinimal && <KillFeed kills={recentKills} />}

        {showMinimap && (
          <MinimapRadar
            gameState={gameState}
            players={players}
            currentPlayerId={currentPlayerId}
          />
        )}

        {showCrosshair && (
          <Crosshair
            mousePos={mousePos}
            crosshairSpread={crosshairSpread}
            hitMarker={hitMarker}
            hitRingKey={hitRingKey}
            isGallery={gameState.mode === "shooting_gallery"}
          />
        )}

        {showBottomHUD && currentPlayer && (
          <BottomHUD currentPlayer={currentPlayer} mode={gameState.mode} />
        )}

        {showReloadMeter && <ReloadMeter isReloading reloadPct={reloadPct!} />}

        <DeathScreen
          respawnSecondsLeft={respawnSecondsLeft}
          isMinimal={isMinimal}
          killFeed={gameState.killFeed}
          currentPlayerId={currentPlayerId}
          mode={gameState.mode}
        />

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

        <StreakAnnouncement
          visibleStreak={visibleStreak}
          mode={gameState.mode}
          isMinimal={isMinimal}
        />

        {gameState.mode === "shooting_gallery" && (
          <BonusRoundOverlay
            visible={bonusRoundVisible}
            isMinimal={isMinimal}
          />
        )}
      </>
    );
  }

  // Results screen
  if (
    !gameState.isActive &&
    gameState.gameResults &&
    gameState.gameResults.length > 0
  ) {
    return (
      <GameResultsScreen
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        isMinimal={isMinimal}
        autoRestartSecondsLeft={autoRestartSecondsLeft}
        galleryHighScore={galleryHighScore}
        isNewRecord={isNewRecord}
        onPlayAgain={() => {
          if (gameState.mode !== "none" && gameState.mode !== "solo") {
            onStartGame(gameState.mode as StartableMode);
          }
        }}
        onMainMenu={onMainMenu}
      />
    );
  }

  // Lobby
  return (
    <GameLobbyPanel
      players={players}
      isMinimal={isMinimal}
      isMobile={isMobile}
      botDebugMode={botDebugMode}
      galleryDebugMode={galleryDebugMode}
      onStartGame={onStartGame}
      onToggleDebug={onToggleDebug}
      onToggleGalleryDebug={onToggleGalleryDebug}
      onMainMenu={onMainMenu}
    />
  );
};

export default GameUI;
