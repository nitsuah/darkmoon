import React, { useCallback } from "react";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import type { SoloSceneProps } from "./SoloScene.types";
import type { BotConfig as FullBotConfig } from "../../../components/characters/useBotAI";

const Bots: React.FC<
  Pick<
    SoloSceneProps,
    | "botDebugMode"
    | "bot1PositionRef"
    | "bot2PositionRef"
    | "isPaused"
    | "handleBot1PositionUpdate"
    | "handleBot2PositionUpdate"
    | "collisionSystemRef"
    | "bot1GotTagged"
    | "bot2GotTagged"
    | "BOT1_CONFIG"
    | "BOT2_CONFIG"
    | "gameManager"
    | "gameState"
    | "setBot1GotTagged"
    | "setBot2GotTagged"
    | "currentPlayerId"
    | "playerIsIt"
    | "playerPositionRef"
  >
> = ({
  botDebugMode,
  bot1PositionRef,
  bot2PositionRef,
  isPaused,
  handleBot1PositionUpdate,
  handleBot2PositionUpdate,
  collisionSystemRef,
  bot1GotTagged,
  bot2GotTagged,
  BOT1_CONFIG,
  BOT2_CONFIG,
  gameManager,
  gameState,
  setBot1GotTagged,
  setBot2GotTagged,
  currentPlayerId,
  playerIsIt,
  playerPositionRef,
}) => {
  // keep default bot config merging inline to preserve behavior
  const DEFAULT_BOT_CONFIG: FullBotConfig = {
    botSpeed: 1.5,
    sprintSpeed: 4,
    fleeSpeed: 1.2,
    tagCooldown: 2000,
    tagDistance: 1.2,
    pauseAfterTag: 1500,
    sprintDuration: 800,
    sprintCooldown: 2000,
    chaseRadius: 8,
    initialPosition: [0, 0.5, 0],
    label: "Bot",
  };

  // BOT1_CONFIG/BOT2_CONFIG may be Partial; merge safely with defaults
  const effectiveBot1Config: FullBotConfig = {
    ...DEFAULT_BOT_CONFIG,
    ...(BOT1_CONFIG || {}),
  };

  const effectiveBot2Config: FullBotConfig = {
    ...DEFAULT_BOT_CONFIG,
    ...(BOT2_CONFIG || {}),
  };

  // Get bot IT status from game manager
  const bot1IsIt = gameManager?.getPlayers().get("bot-1")?.isIt ?? false;
  const bot2IsIt = gameManager?.getPlayers().get("bot-2")?.isIt ?? false;
  // Derive player isIt from gameManager to avoid stale React-state race windows
  const playerIsItFromManager =
    gameManager?.getPlayers().get(currentPlayerId)?.isIt ?? playerIsIt;

  // Bot tag callbacks - handle bot-to-bot tagging
  const handleBot1TagTarget = useCallback(() => {
    if (
      !gameManager ||
      !bot1IsIt ||
      !gameState.isActive ||
      gameState.mode !== "tag"
    ) {
      return;
    }

    const targetId = botDebugMode ? "bot-2" : currentPlayerId;
    const targetIsAlreadyIt = botDebugMode ? bot2IsIt : playerIsItFromManager;

    if (!targetIsAlreadyIt && gameManager.tagPlayer("bot-1", targetId)) {
      if (botDebugMode) {
        setBot2GotTagged(Date.now());
      }
    }
  }, [
    gameManager,
    bot1IsIt,
    gameState.isActive,
    gameState.mode,
    botDebugMode,
    currentPlayerId,
    bot2IsIt,
    playerIsItFromManager,
    setBot2GotTagged,
  ]);

  const handleBot2TagTarget = useCallback(() => {
    if (gameManager && bot2IsIt && bot1IsIt === false) {
      gameManager.tagPlayer("bot-2", "bot-1");
      setBot1GotTagged(Date.now());
    }
  }, [gameManager, bot2IsIt, bot1IsIt, setBot1GotTagged]);

  return (
    <>
      <BotCharacter
        targetPositionRef={botDebugMode ? bot2PositionRef : playerPositionRef}
        isIt={bot1IsIt}
        targetIsIt={botDebugMode ? bot2IsIt : playerIsItFromManager}
        isPaused={isPaused}
        onTagTarget={handleBot1TagTarget}
        onPositionUpdate={handleBot1PositionUpdate}
        gameState={gameState}
        collisionSystem={collisionSystemRef}
        gotTaggedTimestamp={bot1GotTagged}
        config={effectiveBot1Config}
        color="#ff8888"
      />

      {botDebugMode && (
        <BotCharacter
          targetPositionRef={bot1PositionRef}
          isIt={bot2IsIt}
          targetIsIt={bot1IsIt}
          isPaused={isPaused}
          onTagTarget={handleBot2TagTarget}
          onPositionUpdate={handleBot2PositionUpdate}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot2GotTagged}
          config={effectiveBot2Config}
          color="#88ff88"
          labelColor="#00ff00"
        />
      )}
    </>
  );
};

export default Bots;
