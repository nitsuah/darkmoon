


import * as React from "react";
import { useSoloGame } from "../lib/hooks/useSoloGame";
import { useSocketConnection } from "../lib/hooks/useSocketConnection";
import SoloScene from "./Solo/components/SoloScene";
import SoloHUD from "./Solo/components/SoloHUD";

// CAVEMAN MAKE SOLO SMALL. ONLY ORCHESTRATE. ALL LOGIC IN HOOKS, COMPONENTS.

import { useRef, useState, useCallback } from "react";
import { useNotifications } from "../lib/hooks/useNotifications";
import { useMobileDetection } from "../lib/hooks/useMobileDetection";
import { useRockPositions } from "../lib/hooks/useRockPositions";
import { useQualitySettings } from "../lib/hooks/useQualitySettings";
import { useMouseControls } from "../lib/hooks/useMouseControls";
import { useChatMessages } from "../lib/hooks/useChatMessages";
import { BOT1_CONFIG, BOT2_CONFIG } from "../lib/constants/botConfigs";
import { W, A, S, D, Q, E, SHIFT, SPACE } from "../components/utils";

export default function Solo() {
  // CAVEMAN GET HOOKS
  const { gameManagerRef, initializeForSocket } = useSoloGame();
  const { getSocket, connect } = useSocketConnection();
  const { notifications, addNotification } = useNotifications();
  const isMobileDevice = useMobileDetection();
  const rockPositions = useRockPositions();
  const [currentFPS, setCurrentFPS] = useState(60);
  const { quality, setQuality, qualitySettings } = useQualitySettings(currentFPS);
  const { mouseControls, setMouseControls } = useMouseControls();
  const { chatMessages, chatVisible, setChatVisible, addChatMessage } = useChatMessages();

  // CAVEMAN MAKE REFS
  const playerCharacterRef = useRef(null);
  const keysPressedRef = useRef({});
  const lastWalkSoundTimeRef = useRef(0);
  const clientsRef = useRef({});
  const gameManager = gameManagerRef;
  const [gameState, setGameState] = useState({ mode: "none", isActive: false, timeRemaining: 0, scores: {} });
  const [gamePlayers, setGamePlayers] = useState(new Map());
  const [playerIsIt, setPlayerIsIt] = useState(false);
  const [botDebugMode, setBotDebugMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);
  const playerPositionRef = useRef([0, 0, 0]);
  const bot1PositionRef = useRef([0, 0, 0]);
  const bot2PositionRef = useRef([0, 0, 0]);
  const collisionSystemRef = useRef(null);
  const currentPlayerId = getSocket()?.id || "solo";

  // CAVEMAN HANDLER (EXAMPLE, REAL LOGIC IN COMPONENTS)
  const handleStartGame = () => {};
  const handleEndGame = () => {};
  const handleResumeGame = () => setIsPaused(false);
  const handleQuitGame = () => {};
  const handleSendMessage = (msg) => {};
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
        clients={clientsRef.current}
        gameManager={gameManager.current}
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
