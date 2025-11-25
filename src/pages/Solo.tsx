import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { type Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import PerformanceMonitor from "../components/PerformanceMonitor";
import UtilityMenu from "../components/UtilityMenu";
import Tutorial from "../components/Tutorial";
import HelpModal from "../components/HelpModal";
import ChatBox from "../components/ChatBox";
import CollisionSystem from "../components/CollisionSystem";
import SoloHUD from "./Solo/components/SoloHUD";
import GameManager, { GameState, Player } from "../components/GameManager";
import GameUI from "../components/GameUI";
import { MobileControls } from "../components/MobileControls";
import type { PlayerCharacterHandle } from "../components/characters/PlayerCharacter";
import "../styles/App.css";
import PauseMenu from "../components/PauseMenu";
import { useNavigate } from "react-router-dom";
import { filterProfanity } from "../lib/constants/profanity";
import { createTagLogger } from "../lib/utils/logger";
import { useSoloGame, attachToConnection } from "../lib/hooks/useSoloGame";
import { useSocketConnection } from "../lib/hooks/useSocketConnection";
import { BOT1_CONFIG, BOT2_CONFIG } from "../lib/constants/botConfigs";
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

// Constants
const ZERO_ROTATION: [number, number, number] = [0, 0, 0];

// Create loggers for this module
const tagDebug = createTagLogger("Solo");

const Solo: React.FC = () => {
  const navigate = useNavigate();
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const clientsRef = useRef<Clients>({}); // Use ref to avoid re-render loops
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
    new Map()
  );
  // Generate stable local ID using useState with lazy initializer (React-approved pattern)
  const [localPlayerId] = useState(
    () => `local-${Math.random().toString(36).slice(2, 8)}`
  );
  // Derived current player ID: prefer socketClient.id when connected, otherwise use the stable localPlayerId
  const currentPlayerId = socketClient?.id || localPlayerId;
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  // joystickCamera removed - right joystick (camera look) disabled on mobile

  // Use refs for positions to avoid re-render loops (bots only need latest values)
  const playerPositionRef = useRef<[number, number, number]>([0, 0.5, 0]);
  const bot1PositionRef = useRef<[number, number, number]>([-5, 0.5, -5]);
  const bot2PositionRef = useRef<[number, number, number]>([8, 0.5, -8]);

  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  // Bot IT states are tracked via GameManager; local flags removed

  // Timestamps for when bots get tagged (to trigger freeze)
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);

  // Bot debug mode - enables 2 bots playing each other with faster games
  const [botDebugMode, setBotDebugMode] = useState(false); // Default false - user must enable
  const debugRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Mobile jetpack trigger (set to true when double-tap detected)
  const mobileJetpackTrigger = useRef(false);

  // Detect if device is mobile/touch-enabled
  const isMobileDevice = useMobileDetection();

  // Solo mode: no reconnection refs needed
  const gameManager = useRef<GameManager | null>(null);
  const lastWalkSoundTime = useRef(0);
  const isPausedRef = useRef(isPaused);
  const chatVisibleRef = useRef(chatVisible);
  const keysPressedRef = useRef(keysPressed);
  const collisionSystemRef = useRef(new CollisionSystem());
  const playerCharacterRef = useRef<PlayerCharacterHandle>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    chatVisibleRef.current = chatVisible;
  }, [chatVisible]);

  useEffect(() => {
    keysPressedRef.current = keysPressed;
  }, [keysPressed]);

  // Helper to update individual key states
  const setKeyState = useCallback((key: string, pressed: boolean) => {
    setKeysPressed((prev) => ({ ...prev, [key]: pressed }));
  }, []);

  // Helper to sync game state from manager
  const syncGameState = useCallback(() => {
    if (gameManager.current) {
      setGameState(gameManager.current.getGameState());
    }
  }, []);

  // Game timer update - runs every second when game is active
  useEffect(() => {
    if (!gameState.isActive || !gameManager.current) return;

    const timerInterval = setInterval(() => {
      if (gameManager.current && gameState.isActive) {
        gameManager.current.updateGameTimer(1); // Update by 1 second
        syncGameState();
      }
    }, 1000); // Every 1 second

    return () => clearInterval(timerInterval);
  }, [gameState.isActive, syncGameState]);

  // Generate stable rock positions once (prevents respawning every frame)
  const rockPositions = useRockPositions();

  const { initializeForSocket } = useSoloGame();

  // Create and connect socket using shared hook (solo mode disables auto-reconnect)
  const { getSocket, connect: connectSocket } = useSocketConnection({
    autoConnect: false,
    ioOptions: { reconnection: false },
  });

  // Mirror hook socket into local state for components that expect Socket | null
  useEffect(() => {
    const s = getSocket();
    if (s) setSocketClient(s as Socket);
  }, [getSocket]);

  // Socket connection setup - ensure a local GameManager exists even if the
  // socket never connects (solo practice). Attach real socket lifecycle
  // afterwards so the manager is reused when the socket connects.
  useEffect(() => {
    try {
      const maybeSocket = getSocket() || { id: localPlayerId };
      const mgr = initializeForSocket(maybeSocket, {
        setGamePlayers,
        setGameState,
        setPlayerIsIt,
      });
      if (mgr) gameManager.current = mgr;
    } catch {
      // ignore initialization errors in tests or non-browser envs
    }

    const cleanup = attachToConnection(
      getSocket,
      connectSocket,
      initializeForSocket,
      {
        setGamePlayers,
        setGameState,
        setPlayerIsIt,
      }
    );

    return () => {
      try {
        if (cleanup) {
          cleanup();
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if chat is open
      if (chatVisibleRef.current) return;

      // Debug hotkey: Ctrl+Shift+D to toggle bot debug mode
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setBotDebugMode((prev) => !prev);
        tagDebug(`Bot debug mode: ${!botDebugMode ? "ENABLED" : "DISABLED"}`);
        return;
      }

      // Pause toggle on ESC
      if (e.key === "Escape") {
        setIsPaused((prev) => !prev);
        return;
      }

      // Alt+C to toggle chat
      if (e.altKey && e.key === "c") {
        setChatVisible((prev) => !prev);
        return;
      }

      // Movement keys
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

  // Mouse controls
  useEffect(() => {
    let lastMouseUpdate = 0;
    const MOUSE_UPDATE_INTERVAL = 16; // ~60fps throttle

    // Two-finger touch tracking for mobile camera rotation
    let activeTouches: { [key: number]: { x: number; y: number } } = {};
    let lastTouchUpdate = 0;
    const TOUCH_UPDATE_INTERVAL = 16; // ~60fps throttle

    const handleMouseDown = (e: MouseEvent) => {
      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? true : prev.leftClick,
        rightClick: e.button === 2 ? true : prev.rightClick,
        middleClick: e.button === 1 ? true : prev.middleClick,
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? false : prev.leftClick,
        rightClick: e.button === 2 ? false : prev.rightClick,
        middleClick: e.button === 1 ? false : prev.middleClick,
      }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseUpdate < MOUSE_UPDATE_INTERVAL) return;
      lastMouseUpdate = now;

      setMouseControls((prev) => ({
        ...prev,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent default right-click menu
    };

    // Two-finger touch handlers for mobile camera rotation
    const handleTouchStart = (e: globalThis.TouchEvent) => {
      // Check if any touch is on a joystick element
      const touchesOnJoystick = Array.from(e.touches).some((touch) => {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        return element?.closest(".joystick-container");
      });

      // Don't handle if touching joystick
      if (touchesOnJoystick) return;

      // Track all touches
      Array.from(e.touches).forEach((touch) => {
        activeTouches[touch.identifier] = {
          x: touch.clientX,
          y: touch.clientY,
        };
      });

      // If we have 2+ touches, simulate right-click for camera rotation
      if (Object.keys(activeTouches).length >= 2) {
        setMouseControls((prev) => ({
          ...prev,
          rightClick: true,
        }));
      }
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchUpdate < TOUCH_UPDATE_INTERVAL) return;
      lastTouchUpdate = now;

      // Check if any touch is on a joystick element
      const touchesOnJoystick = Array.from(e.touches).some((touch) => {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        return element?.closest(".joystick-container");
      });

      // Don't handle if touching joystick
      if (touchesOnJoystick) return;

      // Update active touches
      Array.from(e.touches).forEach((touch) => {
        activeTouches[touch.identifier] = {
          x: touch.clientX,
          y: touch.clientY,
        };
      });

      // If we have 2+ touches, use the first touch for camera movement
      if (Object.keys(activeTouches).length >= 2) {
        const firstTouch = e.touches[0];
        setMouseControls((prev) => ({
          ...prev,
          mouseX: firstTouch.clientX,
          mouseY: firstTouch.clientY,
          rightClick: true,
        }));
      }
    };

    const handleTouchEnd = (e: globalThis.TouchEvent) => {
      // Remove ended touches
      const currentTouchIds = Array.from(e.touches).map((t) => t.identifier);
      const newActiveTouches: { [key: number]: { x: number; y: number } } = {};

      currentTouchIds.forEach((id) => {
        if (activeTouches[id]) {
          newActiveTouches[id] = activeTouches[id];
        }
      });

      activeTouches = newActiveTouches;

      // If we have fewer than 2 touches, stop camera rotation
      if (Object.keys(activeTouches).length < 2) {
        setMouseControls((prev) => ({
          ...prev,
          rightClick: false,
        }));
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("contextmenu", handleContextMenu);

    // Add touch listeners for two-finger camera rotation
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [setMouseControls]);

  // Player position tracking - use refs to avoid re-render loops
  const handlePlayerPositionUpdate = useCallback(
    (position: [number, number, number]) => {
      playerPositionRef.current = position;
    },
    []
  );

  // Bot position tracking - use refs to avoid re-render loops AND update clients object for collision
  const handleBot1PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot1PositionRef.current = position;
      // Update clients ref so PlayerCharacter can detect bot for tagging (no re-render)
      clientsRef.current["bot-1"] = { position, rotation: ZERO_ROTATION };
    },
    []
  );

  const handleBot2PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot2PositionRef.current = position;
      // Update clients ref so PlayerCharacter can detect bot for tagging (no re-render)
      clientsRef.current["bot-2"] = { position, rotation: ZERO_ROTATION };
    },
    []
  );

  // Bot debug mode auto-restart when game ends
  useEffect(() => {
    if (botDebugMode && !gameState.isActive && gameState.mode !== "none") {
      tagDebug("🔄 Bot debug mode: Game ended, restarting in 3 seconds...");
      // Clear any existing timeout
      if (debugRestartTimeoutRef.current) {
        clearTimeout(debugRestartTimeoutRef.current);
      }
      // Set new timeout for auto-restart
      debugRestartTimeoutRef.current = setTimeout(() => {
        if (gameManager.current) {
          tagDebug("🎮 Bot debug mode: Starting new tag game!");
          gameManager.current.startTagGame();
          syncGameState();
        }
      }, 3000);
    }

    // Cleanup timeout on unmount or when effect re-runs
    return () => {
      if (debugRestartTimeoutRef.current) {
        clearTimeout(debugRestartTimeoutRef.current);
        debugRestartTimeoutRef.current = null;
      }
    };
  }, [botDebugMode, gameState.isActive, gameState.mode, syncGameState]);

  // Add/remove Bot2 when debug mode toggles
  useEffect(() => {
    if (!gameManager.current) return;

    if (botDebugMode) {
      // Add Bot2 to game manager
      const bot2Player: Player = {
        id: "bot-2",
        name: "Bot2",
        position: [8, 0.5, -8], // Match BOT2_CONFIG initial position
        rotation: ZERO_ROTATION,
        isIt: false,
      };
      gameManager.current.addPlayer(bot2Player);
      tagDebug("🤖 Bot2 added to game (debug mode)");

      // Auto-start tag game in debug mode (2 bots playing)
      if (!gameState.isActive) {
        setTimeout(() => {
          if (gameManager.current) {
            gameManager.current.startTagGame();
            const newGameState = gameManager.current.getGameState();

            // FORCE a bot to be IT in debug mode (never the player)
            const itPlayerId = newGameState.itPlayerId;

            if (itPlayerId === currentPlayerId) {
              // Player was randomly selected as IT - change it to bot-1
              newGameState.itPlayerId = "bot-1";
              gameManager.current["gameState"] = newGameState;
              gameManager.current.updatePlayer(currentPlayerId, {
                isIt: false,
              });
              gameManager.current.updatePlayer("bot-1", { isIt: true });
              setPlayerIsIt(false);
              tagDebug(
                "🎮 Forced bot-1 to be IT (debug mode - player cannot be IT)"
              );
            }

            setGameState(newGameState);
            addNotification("Debug mode: Bot tag game started!", "info");
            tagDebug("🎮 Auto-started tag game for debug mode");
          }
        }, 500); // Small delay to ensure bot is registered
      }
    } else {
      // Remove Bot2 from game manager
      gameManager.current.removePlayer("bot-2");
      tagDebug("🤖 Bot2 removed from game");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botDebugMode, addNotification, gameState.isActive]);

  const handleSendMessage = (message: string) => {
    if (!socketClient) return;

    // Filter profanity before sending
    const filteredMessage = filterProfanity(message);

    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      playerId: socketClient.id || "unknown",
      playerName: "You",
      message: filteredMessage,
      timestamp: Date.now(),
    };

    addChatMessage(chatMessage);

    socketClient.emit("chat-message", {
      message: filteredMessage,
    });
  };

  const handleStartTagGame = () => {
    if (gameManager.current) {
      gameManager.current.startTagGame();
      const newGameState = gameManager.current.getGameState();
      setGameState(newGameState);

      // Show correct notification based on who is IT
      const itPlayerId = newGameState.itPlayerId;

      if (itPlayerId === currentPlayerId) {
        addNotification("Tag game started! You're IT!", "warning");
      } else {
        const itPlayer = gameManager.current.getPlayers().get(itPlayerId || "");
        const itName = itPlayer?.name || "Someone";
        addNotification(`Tag game started! ${itName} is IT!`, "info");
      }
    }
  };

  const handleEndGame = useCallback(() => {
    if (gameManager.current) {
      gameManager.current.endGame();
      syncGameState();
      addNotification("Game ended", "info");
    }
  }, [syncGameState, addNotification]);

  const handleResumeGame = () => {
    setIsPaused(false);
  };

  const handleQuitGame = () => {
    navigate("/");
  };

  // Previously handled tag events here; logic now moves through GameManager callbacks

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Tutorial />
      <HelpModal />

      <SoloScene
        qualitySettings={qualitySettings}
        rockPositions={rockPositions}
        playerCharacterRef={playerCharacterRef}
        keysPressedRef={keysPressedRef}
        socketClient={socketClient}
        mouseControls={mouseControls}
        clients={clientsRef.current}
        gameManager={gameManager.current}
        currentPlayerId={currentPlayerId}
        joystickMove={joystickMove}
        lastWalkSoundTimeRef={lastWalkSoundTime}
        isPaused={isPaused}
        onPositionUpdate={handlePlayerPositionUpdate}
        playerIsIt={playerIsIt}
        setPlayerIsIt={setPlayerIsIt}
        setBot1GotTagged={setBot1GotTagged}
        setBot2GotTagged={setBot2GotTagged}
        setGameState={setGameState}
        botDebugMode={botDebugMode}
        bot1Position={bot1PositionRef.current}
        bot2Position={bot2PositionRef.current}
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
        onStartGame={handleStartTagGame}
        onEndGame={handleEndGame}
        botDebugMode={botDebugMode}
        onToggleDebug={() => setBotDebugMode((prev) => !prev)}
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

      {/* Mobile Controls */}
      {isMobileDevice && (
        <MobileControls
          onJoystickMove={(x, y) => setJoystickMove({ x, y })}
          onJumpPress={() => setKeyState(SPACE, true)}
          onJumpRelease={() => setKeyState(SPACE, false)}
          onJumpDoubleTap={() => {
            mobileJetpackTrigger.current = true;
            setKeyState(SPACE, true);
          }}
          onSprintPress={() => setKeyState(SHIFT, true)}
          onSprintRelease={() => setKeyState(SHIFT, false)}
        />
      )}

      {/* Game UI Overlay */}
      <GameUI
        gameState={gameState}
        players={gamePlayers}
        currentPlayerId={currentPlayerId}
        onStartGame={handleStartTagGame}
        onEndGame={handleEndGame}
        botDebugMode={botDebugMode}
        onToggleDebug={() => setBotDebugMode((prev) => !prev)}
      />

      {/* Notifications */}
      <div
        style={{
          position: "fixed",
          top: "180px",
          right: "10px",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
          maxWidth: "300px",
        }}
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              padding: "12px 16px",
              backgroundColor:
                notification.type === "success"
                  ? "rgba(0, 200, 0, 0.9)"
                  : notification.type === "warning"
                  ? "rgba(255, 165, 0, 0.9)"
                  : notification.type === "error"
                  ? "rgba(200, 0, 0, 0.9)"
                  : "rgba(74, 144, 226, 0.9)",
              color: "white",
              borderRadius: "6px",
              fontFamily: "monospace",
              fontSize: "14px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              animation: "slideIn 0.3s ease-out",
              minWidth: "200px",
              textAlign: "center",
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor onPerformanceChange={setCurrentFPS} />

      {/* Utility Menu (Mute, Quality Settings, Chat) */}
      <UtilityMenu
        onToggleChat={() => setChatVisible(!chatVisible)}
        isChatVisible={chatVisible}
        currentFPS={currentFPS}
        onQualityChange={setQuality}
      />

      {/* Pause Menu */}
      <PauseMenu
        isVisible={isPaused}
        onResume={handleResumeGame}
        onRestart={() => window.location.reload()}
        onQuit={handleQuitGame}
      />

      {/* Chat Box */}
      <ChatBox
        isVisible={chatVisible}
        onToggle={() => setChatVisible(!chatVisible)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
};

export default Solo;
