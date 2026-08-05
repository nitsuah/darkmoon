import * as React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { type Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import CollisionSystem from "../components/CollisionSystem";
import SoloHUD from "./Solo/components/SoloHUD";
import GameManager, { GameState, Player } from "../components/GameManager";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import "../styles/App.css";
import { useNavigate } from "react-router-dom";
import { filterProfanity } from "../lib/constants/profanity";
import { createTagLogger } from "../lib/utils/logger";
import { useSoloGame, attachToConnection } from "../lib/hooks/useSoloGame";
import { useSocketConnection } from "../lib/hooks/useSocketConnection";
import {
  BOT1_CONFIG,
  BOT2_CONFIG,
  BOT3_CONFIG,
  BOT4_CONFIG,
} from "../lib/constants/botConfigs";
import SoloScene from "./Solo/components/SoloScene";
import { W, A, S, D, Q, E, SHIFT, SPACE } from "../components/utils";
import { useNotifications } from "../lib/hooks/useNotifications";
import { useMobileDetection } from "../lib/hooks/useMobileDetection";
import { useRockPositions } from "../lib/hooks/useRockPositions";
import { useQualitySettings } from "../lib/hooks/useQualitySettings";
import { useMouseControls } from "../lib/hooks/useMouseControls";
import {
  useChatMessages,
  type ChatMessage,
} from "../lib/hooks/useChatMessages";
import { useGameStart } from "../lib/hooks/useGameStart";
import { useBotPositionHandlers } from "../lib/hooks/useBotPositionHandlers";
import {
  useBotDebugMode,
  useGalleryDebugMode,
  useAutoRestart,
} from "../lib/hooks/useDebugModes";

const tagDebug = createTagLogger("Solo");

const Solo: React.FC = () => {
  const navigate = useNavigate();
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const clients = useMemo<Clients>(() => ({}), []);
  const clientsRef = useRef<Clients>(clients);
  const [currentFPS, setCurrentFPS] = useState(60);
  const { setQuality, qualitySettings } = useQualitySettings(currentFPS);
  const [isPaused, setIsPaused] = useState(false);
  const [keysPressed, setKeysPressed] = useState<{ [key: string]: boolean }>({
    [W]: false,
    [A]: false,
    [S]: false,
    [D]: false,
    [Q]: false,
    [E]: false,
    [SHIFT]: false,
    [SPACE]: false,
  });
  const { chatMessages, chatVisible, setChatVisible, addChatMessage } =
    useChatMessages();
  const { mouseControls, setMouseControls } = useMouseControls();
  const { notifications, addNotification } = useNotifications();
  const [gameState, setGameState] = useState<GameState>({
    mode: "none",
    isActive: false,
    timeRemaining: 0,
    scores: {},
  });
  const [gamePlayers, setGamePlayers] = useState<Map<string, Player>>(
    new Map(),
  );
  const [localPlayerId] = useState(
    () => `local-${Math.random().toString(36).slice(2, 8)}`,
  );
  const currentPlayerId = socketClient?.id || localPlayerId;
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });

  const playerPositionRef = useRef<[number, number, number]>([0, 0.5, 0]);
  const bot1PositionRef = useRef<[number, number, number]>([-5, 0.5, -5]);
  const bot2PositionRef = useRef<[number, number, number]>([8, 0.5, -8]);
  const bot3PositionRef = useRef<[number, number, number]>([-8, 0.5, 8]);
  const bot4PositionRef = useRef<[number, number, number]>([8, 0.5, 8]);

  const [playerIsIt, setPlayerIsIt] = useState(true);
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);
  const [bot3GotTagged] = useState(0);
  const [bot4GotTagged] = useState(0);

  const [botDebugMode, setBotDebugMode] = useState(false);
  const debugRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [galleryDebugMode, setGalleryDebugMode] = useState(false);
  const galleryDebugRestartRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [autoRestartSecondsLeft, setAutoRestartSecondsLeft] = useState<
    number | null
  >(null);
  const autoRestartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const mobileJetpackTrigger = useRef(false);
  const isMobileDevice = useMobileDetection();

  const gameManager = useRef<GameManager | null>(null);
  const [gameManagerState, setGameManagerState] = useState<GameManager | null>(
    null,
  );
  const lastWalkSoundTime = useRef(0);
  const isPausedRef = useRef(isPaused);
  const chatVisibleRef = useRef(chatVisible);
  const keysPressedRef = useRef(keysPressed);
  const collisionSystemRef = useRef<CollisionSystem>(new CollisionSystem());
  const playerCharacterRef = useRef<PlayerCharacterHandle>(null);

  // Keep refs in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    chatVisibleRef.current = chatVisible;
  }, [chatVisible]);
  useEffect(() => {
    keysPressedRef.current = keysPressed;
  }, [keysPressed]);

  const setKeyState = useCallback((key: string, pressed: boolean) => {
    setKeysPressed((prev) => ({ ...prev, [key]: pressed }));
  }, []);

  const syncGameState = useCallback(() => {
    if (gameManager.current) {
      setGameState(gameManager.current.getGameState());
    }
  }, []);

  // Game timer
  useEffect(() => {
    if (!gameState.isActive || !gameManager.current) return;
    const id = setInterval(() => {
      if (gameManager.current && gameState.isActive) {
        gameManager.current.updateGameTimer(1);
        syncGameState();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [gameState.isActive, syncGameState]);

  const rockPositions = useRockPositions();
  const { initializeForSocket } = useSoloGame();
  const { getSocket, connect: connectSocket } = useSocketConnection({
    autoConnect: false,
    ioOptions: { reconnection: false },
  });

  useEffect(() => {
    const s = getSocket();
    if (s) setSocketClient(s as Socket);
  }, [getSocket]);

  // Socket + GameManager initialization
  useEffect(() => {
    try {
      const maybeSocket = getSocket() || { id: localPlayerId };
      const mgr = initializeForSocket(
        maybeSocket,
        { setGamePlayers, setGameState, setPlayerIsIt },
        botDebugMode ? BOT2_CONFIG : BOT1_CONFIG,
      );
      if (mgr) {
        gameManager.current = mgr;
        setGameManagerState(mgr);
      }
    } catch {
      // ignore init errors in tests / non-browser envs
    }

    const cleanup = attachToConnection(
      getSocket,
      connectSocket,
      initializeForSocket,
      { setGamePlayers, setGameState, setPlayerIsIt },
      botDebugMode ? BOT2_CONFIG : BOT1_CONFIG,
    );

    return () => {
      try {
        cleanup?.();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (chatVisibleRef.current) return;

      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setBotDebugMode((prev) => !prev);
        tagDebug(`Bot debug mode: ${!botDebugMode ? "ENABLED" : "DISABLED"}`);
        return;
      }
      if (e.key === "Escape") {
        setIsPaused((prev) => !prev);
        return;
      }
      if (e.altKey && e.key === "c") {
        setChatVisible((prev) => !prev);
        return;
      }

      const key = e.key.toLowerCase();
      if ([W, A, S, D, Q, E, SHIFT, SPACE, " "].includes(key)) {
        e.preventDefault();
        setKeyState(key, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ([W, A, S, D, Q, E, SHIFT, SPACE, " "].includes(key)) {
        e.preventDefault();
        setKeyState(key, false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [chatVisible, botDebugMode, setChatVisible, setKeyState]);

  // Mouse + touch controls
  useEffect(() => {
    let lastMouseUpdate = 0;
    let activeTouches: { [key: number]: { x: number; y: number } } = {};
    let lastTouchUpdate = 0;
    const INTERVAL = 16;

    const onMouseDown = (e: MouseEvent) =>
      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? true : prev.leftClick,
        rightClick: e.button === 2 ? true : prev.rightClick,
        middleClick: e.button === 1 ? true : prev.middleClick,
      }));

    const onMouseUp = (e: MouseEvent) =>
      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? false : prev.leftClick,
        rightClick: e.button === 2 ? false : prev.rightClick,
        middleClick: e.button === 1 ? false : prev.middleClick,
      }));

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseUpdate < INTERVAL) return;
      lastMouseUpdate = now;
      setMouseControls((prev) => ({
        ...prev,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const isOnJoystick = (
      touches: ArrayLike<{ clientX: number; clientY: number }>,
    ) =>
      Array.from(touches).some((t) =>
        document
          .elementFromPoint(t.clientX, t.clientY)
          ?.closest(".joystick-container"),
      );

    const onTouchStart = (e: globalThis.TouchEvent) => {
      if (isOnJoystick(e.touches)) return;
      Array.from(e.touches).forEach((t) => {
        activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      });
      if (Object.keys(activeTouches).length >= 2) {
        setMouseControls((prev) => ({ ...prev, rightClick: true }));
      }
    };

    const onTouchMove = (e: globalThis.TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchUpdate < INTERVAL) return;
      lastTouchUpdate = now;
      if (isOnJoystick(e.touches)) return;
      Array.from(e.touches).forEach((t) => {
        activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      });
      if (Object.keys(activeTouches).length >= 2) {
        const first = e.touches[0];
        setMouseControls((prev) => ({
          ...prev,
          mouseX: first.clientX,
          mouseY: first.clientY,
          rightClick: true,
        }));
      }
    };

    const onTouchEnd = (e: globalThis.TouchEvent) => {
      const ids = Array.from(e.touches).map((t) => t.identifier);
      const next: typeof activeTouches = {};
      ids.forEach((id) => {
        if (activeTouches[id]) next[id] = activeTouches[id];
      });
      activeTouches = next;
      if (Object.keys(activeTouches).length < 2) {
        setMouseControls((prev) => ({ ...prev, rightClick: false }));
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [setMouseControls]);

  // --- Extracted hooks ---

  const handleStartGame = useGameStart({
    gameManagerRef: gameManager,
    setGameState,
    syncGameState,
    addNotification,
    currentPlayerId,
    BOT2_CONFIG,
    BOT3_CONFIG,
    BOT4_CONFIG,
  });

  const {
    handleBot1PositionUpdate,
    handleBot2PositionUpdate,
    handleBot3PositionUpdate,
    handleBot4PositionUpdate,
  } = useBotPositionHandlers(
    { gameManagerRef: gameManager, clientsRef, addNotification },
    bot1PositionRef,
    bot2PositionRef,
    bot3PositionRef,
    bot4PositionRef,
  );

  useBotDebugMode({
    botDebugMode,
    gameState,
    gameManagerRef: gameManager,
    currentPlayerId,
    setGameState,
    setPlayerIsIt,
    syncGameState,
    addNotification,
    debugRestartTimeoutRef,
  });

  useGalleryDebugMode({
    galleryDebugMode,
    gameState,
    gameManagerRef: gameManager,
    syncGameState,
    galleryDebugRestartRef,
  });

  useAutoRestart({
    gameState,
    autoRestartIntervalRef,
    setAutoRestartSecondsLeft,
    onRestart: handleStartGame,
  });

  // --- Handlers ---

  const handlePlayerPositionUpdate = useCallback(
    (position: [number, number, number]) => {
      playerPositionRef.current = position;
      gameManager.current?.updatePlayerPosition(currentPlayerId, position);

      if (
        gameState.mode === "ctf" &&
        gameState.isActive &&
        gameManager.current
      ) {
        if (gameManager.current.pickupFlag(currentPlayerId)) {
          addNotification(
            "You grabbed the enemy flag! Get it to your base!",
            "warning",
          );
        } else if (gameManager.current.captureFlag(currentPlayerId)) {
          addNotification("Flag captured! Your team scores!", "success");
        }
      }
    },
    [currentPlayerId, gameState.mode, gameState.isActive, addNotification],
  );

  const handleEndGame = useCallback(() => {
    if (!gameManager.current) return;
    const wasMode = gameManager.current.getGameState().mode;
    gameManager.current.endGame();
    if (!botDebugMode) {
      if (wasMode === "deathmatch" || wasMode === "ctf" || wasMode === "tag") {
        gameManager.current.removePlayer("bot-2");
      }
      if (wasMode === "deathmatch" || wasMode === "ctf") {
        gameManager.current.removePlayer("bot-3");
        gameManager.current.removePlayer("bot-4");
      }
    }
    syncGameState();
    addNotification("Game ended", "info");
  }, [botDebugMode, syncGameState, addNotification]);

  const handleSendMessage = (message: string) => {
    if (!socketClient) return;
    const filtered = filterProfanity(message);
    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      playerId: socketClient.id || "unknown",
      playerName: "You",
      message: filtered,
      timestamp: Date.now(),
    };
    addChatMessage(chatMessage);
    socketClient.emit("chat-message", { message: filtered });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <SoloScene
        qualitySettings={qualitySettings}
        rockPositions={rockPositions}
        playerCharacterRef={playerCharacterRef}
        keysPressedRef={keysPressedRef}
        socketClient={socketClient}
        mouseControls={mouseControls}
        clients={clients}
        gameManager={gameManagerState}
        currentPlayerId={currentPlayerId}
        joystickMove={joystickMove}
        lastWalkSoundTimeRef={lastWalkSoundTime}
        isPaused={isPaused}
        onPositionUpdate={handlePlayerPositionUpdate}
        playerIsIt={playerIsIt}
        setPlayerIsIt={setPlayerIsIt}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        gameState={gameState}
        setGameState={setGameState}
        botDebugMode={botDebugMode}
        galleryDebugMode={galleryDebugMode}
        playerPositionRef={playerPositionRef}
        bot1PositionRef={bot1PositionRef}
        bot2PositionRef={bot2PositionRef}
        collisionSystemRef={collisionSystemRef}
        handleBot1PositionUpdate={handleBot1PositionUpdate}
        handleBot2PositionUpdate={handleBot2PositionUpdate}
        handleBot3PositionUpdate={handleBot3PositionUpdate}
        handleBot4PositionUpdate={handleBot4PositionUpdate}
        bot1GotTagged={bot1GotTagged}
        bot2GotTagged={bot2GotTagged}
        bot3GotTagged={bot3GotTagged}
        bot4GotTagged={bot4GotTagged}
        BOT1_CONFIG={BOT1_CONFIG}
        BOT2_CONFIG={BOT2_CONFIG}
        BOT3_CONFIG={BOT3_CONFIG}
        BOT4_CONFIG={BOT4_CONFIG}
      />
      <SoloHUD
        isMobileDevice={isMobileDevice}
        onJoystickMove={(x, y) => setJoystickMove({ x, y })}
        onJumpPress={() => setKeyState(SPACE, true)}
        onJumpRelease={() => setKeyState(SPACE, false)}
        onJumpDoubleTap={() => {
          mobileJetpackTrigger.current = true;
          setKeyState(SPACE, true);
        }}
        onSprintPress={() => setKeyState(SHIFT, true)}
        onSprintRelease={() => setKeyState(SHIFT, false)}
        gameState={gameState}
        players={gamePlayers}
        currentPlayerId={currentPlayerId}
        onStartGame={handleStartGame}
        onEndGame={handleEndGame}
        botDebugMode={botDebugMode}
        onToggleDebug={() => setBotDebugMode((prev) => !prev)}
        galleryDebugMode={galleryDebugMode}
        onToggleGalleryDebug={() => setGalleryDebugMode((prev) => !prev)}
        autoRestartSecondsLeft={autoRestartSecondsLeft}
        notifications={notifications}
        currentFPS={currentFPS}
        setQuality={setQuality}
        isPaused={isPaused}
        onResume={() => setIsPaused(false)}
        onRestart={() => {
          const mode = gameManager.current?.getGameState().mode;
          handleEndGame();
          if (mode && mode !== "none") handleStartGame(mode);
        }}
        onQuit={() => navigate("/")}
        chatVisible={chatVisible}
        setChatVisible={setChatVisible}
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
        onPerformanceChange={setCurrentFPS}
      />
    </div>
  );
};

export default Solo;
