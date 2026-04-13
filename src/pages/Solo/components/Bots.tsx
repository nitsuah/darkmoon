import React, { useCallback, useState, useEffect } from "react";
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
    | "playerMeshRef"
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
  playerMeshRef,
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

  // Debug: Log IT state changes
  React.useEffect(() => {
    // Only log when IT state changes
    console.log(
      `[DEBUG] bot1IsIt: ${bot1IsIt}, bot2IsIt: ${bot2IsIt}, playerIsIt: ${playerIsItFromManager}`
    );
  }, [bot1IsIt, bot2IsIt, playerIsItFromManager]);

  // Force a re-render when bot1IsIt changes to ensure bot AI logic is fresh
  const [forceUpdate, setForceUpdate] = useState(0);
  useEffect(() => {
    setForceUpdate((n) => n + 1);
  }, [bot1IsIt]);

  // Bot tag callbacks - handle bot-to-bot tagging

  const handleBot1TagTarget = useCallback(() => {
    console.log("[BOT-TAG-DEBUG] handleBot1TagTarget called", {
      bot1IsIt,
      isActive: gameState.isActive,
      mode: gameState.mode,
      currentPlayerId,
      playerIsItFromManager,
      bot2IsIt,
      botDebugMode
    });
    if (
      !gameManager ||
      !bot1IsIt ||
      !gameState.isActive ||
      gameState.mode !== "tag"
    ) {
      console.log("[BOT-TAG-DEBUG] Bot1 cannot tag:", {
        bot1IsIt,
        isActive: gameState.isActive,
        mode: gameState.mode,
      });
      return;
    }

    const targetId = botDebugMode ? "bot-2" : currentPlayerId;
    const targetIsAlreadyIt = botDebugMode ? bot2IsIt : playerIsItFromManager;

    if (!targetIsAlreadyIt) {
      console.log(`[BOT-TAG-DEBUG] Bot1 attempting to tag ${targetId}`);
      const result = gameManager.tagPlayer("bot-1", targetId);
      console.log(`[BOT-TAG-DEBUG] gameManager.tagPlayer('bot-1', ${targetId}) returned:`, result);
      if (result) {
        if (botDebugMode) {
          setBot2GotTagged(Date.now());
        } else if (targetId === currentPlayerId && typeof window !== "undefined") {
          // Trigger player freeze/cooldown after being tagged by bot
          const event = new CustomEvent("player-tagged-by-bot");
          window.dispatchEvent(event);
        }
      }
    } else {
      console.log(`[BOT-TAG-DEBUG] Bot1 target (${targetId}) is already IT, cannot tag.`);
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
        targetPositionRef={
          botDebugMode
            ? bot2PositionRef
            : playerPositionRef // Always use the live player position ref, updated every frame
        }
        isIt={bot1IsIt}
        targetIsIt={botDebugMode ? bot2IsIt : playerIsItFromManager}
        isPaused={isPaused}
        onTagTarget={() => {
          // Prevent tag if player is frozen/cooldown
          if (typeof window !== "undefined" && window.__playerFreezeUntil && Date.now() < window.__playerFreezeUntil) {
            console.log("[BOT-TAG-DEBUG] Player is frozen/cooldown, cannot tag");
            return;
          }
          handleBot1TagTarget();
        }}
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
