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
    | "handleBot3PositionUpdate"
    | "collisionSystemRef"
    | "bot1GotTagged"
    | "bot2GotTagged"
    | "bot3GotTagged"
    | "BOT1_CONFIG"
    | "BOT2_CONFIG"
    | "BOT3_CONFIG"
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
  handleBot3PositionUpdate,
  collisionSystemRef,
  bot1GotTagged,
  bot2GotTagged,
  bot3GotTagged,
  BOT1_CONFIG,
  BOT2_CONFIG,
  BOT3_CONFIG,
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

  const effectiveBot3Config: FullBotConfig = {
    ...DEFAULT_BOT_CONFIG,
    ...(BOT3_CONFIG || {}),
  };

  // Get bot IT status from game manager
  const bot1IsIt = gameManager?.getPlayers().get("bot-1")?.isIt ?? false;
  const bot2IsIt = gameManager?.getPlayers().get("bot-2")?.isIt ?? false;
  // Downed (awaiting respawn) status for deathmatch
  const bot1IsDowned =
    gameManager?.getPlayers().get("bot-1")?.respawnAt !== undefined;
  const bot2IsDowned =
    gameManager?.getPlayers().get("bot-2")?.respawnAt !== undefined;
  const bot3IsDowned =
    gameManager?.getPlayers().get("bot-3")?.respawnAt !== undefined;
  // Health for health-bar display in combat modes
  const bot1Health = gameManager?.getPlayers().get("bot-1")?.health;
  const bot1MaxHealth = gameManager?.getPlayers().get("bot-1")?.maxHealth;
  const bot2Health = gameManager?.getPlayers().get("bot-2")?.health;
  const bot2MaxHealth = gameManager?.getPlayers().get("bot-2")?.maxHealth;
  const bot3Health = gameManager?.getPlayers().get("bot-3")?.health;
  const bot3MaxHealth = gameManager?.getPlayers().get("bot-3")?.maxHealth;
  // Team assignment and carried-flag status for CTF
  const bot1Team = gameManager?.getPlayers().get("bot-1")?.team;
  const bot2Team = gameManager?.getPlayers().get("bot-2")?.team;
  const bot3Team = gameManager?.getPlayers().get("bot-3")?.team;
  const bot1CarryingFlag =
    gameState.flags?.some((flag) => flag.carrierId === "bot-1") ?? false;
  const bot2CarryingFlag =
    gameState.flags?.some((flag) => flag.carrierId === "bot-2") ?? false;
  const bot3CarryingFlag =
    gameState.flags?.some((flag) => flag.carrierId === "bot-3") ?? false;
  // Combat mode: bot-2 and bot-3 are AI opponents; bot-3 is combat-only.
  const isCombatMode =
    gameState.mode === "deathmatch" || gameState.mode === "ctf";
  const isTagMode = gameState.mode === "tag";
  const showBot2 =
    botDebugMode ||
    (isCombatMode && gameState.isActive) ||
    (isTagMode && gameState.isActive);
  const showBot3 = isCombatMode && gameState.isActive;

  const isDeathmatch = gameState.mode === "deathmatch";

  // In deathmatch: bots target each other (triangle of fire). Bot-2 targets
  // bot-1; bot-3 targets bot-2. Fall back to player when primary is downed.
  const bot2DmTargetRef =
    isDeathmatch && !bot1IsDowned ? bot1PositionRef : playerPositionRef;
  const bot3DmTargetRef =
    isDeathmatch && !bot2IsDowned ? bot2PositionRef : playerPositionRef;
  // Fire targets mirror position refs.
  const bot2DmFireTarget =
    isDeathmatch && !bot1IsDowned ? "bot-1" : currentPlayerId;
  const bot3DmFireTarget =
    isDeathmatch && !bot2IsDowned ? "bot-2" : currentPlayerId;

  // Team of each bot's current target, so CTF combat doesn't fire on allies.
  const bot1TargetTeam = botDebugMode
    ? bot2Team
    : gameManager?.getPlayers().get(currentPlayerId)?.team;
  // In debug mode bot-2 targets bot-1's team; in deathmatch it targets bot-1's team.
  const bot2TargetTeam = botDebugMode
    ? bot1Team
    : isDeathmatch
      ? bot1Team
      : gameManager?.getPlayers().get(currentPlayerId)?.team;
  // Bot-3 targets bot-2's team in deathmatch; player otherwise.
  const bot3TargetTeam = isDeathmatch
    ? bot2Team
    : gameManager?.getPlayers().get(currentPlayerId)?.team;
  // Derive player isIt from gameManager to avoid stale React-state race windows
  const playerIsItFromManager =
    gameManager?.getPlayers().get(currentPlayerId)?.isIt ?? playerIsIt;

  // Debug: Log IT state changes
  React.useEffect(() => {
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
    if (!gameManager || !bot2IsIt || !gameState.isActive) return;
    if (botDebugMode) {
      // Debug: bot-2 tags bot-1
      if (!bot1IsIt) {
        gameManager.tagPlayer("bot-2", "bot-1");
        setBot1GotTagged(Date.now());
      }
      return;
    }
    // Tag mode: bot-2 tags the player when IT and the player isn't already IT
    if (gameState.mode === "tag" && !playerIsItFromManager) {
      const result = gameManager.tagPlayer("bot-2", currentPlayerId);
      if (result && typeof window !== "undefined") {
        const event = new window.Event("player-tagged-by-bot");
        window.dispatchEvent(event);
      }
    }
  }, [
    gameManager,
    bot2IsIt,
    bot1IsIt,
    gameState.isActive,
    gameState.mode,
    botDebugMode,
    currentPlayerId,
    playerIsItFromManager,
    setBot1GotTagged,
  ]);

  // Each bot gets its own WeaponManager so they can use different weapons.
  // Bot-1: Pulse Shotgun, Bot-2: Rocket Launcher, Bot-3: Frag Grenade.
  const bot1WeaponsRef = useRef<WeaponManager | null>(null);
  const bot2WeaponsRef = useRef<WeaponManager | null>(null);
  const bot3WeaponsRef = useRef<WeaponManager | null>(null);

  const fireBotWeapon = useCallback(
    (botId: string, targetId: string) => {
      if (!gameManager || !gameState.isActive) return;

      const isTagMode = gameState.mode === "tag";
      const isCombatMode =
        gameState.mode === "deathmatch" || gameState.mode === "ctf";

      if (!isTagMode && !isCombatMode) return;

      // In tag mode only the IT bot fires (the laser acts as a ranged tag).
      if (isTagMode) {
        const botPlayer = gameManager.getPlayers().get(botId);
        if (!botPlayer?.isIt) return;
      }

      const weaponRef =
        botId === "bot-1"
          ? bot1WeaponsRef
          : botId === "bot-2"
            ? bot2WeaponsRef
            : bot3WeaponsRef;
      if (!weaponRef.current) {
        weaponRef.current = new WeaponManager();
        const startWeapon = isTagMode
          ? "laser"
          : botId === "bot-1"
            ? "shotgun"
            : botId === "bot-2"
              ? "rocket"
              : "grenade";
        weaponRef.current.equip(startWeapon);
      }

      const weapon = weaponRef.current.fire(botId);
      if (!weapon) {
        // If ammo is depleted (not just on cooldown), refill and keep the
        // specialty weapon so bots remain a persistent threat throughout the round.
        const equipped = weaponRef.current.getEquipped();
        if (equipped) {
          const ammo = weaponRef.current.getAmmo(equipped.id);
          if (ammo !== null && ammo <= 0) {
            weaponRef.current.refillAmmo(equipped.id);
          }
        }
        return;
      }

      const hitLanded = gameManager.hitPlayer(
        botId,
        targetId,
        weapon.damage,
        weapon.id,
      );
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
    fireBotWeapon("bot-1", botDebugMode ? "bot-2" : currentPlayerId);
  }, [fireBotWeapon, botDebugMode, currentPlayerId]);

  const handleBot2FireAtTarget = useCallback(() => {
    // Debug: bot-2 fights bot-1. Deathmatch: also targets bot-1 (fallback player).
    fireBotWeapon("bot-2", botDebugMode ? "bot-1" : bot2DmFireTarget);
  }, [fireBotWeapon, botDebugMode, bot2DmFireTarget]);

  const handleBot3FireAtTarget = useCallback(() => {
    // Deathmatch: bot-3 targets bot-2 (fallback player). Otherwise: player.
    fireBotWeapon("bot-3", bot3DmFireTarget);
  }, [fireBotWeapon, bot3DmFireTarget]);

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
        team={bot1Team}
        isCarryingFlag={bot1CarryingFlag}
        targetTeam={bot1TargetTeam}
        onPositionUpdate={handleBot1PositionUpdate}
        gameState={gameState}
        collisionSystem={collisionSystemRef}
        gotTaggedTimestamp={bot1GotTagged}
        config={effectiveBot1Config}
        color="#ff8888"
        health={bot1Health}
        maxHealth={bot1MaxHealth}
      />

      {showBot2 && (
        <BotCharacter
          targetPositionRef={botDebugMode ? bot1PositionRef : bot2DmTargetRef}
          isIt={bot2IsIt}
          targetIsIt={botDebugMode ? bot1IsIt : playerIsItFromManager}
          isPaused={isPaused}
          onTagTarget={handleBot2TagTarget}
          onFireAtTarget={handleBot2FireAtTarget}
          isDowned={bot2IsDowned}
          team={bot2Team}
          isCarryingFlag={bot2CarryingFlag}
          targetTeam={bot2TargetTeam}
          onPositionUpdate={handleBot2PositionUpdate}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot2GotTagged}
          config={effectiveBot2Config}
          color="#88ff88"
          labelColor="#00ff00"
          health={bot2Health}
          maxHealth={bot2MaxHealth}
        />
      )}

      {showBot3 && (
        <BotCharacter
          targetPositionRef={bot3DmTargetRef}
          isIt={false}
          targetIsIt={playerIsItFromManager}
          isPaused={isPaused}
          onTagTarget={() => {}}
          onFireAtTarget={handleBot3FireAtTarget}
          isDowned={bot3IsDowned}
          team={bot3Team}
          isCarryingFlag={bot3CarryingFlag}
          targetTeam={bot3TargetTeam}
          onPositionUpdate={handleBot3PositionUpdate}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot3GotTagged}
          config={effectiveBot3Config}
          color="#ffaa00"
          labelColor="#ff8800"
          health={bot3Health}
          maxHealth={bot3MaxHealth}
        />
      )}
    </>
  );
};

export default Bots;
