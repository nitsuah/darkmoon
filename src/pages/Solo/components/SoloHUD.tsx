import React from "react";
import Tutorial from "../../../components/Tutorial";
import HelpModal from "../../../components/HelpModal";
import { MobileControls } from "../../../components/MobileControls";
import GameUI from "../../../components/GameUI";
import PerformanceMonitor from "../../../components/PerformanceMonitor";
import UtilityMenu from "../../../components/UtilityMenu";
import PauseMenu from "../../../components/PauseMenu";
import ChatBox from "../../../components/ChatBox";
import type { ChatMessage } from "../../../lib/hooks/useChatMessages";
import type { GameState, Player } from "../../../components/GameManager";
import type { QualityLevel } from "../../../components/QualitySettings";

interface SoloHUDProps {
  isMobileDevice: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onJumpPress: () => void;
  onJumpRelease: () => void;
  onJumpDoubleTap: () => void;
  onSprintPress: () => void;
  onSprintRelease: () => void;
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
  onStartGame: () => void;
  onEndGame: () => void;
  botDebugMode: boolean;
  onToggleDebug: () => void;
  notifications: Array<{ id: string; message: string; type: string }>;
  addNotification?: (message: string, type?: string) => void;
  currentFPS: number;
  setQuality: React.Dispatch<React.SetStateAction<QualityLevel>>;
  isPaused: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  chatVisible: boolean;
  setChatVisible: (v: boolean) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

const SoloHUD: React.FC<SoloHUDProps> = ({
  isMobileDevice,
  onJoystickMove,
  onJumpPress,
  onJumpRelease,
  onJumpDoubleTap,
  onSprintPress,
  onSprintRelease,
  gameState,
  players,
  currentPlayerId,
  onStartGame,
  onEndGame,
  botDebugMode,
  onToggleDebug,
  notifications,
  currentFPS,
  setQuality,
  isPaused,
  onResume,
  onRestart,
  onQuit,
  chatVisible,
  setChatVisible,
  chatMessages,
  onSendMessage,
}) => {
  return (
    <>
      <Tutorial />
      <HelpModal />

      {/* Mobile Controls */}
      {isMobileDevice && (
        <MobileControls
          onJoystickMove={onJoystickMove}
          onJumpPress={onJumpPress}
          onJumpRelease={onJumpRelease}
          onJumpDoubleTap={onJumpDoubleTap}
          onSprintPress={onSprintPress}
          onSprintRelease={onSprintRelease}
        />
      )}

      {/* Game UI Overlay */}
      <GameUI
        gameState={gameState}
        players={players}
        currentPlayerId={currentPlayerId}
        onStartGame={onStartGame}
        onEndGame={onEndGame}
        botDebugMode={botDebugMode}
        onToggleDebug={onToggleDebug}
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
      <PerformanceMonitor onPerformanceChange={() => {}} />

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
        onResume={onResume}
        onRestart={onRestart}
        onQuit={onQuit}
      />

      {/* Chat Box */}
      <ChatBox
        isVisible={chatVisible}
        onToggle={() => setChatVisible(!chatVisible)}
        messages={chatMessages}
        onSendMessage={onSendMessage}
        currentPlayerId={currentPlayerId}
      />
    </>
  );
};

export default SoloHUD;
