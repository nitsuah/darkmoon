import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { io, Socket } from "socket.io-client";
import type { Clients } from "../types/socket";
import PerformanceMonitor from "../components/PerformanceMonitor";
import UtilityMenu from "../components/UtilityMenu";
import Tutorial from "../components/Tutorial";
import HelpModal from "../components/HelpModal";
import ChatBox from "../components/ChatBox";
import CollisionSystem from "../components/CollisionSystem";
import GameManager, { GameState, Player } from "../components/GameManager";
import GameUI from "../components/GameUI";
import { MobileControls } from "../components/MobileControls";
import SpacemanModel from "../components/SpacemanModel";
import { BotCharacter } from "../components/characters/BotCharacter";
import {
  PlayerCharacter,
  type PlayerCharacterHandle,
} from "../components/characters/PlayerCharacter";
import "../styles/App.css";
import PauseMenu from "../components/PauseMenu";
import { useNavigate } from "react-router-dom";
import { filterProfanity } from "../lib/constants/profanity";
import { createLogger, createTagLogger } from "../lib/utils/logger";
import { BOT1_CONFIG, BOT2_CONFIG } from "../lib/constants/botConfigs";
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
const log = createLogger("Solo");
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
  // Memoize current player ID (avoids repeated conditional checks)
  const currentPlayerId = socketClient?.id || localPlayerId;
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  // joystickCamera removed - right joystick (camera look) disabled on mobile

  // Use refs for positions to avoid re-render loops (bots only need latest values)
  const playerPositionRef = useRef<[number, number, number]>([0, 0.5, 0]);
  const bot1PositionRef = useRef<[number, number, number]>([-5, 0.5, -5]);
  const bot2PositionRef = useRef<[number, number, number]>([8, 0.5, -8]);

  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  const [botIsIt, setBotIsIt] = useState(false);
  const [bot2IsIt, setBot2IsIt] = useState(false);

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
      log.debug("Socket connected:", socket.id);

      // Initialize game manager
      if (!gameManager.current) {
        const newGameManager = new GameManager();

        // Add solo player
        const soloPlayer: Player = {
          id: socket.id || "solo",
          name: "Solo Player",
          position: [0, 1, 0],
          rotation: ZERO_ROTATION,
          isIt: false,
        };
        newGameManager.addPlayer(soloPlayer);

        // Add bot player so tag game can start (needs 2+ players)
        const botPlayer: Player = {
          id: "bot-1",
          name: "Bot",
          position: [5, 0.5, -5],
          rotation: ZERO_ROTATION,
          isIt: false,
        };
        newGameManager.addPlayer(botPlayer);

        // Set up callbacks to sync state
        newGameManager.setCallbacks({
          onGameStateUpdate: (state) => {
            setGameState(state);
          },
          onPlayerUpdate: (players) => {
            setGamePlayers(new Map(players));
            // Sync IT status from GameManager to local state
            const soloPlayerId = socket.id || "solo";
            const soloPlayer = players.get(soloPlayerId);
            const bot1Player = players.get("bot-1");
            const bot2Player = players.get("bot-2");
            if (soloPlayer) setPlayerIsIt(soloPlayer.isIt || false);
            if (bot1Player) setBotIsIt(bot1Player.isIt || false);
            if (bot2Player) setBot2IsIt(bot2Player.isIt || false);
          },
        });

        gameManager.current = newGameManager;
        setGamePlayers(new Map(newGameManager.getPlayers()));
        log.debug("Game manager initialized for solo");
      }
    });

    socket.on("disconnect", () => {
      log.debug("Socket disconnected");
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
              setBotIsIt(true);
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

  // Helper to handle tag events and update game state
  const handleTag = useCallback(
    (
      taggerId: string,
      taggedId: string,
      message: string,
      notificationType: "info" | "success" | "warning" | "error" = "info"
    ) => {
      tagDebug(message);
      addNotification(message, notificationType);

      // Update GameManager
      if (gameManager.current) {
        gameManager.current.updatePlayer(taggerId, { isIt: false });
        gameManager.current.updatePlayer(taggedId, { isIt: true });
        const newState = {
          ...gameManager.current.getGameState(),
          itPlayerId: taggedId,
        };
        gameManager.current["gameState"] = newState;
        setGameState(newState);
      }
    },
    [addNotification]
  );

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
        {rockPositions.map((rock, i) => (
          <mesh
            key={`rock-${i}`}
            position={[rock.x, rock.height / 2, rock.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[rock.size, rock.height, rock.size]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
        ))}

        {/* Player Character */}
        <PlayerCharacter
          ref={playerCharacterRef}
          keysPressedRef={keysPressedRef}
          socketClient={socketClient}
          mouseControls={mouseControls}
          clients={clientsRef.current}
          gameManager={gameManager.current}
          currentPlayerId={currentPlayerId}
          joystickMove={joystickMove}
          joystickCamera={{ x: 0, y: 0 }} // Disabled - right joystick removed
          lastWalkSoundTimeRef={lastWalkSoundTime}
          isPaused={isPaused}
          onPositionUpdate={handlePlayerPositionUpdate}
          playerIsIt={playerIsIt}
          setPlayerIsIt={setPlayerIsIt}
          setBotIsIt={setBotIsIt}
          setBot1GotTagged={setBot1GotTagged}
          setBot2GotTagged={setBot2GotTagged}
          setGameState={setGameState}
          showHitboxes={false}
          mobileJetpackTrigger={mobileJetpackTrigger}
          onTagSuccess={() => addNotification("You tagged the bot!", "success")}
        />

        {/* Bot Character 1 - Always present in solo mode */}
        <BotCharacter
          targetPosition={
            botDebugMode ? bot2PositionRef.current : playerPositionRef.current
          }
          isIt={botIsIt}
          targetIsIt={botDebugMode ? bot2IsIt : playerIsIt}
          isPaused={isPaused}
          onTagTarget={() => {
            if (botDebugMode) {
              // Bot1 tagged Bot2
              setBotIsIt(false);
              setBot2IsIt(true);
              setBot2GotTagged(Date.now());
              handleTag("bot-1", "bot-2", "🤖 Bot1 tagged Bot2!");
            } else {
              // Bot tagged player
              setBotIsIt(false);
              setPlayerIsIt(true);
              if (playerCharacterRef.current) {
                playerCharacterRef.current.freezePlayer(3000);
              }
              handleTag(
                "bot-1",
                currentPlayerId,
                "🤖 Bot tagged Player!",
                "warning"
              );
            }
          }}
          onPositionUpdate={handleBot1PositionUpdate}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot1GotTagged}
          config={BOT1_CONFIG}
          color="#ff8888"
        />

        {/* Bot Character 2 - Only in debug mode */}
        {botDebugMode && (
          <BotCharacter
            targetPosition={bot1PositionRef.current}
            isIt={bot2IsIt}
            targetIsIt={botIsIt}
            isPaused={isPaused}
            onTagTarget={() => {
              // Bot2 tagged Bot1
              setBot2IsIt(false);
              setBotIsIt(true);
              setBot1GotTagged(Date.now());
              handleTag("bot-2", "bot-1", "🤖 Bot2 tagged Bot1!");
            }}
            onPositionUpdate={handleBot2PositionUpdate}
            gameState={gameState}
            collisionSystem={collisionSystemRef}
            gotTaggedTimestamp={bot2GotTagged}
            config={BOT2_CONFIG}
            color="#88ff88"
            labelColor="#00ff00"
          />
        )}

        {/* Other connected players */}
        {Object.entries(clientsRef.current)
          .filter(([id]) => id !== "bot-1" && id !== "bot-2") // Exclude bots - they're rendered as BotCharacter components
          .map(([id, client]) => {
            const player = gameManager.current?.getPlayers().get(id);
            const isIt = player?.isIt || false;

            return (
              <group key={id} position={client.position}>
                <SpacemanModel
                  color={isIt ? "#ff4444" : "#4a90e2"}
                  isIt={isIt}
                />
                {/* Player name label */}
                <Text
                  position={[0, 2, 0]}
                  fontSize={0.3}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                >
                  {player?.name || id.slice(-4)}
                </Text>
              </group>
            );
          })}

        {/* Debug: OrbitControls for camera testing */}
        {/* <OrbitControls /> */}
      </Canvas>

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
