import React from "react";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import type { SoloSceneProps } from "./SoloScene.types";
import type { BotConfig as FullBotConfig } from "../../../components/characters/useBotAI";
import type { GameState } from "../../../components/GameManager";

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

  return (
    <>
      <BotCharacter
        targetPosition={botDebugMode ? bot2Position : [0, 0.5, 0]}
        isIt={false}
        targetIsIt={false}
        isPaused={isPaused}
        onTagTarget={() => {}}
        onPositionUpdate={handleBot1PositionUpdate}
        gameState={
          {
            mode: "none",
            isActive: false,
            timeRemaining: 0,
            scores: {},
          } as GameState
        }
        collisionSystem={collisionSystemRef}
        gotTaggedTimestamp={bot1GotTagged}
        config={effectiveBot1Config}
        color="#ff8888"
      />

      {botDebugMode && (
        <BotCharacter
          targetPosition={bot1Position}
          isIt={false}
          targetIsIt={false}
          isPaused={isPaused}
          onTagTarget={() => {}}
          onPositionUpdate={handleBot2PositionUpdate}
          gameState={
            {
              mode: "none",
              isActive: false,
              timeRemaining: 0,
              scores: {},
            } as GameState
          }
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
