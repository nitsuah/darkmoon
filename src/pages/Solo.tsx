import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { io, Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import PerformanceMonitor from "../components/PerformanceMonitor";
import QualitySettings, { QualityLevel } from "../components/QualitySettings";
import ThemeToggle from "../components/ThemeToggle";
import Tutorial from "../components/Tutorial";
import HelpModal from "../components/HelpModal";
import ChatBox from "../components/ChatBox";
import CollisionSystem from "../components/CollisionSystem";
import GameManager, { GameState, Player } from "../components/GameManager";
import GameUI from "../components/GameUI";
import { W, A, S, D, Q, E, SHIFT, SPACE } from "../components/utils";
import { MobileJoystick } from "../components/MobileJoystick";
import { MobileButton } from "../components/MobileButton";
import { useOrientation } from "../components/useOrientation";
import SpacemanModel from "../components/SpacemanModel";
import { BotCharacter } from "../components/characters/BotCharacter";
import type { BotConfig } from "../components/characters/useBotAI";
import {
  PlayerCharacter,
  type PlayerCharacterHandle,
} from "../components/characters/PlayerCharacter";
import "../styles/App.css";
import { getSoundManager } from "../components/SoundManager";
import PauseMenu from "../components/PauseMenu";
import { useNavigate } from "react-router-dom";
import { filterProfanity } from "../lib/constants/profanity";

// Solo mode: no reconnection needed
const MAX_CHAT_MESSAGES = 50;

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// Top-level gated debug logger - only logs in dev
let __isDev = false;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta may not be available
try {
  // access import.meta in a try to avoid environments where it might not be available
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta may not be available
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    __isDev = true;
  }
} catch {
  // ignore
}

// Also enable debug if Node's NODE_ENV is not production (useful in test envs)
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - process may not be defined in browser
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV &&
    process.env.NODE_ENV !== "production"
  ) {
    __isDev = true;
  }
} catch {
  // ignore
}

const debug = (...args: unknown[]) => {
  if (__isDev) {
    console.log(...args);
  }
};

// Dedicated tag debug logger with timestamps and clear prefixes
const tagDebug = (...args: unknown[]) => {
  if (__isDev) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[TAG ${timestamp}]`, ...args);
  }
};

// Bot configurations - extracted from old inline implementations
const BOT1_CONFIG: BotConfig = {
  botSpeed: 1.5,
  sprintSpeed: 2.5,
  fleeSpeed: 1.8,
  tagCooldown: 3000,
  tagDistance: 1.0,
  pauseAfterTag: 3000,
  sprintDuration: 2000,
  sprintCooldown: 5000,
  chaseRadius: 10,
  initialPosition: [-5, 0.5, -5],
  label: "Bot1",
};

const BOT2_CONFIG: BotConfig = {
  botSpeed: 1.6,
  sprintSpeed: 2.6,
  fleeSpeed: 1.9,
  tagCooldown: 1000, // Faster for debug mode
  tagDistance: 1.0,
  pauseAfterTag: 1000, // Faster for debug mode
  sprintDuration: 2000,
  sprintCooldown: 5000,
  chaseRadius: 10,
  initialPosition: [8, 0.5, -8],
  label: "Bot2",
};

const Solo: React.FC = () => {
  const navigate = useNavigate();
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const [clients] = useState<Clients>({});
  const [currentFPS, setCurrentFPS] = useState(60);
  const [quality, setQuality] = useState<QualityLevel>("auto");
  const [isPaused, setIsPaused] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
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
  const [mouseControls, setMouseControls] = useState({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    mouseX: 0,
    mouseY: 0,
  });
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const [joystickCamera, setJoystickCamera] = useState({ x: 0, y: 0 });
  const [playerPosition, setPlayerPosition] = useState<
    [number, number, number]
  >([0, 0.5, 0]);
  const [bot1Position, setBot1Position] = useState<[number, number, number]>([
    -5, 0.5, -5,
  ]);
  const [bot2Position, setBot2Position] = useState<[number, number, number]>([
    5, 0.5, 5,
  ]);
  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  const [botIsIt, setBotIsIt] = useState(false);
  const [bot2IsIt, setBot2IsIt] = useState(false);

  // Timestamps for when bots get tagged (to trigger freeze)
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);

  // Bot debug mode - enables 2 bots playing each other with faster games
  // Can be enabled via: window.enableBotDebug() or UI button
  const [botDebugMode, setBotDebugMode] = useState(false); // Default false - user must enable
  const [showHitboxes, setShowHitboxes] = useState(false);
  const debugRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Mobile jetpack trigger (set to true when double-tap detected)
  const mobileJetpackTrigger = useRef(false);

  const orientation = useOrientation();

  // Detect if device is mobile/touch-enabled
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and small screen
      const hasTouchScreen =
        "ontouchstart" in window ||
        (typeof window !== "undefined" &&
          "navigator" in window &&
          (window.navigator.maxTouchPoints > 0 ||
            // @ts-expect-error - Legacy IE support
            window.navigator.msMaxTouchPoints > 0));
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobileDevice(hasTouchScreen && isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Solo mode: no reconnection refs needed
  const gameManager = useRef<GameManager | null>(null);
  const soundManager = useRef(getSoundManager());
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

  // Quality presets
  const getQualitySettings = (level: QualityLevel) => {
    switch (level) {
      case "low":
        return {
          shadows: false,
          pixelRatio: 1,
          antialias: false,
        };
      case "medium":
        return {
          shadows: true,
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          antialias: true,
        };
      case "high":
        return {
          shadows: true,
          pixelRatio: window.devicePixelRatio,
          antialias: true,
        };
      default: // auto
        return {
          shadows: currentFPS >= 50,
          pixelRatio: currentFPS >= 50 ? window.devicePixelRatio : 1,
          antialias: currentFPS >= 40,
        };
    }
  };

  const qualitySettings = getQualitySettings(quality);

  // Solo mode: no reconnection logic needed
  const connectSocket = useCallback(() => {
    const serverUrl =
      import.meta.env.VITE_SOCKET_SERVER_URL || window.location.origin;
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: false, // Disable auto-reconnection for solo mode
      reconnectionAttempts: 0,
      reconnectionDelay: 0,
      autoConnect: false, // Don't connect automatically
    });

    socket.on("connect", () => {
      debug("Socket connected:", socket.id);

      // Initialize game manager
      if (!gameManager.current) {
        const newGameManager = new GameManager();
        const soloPlayer: Player = {
          id: socket.id || "solo",
          name: "Solo Player",
          isIt: false,
        };
        newGameManager.addPlayer(soloPlayer);
        gameManager.current = newGameManager;
        setGamePlayers(new Map(newGameManager.getPlayers()));
        debug("Game manager initialized for solo");
      }
    });

    socket.on("disconnect", () => {
      debug("Socket disconnected");
    });

    socket.connect();
    setSocketClient(socket);
  }, []);

  // Socket connection setup
  useEffect(() => {
    connectSocket();
    // Solo mode: no cleanup needed since we don't auto-reconnect
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
        setKeysPressed((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ([W, A, S, D, Q, E, SHIFT, SPACE, " "].includes(key)) {
        e.preventDefault();
        setKeysPressed((prev) => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [chatVisible, botDebugMode]);

  // Mouse controls
  useEffect(() => {
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
      setMouseControls((prev) => ({
        ...prev,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent default right-click menu
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Player position tracking
  const handlePlayerPositionUpdate = (position: [number, number, number]) => {
    setPlayerPosition(position);
  };

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
          setGameState(gameManager.current.getGameState());
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
  }, [botDebugMode, gameState.isActive, gameState.mode]);

  // Dev utilities
  useEffect(() => {
    // Expose bot debug toggle to console
    window.enableBotDebug = () => {
      setBotDebugMode(true);
      setShowHitboxes(true);
      console.log("✅ Bot debug mode ENABLED - 2 bots will play tag");
    };

    window.disableBotDebug = () => {
      setBotDebugMode(false);
      setShowHitboxes(false);
      console.log("❌ Bot debug mode DISABLED");
    };

    if (!botDebugMode) {
      console.log(
        "💡 Bot Debug Mode: Type window.enableBotDebug() to enable 2 bots playing tag"
      );
    }

    return () => {
      delete window.enableBotDebug;
      delete window.disableBotDebug;
    };
  }, [botDebugMode]);

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

    setChatMessages((prev) => {
      const updated = [...prev, chatMessage];
      return updated.slice(-MAX_CHAT_MESSAGES);
    });

    socketClient.emit("chat-message", {
      message: filteredMessage,
    });
  };

  const handleStartTagGame = () => {
    if (gameManager.current) {
      gameManager.current.startTagGame();
      setGameState(gameManager.current.getGameState());
    }
  };

  const handleQualityChange = (newQuality: QualityLevel) => {
    setQuality(newQuality);
  };

  const handleToggleSound = () => {
    const newMutedState = !isSoundMuted;
    setIsSoundMuted(newMutedState);
    soundManager.current.setMuted(newMutedState);
  };

  const handleResumeGame = () => {
    setIsPaused(false);
  };

  const handleQuitGame = () => {
    navigate("/");
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
      <Tutorial />
      <ThemeToggle />
      <HelpModal />

      <Canvas
        shadows={qualitySettings.shadows}
        camera={{ position: [0, 5, 10], fov: 60 }}
        dpr={qualitySettings.pixelRatio}
        gl={{ antialias: qualitySettings.antialias }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow={qualitySettings.shadows}
        />

        {/* Grid helper for ground reference */}
        <gridHelper args={[100, 100]} />

        {/* Moon terrain with craters and shadows */}
        {/* Moon surface - Large flat plane */}
        <mesh
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#888888" />
        </mesh>

        {/* Scattered Moon Rocks (collision obstacles) */}
        {[...Array(25)].map((_, i) => {
          const x = (Math.random() - 0.5) * 80;
          const z = (Math.random() - 0.5) * 80;
          const size = 0.5 + Math.random() * 1.5;
          const height = 0.3 + Math.random() * 0.7;
          return (
            <mesh
              key={`rock-${i}`}
              position={[x, height / 2, z]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[size, height, size]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
          );
        })}

        {/* Player Character */}
        <PlayerCharacter
          ref={playerCharacterRef}
          keysPressedRef={keysPressedRef}
          socketClient={socketClient}
          mouseControls={mouseControls}
          clients={clients}
          gameManager={gameManager.current}
          currentPlayerId={socketClient?.id || localPlayerId}
          joystickMove={joystickMove}
          joystickCamera={joystickCamera}
          lastWalkSoundTimeRef={lastWalkSoundTime}
          isPaused={isPaused}
          onPositionUpdate={handlePlayerPositionUpdate}
          playerIsIt={playerIsIt}
          setPlayerIsIt={setPlayerIsIt}
          setBotIsIt={setBotIsIt}
          setBot1GotTagged={setBot1GotTagged}
          setGameState={setGameState}
          showHitboxes={showHitboxes}
          mobileJetpackTrigger={mobileJetpackTrigger}
        />

        {/* Bot Character 1 - Always present in solo mode */}
        <BotCharacter
          targetPosition={botDebugMode ? bot2Position : playerPosition}
          isIt={botIsIt}
          targetIsIt={botDebugMode ? bot2IsIt : playerIsIt}
          isPaused={isPaused}
          onTagTarget={() => {
            if (botDebugMode) {
              // Bot1 tagged Bot2
              tagDebug("🤖 Bot1 tagged Bot2!");
              setBotIsIt(false);
              setBot2IsIt(true);
              setBot2GotTagged(Date.now());
            } else {
              // Bot tagged player
              tagDebug("🤖 Bot tagged Player!");
              setBotIsIt(false);
              setPlayerIsIt(true);
              if (playerCharacterRef.current) {
                playerCharacterRef.current.freezePlayer(3000);
              }
            }
          }}
          onPositionUpdate={(position) => {
            setBot1Position(position);
          }}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot1GotTagged}
          config={BOT1_CONFIG}
          color="#ff8888"
        />

        {/* Bot Character 2 - Only in debug mode */}
        {botDebugMode && (
          <BotCharacter
            targetPosition={bot1Position}
            isIt={bot2IsIt}
            targetIsIt={botIsIt}
            isPaused={isPaused}
            onTagTarget={() => {
              // Bot2 tagged Bot1
              tagDebug("🤖 Bot2 tagged Bot1!");
              setBot2IsIt(false);
              setBotIsIt(true);
              setBot1GotTagged(Date.now());
            }}
            onPositionUpdate={(position) => {
              setBot2Position(position);
            }}
            gameState={gameState}
            collisionSystem={collisionSystemRef}
            gotTaggedTimestamp={bot2GotTagged}
            config={BOT2_CONFIG}
            color="#88ff88"
            labelColor="#00ff00"
          />
        )}

        {/* Other connected players */}
        {Object.entries(clients).map(([id, client]) => {
          const player = gameManager.current?.getPlayers().get(id);
          const isIt = player?.isIt || false;

          return (
            <group key={id} position={client.position}>
              <SpacemanModel color={isIt ? "#ff4444" : "#4a90e2"} isIt={isIt} />
              {/* Player name label */}
              <Text
                position={[0, 2, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {client.name}
              </Text>
            </group>
          );
        })}

        {/* Debug: OrbitControls for camera testing */}
        {/* <OrbitControls /> */}
      </Canvas>

      {/* Mobile Controls */}
      {isMobileDevice && (
        <>
          <MobileJoystick
            position="left"
            onMove={(x, y) => setJoystickMove({ x, y })}
          />
          <MobileJoystick
            position="right"
            onMove={(x, y) => setJoystickCamera({ x, y })}
          />
          <MobileButton
            position="bottom-right"
            label="Jump"
            onPress={() => {
              setKeysPressed((prev) => ({ ...prev, [SPACE]: true }));
            }}
            onRelease={() => {
              setKeysPressed((prev) => ({ ...prev, [SPACE]: false }));
            }}
            onDoublePress={() => {
              // Trigger jetpack via ref
              mobileJetpackTrigger.current = true;
              setKeysPressed((prev) => ({ ...prev, [SPACE]: true }));
            }}
          />
          <MobileButton
            position="bottom-right-2"
            label="Sprint"
            onPress={() => {
              setKeysPressed((prev) => ({ ...prev, [SHIFT]: true }));
            }}
            onRelease={() => {
              setKeysPressed((prev) => ({ ...prev, [SHIFT]: false }));
            }}
          />
        </>
      )}

      {/* Orientation Warning for Mobile */}
      {isMobileDevice && orientation === "portrait" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>📱➡️</div>
          <h2 style={{ color: "white", marginBottom: "10px" }}>
            Please Rotate Your Device
          </h2>
          <p style={{ color: "#ccc", fontSize: "16px" }}>
            This game works best in landscape mode
          </p>
        </div>
      )}

      {/* Game UI Overlay */}
      <GameUI
        gameState={gameState}
        players={gamePlayers}
        currentPlayerId={socketClient?.id || localPlayerId}
        onStartTagGame={handleStartTagGame}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor onFPSUpdate={setCurrentFPS} />

      {/* Quality Settings */}
      <QualitySettings
        currentQuality={quality}
        currentFPS={currentFPS}
        onQualityChange={handleQualityChange}
      />

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu
          onResume={handleResumeGame}
          onQuit={handleQuitGame}
          isSoundMuted={isSoundMuted}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* Chat Box */}
      {chatVisible && (
        <ChatBox
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onClose={() => setChatVisible(false)}
        />
      )}
    </div>
  );
};

export default Solo;
