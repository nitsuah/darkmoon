export default Solo;
// All unreachable code after this line has been deleted.
// All unreachable code below this line has been removed.
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
import { useChatMessages, type ChatMessage } from "../lib/hooks/useChatMessages";

function Solo() {
import * as React from "react";
import SoloScene from "./Solo/components/SoloScene";

const Solo = () => (
  <SoloScene
    qualitySettings={{ shadows: false, pixelRatio: 1, antialias: true }}
    rockPositions={[]}
    playerCharacterRef={React.createRef()}
    keysPressedRef={React.createRef()}
    socketClient={null}
    mouseControls={{ mouseX: 0, mouseY: 0, leftClick: false, rightClick: false, middleClick: false }}
    clients={{}}
    gameManager={null}
    currentPlayerId={"player-1"}
    joystickMove={{ x: 0, y: 0 }}
    lastWalkSoundTimeRef={React.createRef()}
    isPaused={false}
    onPositionUpdate={() => {}}
    playerIsIt={false}
    setPlayerIsIt={() => {}}
    setBot1GotTagged={() => {}}
    setBot2GotTagged={() => {}}
    gameState={{ mode: "tag", isActive: true, timeRemaining: 60, scores: {} }}
    setGameState={() => {}}
    botDebugMode={false}
    playerPositionRef={React.createRef()}
    bot1PositionRef={React.createRef()}
    bot2PositionRef={React.createRef()}
    collisionSystemRef={React.createRef()}
    handleBot1PositionUpdate={() => {}}
    handleBot2PositionUpdate={() => {}}
    bot1GotTagged={0}
    bot2GotTagged={0}
    BOT1_CONFIG={{}}
    BOT2_CONFIG={{}}
  />
);

export default Solo;

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
// Removed misplaced closing bracket and return statement from broken hook

  // Player position tracking - use refs to avoid re-render loops
  const handlePlayerPositionUpdate = useCallback(
    (position: [number, number, number]) => {
      playerPositionRef.current = position;
    },
    [],
  );

  // Bot position tracking - use refs to avoid re-render loops AND update clients object for collision
  const handleBot1PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot1PositionRef.current = position;
      // Update clients ref so PlayerCharacter can detect bot for tagging (no re-render)
      clientsRef.current["bot-1"] = { position, rotation: ZERO_ROTATION };
    },
    [],
  );

  const handleBot2PositionUpdate = useCallback(
    (position: [number, number, number]) => {
      bot2PositionRef.current = position;
      // Update clients ref so PlayerCharacter can detect bot for tagging (no re-render)
      clientsRef.current["bot-2"] = { position, rotation: ZERO_ROTATION };
    },
    [],
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
                "🎮 Forced bot-1 to be IT (debug mode - player cannot be IT)",
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

// (Removed unreachable and duplicate code below this line)
