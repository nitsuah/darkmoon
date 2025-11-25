import React, { useCallback } from "react";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import type { SoloSceneProps } from "./SoloScene.types";
import type { BotConfig as FullBotConfig } from "../../../components/characters/useBotAI";

const Bots: React.FC<
  Pick<
    SoloSceneProps,
    | "botDebugMode"
    | "bot1Position"
    | "bot2Position"
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
  >
> = ({
  botDebugMode,
  bot1Position,
  bot2Position,
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

  // Bot tag callbacks - handle bot-to-bot tagging
  const handleBot1TagTarget = useCallback(() => {
    if (gameManager && bot1IsIt && bot2IsIt === false) {
      gameManager.tagPlayer("bot-1", "bot-2");
      setBot2GotTagged(Date.now());
    }
  }, [gameManager, bot1IsIt, bot2IsIt, setBot2GotTagged]);

  const handleBot2TagTarget = useCallback(() => {
    if (gameManager && bot2IsIt && bot1IsIt === false) {
      gameManager.tagPlayer("bot-2", "bot-1");
      setBot1GotTagged(Date.now());
    }
  }, [gameManager, bot2IsIt, bot1IsIt, setBot1GotTagged]);

  return (
    <>
      <BotCharacter
        targetPosition={botDebugMode ? bot2Position : [0, 0.5, 0]}
        isIt={bot1IsIt}
        targetIsIt={bot2IsIt}
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
          targetPosition={bot1Position}
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
