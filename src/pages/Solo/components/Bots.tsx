import React, { useCallback, useRef } from "react";
import { BotCharacter } from "../../../components/characters/BotCharacter";
import type { SoloSceneProps } from "./SoloScene.types";
import type { BotConfig as FullBotConfig } from "../../../components/characters/useBotAI";
import { WeaponManager } from "../../../components/combat/WeaponManager";
import { getSoundManager } from "../../../components/SoundManager";
import { createTagLogger } from "../../../lib/utils/logger";

const tagDebug = createTagLogger("Bots");

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
  // Downed (awaiting respawn) status for deathmatch
  const bot1IsDowned =
    gameManager?.getPlayers().get("bot-1")?.respawnAt !== undefined;
  const bot2IsDowned =
    gameManager?.getPlayers().get("bot-2")?.respawnAt !== undefined;
  // Derive player isIt from gameManager to avoid stale React-state race windows
  const playerIsItFromManager =
    gameManager?.getPlayers().get(currentPlayerId)?.isIt ?? playerIsIt;

  // Debug: Log IT state changes
  React.useEffect(() => {
    // Only log when IT state changes
    tagDebug(
      `bot1IsIt: ${bot1IsIt}, bot2IsIt: ${bot2IsIt}, playerIsIt: ${playerIsItFromManager}`,
    );
  }, [bot1IsIt, bot2IsIt, playerIsItFromManager]);

  // Bot tag callbacks - handle bot-to-bot tagging

  const handleBot1TagTarget = useCallback(() => {
    tagDebug("handleBot1TagTarget called", {
      bot1IsIt,
      isActive: gameState.isActive,
      mode: gameState.mode,
      currentPlayerId,
      playerIsItFromManager,
      bot2IsIt,
      botDebugMode,
    });
    if (
      !gameManager ||
      !bot1IsIt ||
      !gameState.isActive ||
      gameState.mode !== "tag"
    ) {
      tagDebug("Bot1 cannot tag:", {
        bot1IsIt,
        isActive: gameState.isActive,
        mode: gameState.mode,
      });
      return;
    }

    const targetId = botDebugMode ? "bot-2" : currentPlayerId;
    const targetIsAlreadyIt = botDebugMode ? bot2IsIt : playerIsItFromManager;

    if (!targetIsAlreadyIt) {
      tagDebug(`Bot1 attempting to tag ${targetId}`);
      const result = gameManager.tagPlayer("bot-1", targetId);
      tagDebug(`gameManager.tagPlayer('bot-1', ${targetId}) returned:`, result);
      if (result) {
        if (botDebugMode) {
          setBot2GotTagged(Date.now());
        } else if (
          targetId === currentPlayerId &&
          typeof window !== "undefined"
        ) {
          // Trigger player freeze/cooldown after being tagged by bot
          const event = new window.Event("player-tagged-by-bot");
          window.dispatchEvent(event);
        }
      }
    } else {
      tagDebug(`Bot1 target (${targetId}) is already IT, cannot tag.`);
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

  // Shared laser for both bots; WeaponManager tracks per-shooter cooldowns,
  // so one instance is the authoritative fire-rate gate for bot-1 and bot-2.
  // Lazily initialized inside the fire handler to satisfy react-hooks/refs.
  const botWeaponsRef = useRef<WeaponManager | null>(null);

  const fireBotLaser = useCallback(
    (botId: string, targetId: string) => {
      if (
        !gameManager ||
        gameState.mode !== "deathmatch" ||
        !gameState.isActive
      ) {
        return;
      }

      if (!botWeaponsRef.current) {
        botWeaponsRef.current = new WeaponManager();
        botWeaponsRef.current.equip("laser");
      }

      const weapon = botWeaponsRef.current.fire(botId);
      if (!weapon) return; // still on cooldown

      const hitLanded = gameManager.hitPlayer(botId, targetId, weapon.damage);
      if (hitLanded) {
        try {
          getSoundManager()?.playHitSound();
        } catch {
          // sound is best-effort only
        }
      }
    },
    [gameManager, gameState.mode, gameState.isActive],
  );

  const handleBot1FireAtTarget = useCallback(() => {
    fireBotLaser("bot-1", botDebugMode ? "bot-2" : currentPlayerId);
  }, [fireBotLaser, botDebugMode, currentPlayerId]);

  const handleBot2FireAtTarget = useCallback(() => {
    fireBotLaser("bot-2", "bot-1");
  }, [fireBotLaser]);

  return (
    <>
      <BotCharacter
        targetPositionRef={
          botDebugMode ? bot2PositionRef : playerPositionRef // Always use the live player position ref, updated every frame
        }
        isIt={bot1IsIt}
        targetIsIt={botDebugMode ? bot2IsIt : playerIsItFromManager}
        isPaused={isPaused}
        onTagTarget={() => {
          const windowWithPlayerFreeze =
            typeof window === "undefined"
              ? undefined
              : (window as typeof globalThis & {
                  __playerFreezeUntil?: number;
                });

          // Prevent tag if player is frozen/cooldown
          if (
            windowWithPlayerFreeze?.__playerFreezeUntil &&
            Date.now() < windowWithPlayerFreeze.__playerFreezeUntil
          ) {
            tagDebug("Player is frozen/cooldown, cannot tag");
            return;
          }
          handleBot1TagTarget();
        }}
        onFireAtTarget={handleBot1FireAtTarget}
        isDowned={bot1IsDowned}
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
          onFireAtTarget={handleBot2FireAtTarget}
          isDowned={bot2IsDowned}
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
