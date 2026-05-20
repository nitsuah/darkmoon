import * as React from "react";
import type CollisionSystem from "../components/CollisionSystem";
import type { GameState, Player } from "../components/GameManager";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import { useSoloGame } from "../lib/hooks/useSoloGame";
import { useSocketConnection } from "../lib/hooks/useSocketConnection";
import SoloScene from "./Solo/components/SoloScene";
import SoloHUD from "./Solo/components/SoloHUD";

// CAVEMAN MAKE SOLO SMALL. ONLY ORCHESTRATE. ALL LOGIC IN HOOKS, COMPONENTS.

import { useRef, useState } from "react";
import { useMobileDetection } from "../lib/hooks/useMobileDetection";
import { useNotifications } from "../lib/hooks/useNotifications";
import { useRockPositions } from "../lib/hooks/useRockPositions";
import { useQualitySettings } from "../lib/hooks/useQualitySettings";
import { useMouseControls } from "../lib/hooks/useMouseControls";
import { useChatMessages } from "../lib/hooks/useChatMessages";
import { BOT1_CONFIG, BOT2_CONFIG } from "../lib/constants/botConfigs";

export default function Solo() {
  // CAVEMAN GET HOOKS
  const { gameManagerRef } = useSoloGame();
  const { getSocket } = useSocketConnection();
  const { notifications } = useNotifications();
  const isMobileDevice = useMobileDetection();
  const rockPositions = useRockPositions();
  const [currentFPS] = useState(60);
  const { setQuality, qualitySettings } = useQualitySettings(currentFPS);
  const { mouseControls } = useMouseControls();
  const { chatMessages, chatVisible, setChatVisible } = useChatMessages();

  // CAVEMAN MAKE REFS
  const playerCharacterRef = useRef<PlayerCharacterHandle | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const lastWalkSoundTimeRef = useRef(0);
  const clients = React.useMemo<
    Record<
      string,
      {
        position: [number, number, number];
        rotation: [number, number, number];
      }
    >
  >(() => ({}), []);
  const gameManager = gameManagerRef.current; // eslint-disable-line react-hooks/refs
  const [gameState, setGameState] = useState<GameState>({
    mode: "none",
    isActive: false,
    timeRemaining: 0,
    scores: {},
  });
  const [gamePlayers] = useState<Map<string, Player>>(new Map());
  const [playerIsIt, setPlayerIsIt] = useState(false);
  const [botDebugMode, setBotDebugMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);
  const playerPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const bot1PositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const bot2PositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const collisionSystemRef = useRef<CollisionSystem | null>(null);
  const currentPlayerId = getSocket()?.id || "solo";

  // CAVEMAN HANDLER (EXAMPLE, REAL LOGIC IN COMPONENTS)
  const handleStartGame = () => {};
  const handleEndGame = () => {};
  const handleResumeGame = () => setIsPaused(false);
  const handleQuitGame = () => {};
  const handleSendMessage: (message: string) => void = () => {};
  const handleBot1PositionUpdate = () => {};
  const handleBot2PositionUpdate = () => {};

  return (
    <>
      <SoloScene
        qualitySettings={qualitySettings}
        rockPositions={rockPositions}
        playerCharacterRef={playerCharacterRef}
        keysPressedRef={keysPressedRef}
        socketClient={getSocket()}
        mouseControls={mouseControls}
        clients={clients}
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        joystickMove={joystickMove}
        lastWalkSoundTimeRef={lastWalkSoundTimeRef}
        isPaused={isPaused}
        onPositionUpdate={() => {}}
        playerIsIt={playerIsIt}
        setPlayerIsIt={setPlayerIsIt}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        gameState={gameState}
        setGameState={setGameState}
        botDebugMode={botDebugMode}
        playerPositionRef={playerPositionRef}
        bot1PositionRef={bot1PositionRef}
        bot2PositionRef={bot2PositionRef}
        collisionSystemRef={collisionSystemRef}
        handleBot1PositionUpdate={handleBot1PositionUpdate}
        handleBot2PositionUpdate={handleBot2PositionUpdate}
        bot1GotTagged={bot1GotTagged}
        bot2GotTagged={bot2GotTagged}
        BOT1_CONFIG={BOT1_CONFIG}
        BOT2_CONFIG={BOT2_CONFIG}
      />
      <SoloHUD
        isMobileDevice={isMobileDevice}
        onJoystickMove={(x, y) => setJoystickMove({ x, y })}
        onJumpPress={() => {}}
        onJumpRelease={() => {}}
        onJumpDoubleTap={() => {}}
        onSprintPress={() => {}}
        onSprintRelease={() => {}}
        gameState={gameState}
        players={gamePlayers}
        currentPlayerId={currentPlayerId}
        onStartGame={handleStartGame}
        onEndGame={handleEndGame}
        botDebugMode={botDebugMode}
        onToggleDebug={() => setBotDebugMode((v) => !v)}
        notifications={notifications}
        currentFPS={currentFPS}
        setQuality={setQuality}
        isPaused={isPaused}
        onResume={handleResumeGame}
        onRestart={() => window.location.reload()}
        onQuit={handleQuitGame}
        chatVisible={chatVisible}
        setChatVisible={setChatVisible}
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
      />
    </>
  );
}
