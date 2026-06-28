import React from "react";
import Tutorial from "../../../components/Tutorial";
import HelpModal from "../../../components/HelpModal";
import { MobileControls } from "../../../components/MobileControls";
import GameUI from "../../../components/GameUI";
import PerformanceMonitor from "../../../components/PerformanceMonitor";
import UtilityMenu from "../../../components/UtilityMenu";
import PauseMenu from "../../../components/PauseMenu";
import ChatBox from "../../../components/ChatBox";
import { Notification } from "../../../components/21st.dev/Notification";
import type { ChatMessage } from "../../../lib/hooks/useChatMessages";
import type { GameState, Player } from "../../../components/GameManager";
import type { QualityLevel } from "../../../components/QualitySettings";
import "../../../styles/Notification.css";

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
  onStartGame: (mode: string) => void;
  onEndGame: () => void;
  botDebugMode: boolean;
  onToggleDebug: () => void;
  galleryDebugMode?: boolean;
  onToggleGalleryDebug?: () => void;
  autoRestartSecondsLeft?: number | null;
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
  onPerformanceChange: (fps: number) => void;
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
  galleryDebugMode,
  onToggleGalleryDebug,
  autoRestartSecondsLeft,
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
  onPerformanceChange,
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
        galleryDebugMode={galleryDebugMode}
        onToggleGalleryDebug={onToggleGalleryDebug}
        autoRestartSecondsLeft={autoRestartSecondsLeft}
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
          pointerEvents: "none", // Default to none, components can override
          maxWidth: "300px",
        }}
      >
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            id={notification.id}
            message={notification.message}
            type={notification.type as "info" | "error" | "warning" | "success"}
            style={{ pointerEvents: "auto" }}
          />
        ))}
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor onPerformanceChange={onPerformanceChange} />

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
