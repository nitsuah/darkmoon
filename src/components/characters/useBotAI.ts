import * as React from "react";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CollisionSystem from "../CollisionSystem";
import { GameState } from "../GameManager";
import { createTagLogger } from "../../lib/utils/logger";

const tagDebug = createTagLogger("BotAI");

// Flee speed multiplier for non-IT bots - intentionally slower (70%) so IT bot can catch them
// This makes the game more playable by allowing the chasing bot to successfully tag fleeing bots
const FLEE_SPEED_MULTIPLIER = 0.7;

// How often the bot retries a tag attempt while in range. The actual tag
// cooldown/freeze rules are enforced authoritatively by GameManager.tagPlayer,
// so this only needs to be short enough to avoid stalling once that cooldown
// elapses (it is intentionally much shorter than GameManager's cooldowns).
const TAG_RETRY_INTERVAL_MS = 200;

// Deathmatch engagement range: the bot advances until within this distance,
// then holds position and fires. Kept well under the laser's 30-unit range
// so shots connect reliably.
const FIRE_RANGE = 10;

// How often the bot retries firing while in range. The actual weapon
// cooldown is enforced authoritatively by the parent's WeaponManager (same
// pattern as TAG_RETRY_INTERVAL_MS vs GameManager's tag cooldowns).
const FIRE_RETRY_INTERVAL_MS = 200;

export interface BotConfig {
  botSpeed: number;
  sprintSpeed: number;
  fleeSpeed: number;
  tagCooldown: number;
  tagDistance: number;
  pauseAfterTag: number;
  sprintDuration: number;
  sprintCooldown: number;
  chaseRadius: number;
  initialPosition: [number, number, number];
  label: string;
}

export interface BotAIProps {
  targetPositionRef: React.RefObject<[number, number, number]>;
  isPaused: boolean;
  isIt: boolean;
  targetIsIt: boolean;
  onTagTarget: () => void;
  /** Fired when the bot wants to shoot its target in deathmatch. */
  onFireAtTarget?: () => void;
  /** True while the bot is eliminated and awaiting respawn (deathmatch). */
  isDowned?: boolean;
  /** This bot's team assignment (CTF). */
  team?: "a" | "b";
  /** True while this bot is carrying the enemy flag (CTF). */
  isCarryingFlag?: boolean;
  /** The target's team assignment (CTF) - used to avoid friendly fire. */
  targetTeam?: "a" | "b";
  onPositionUpdate: (position: [number, number, number]) => void;
  gameState: GameState;
  collisionSystem: React.RefObject<CollisionSystem | null>;
  gotTaggedTimestamp?: number;
  config: BotConfig;
  meshRef: React.RefObject<THREE.Group | null>;
}

export interface BotAIRefs {
  velocity: React.RefObject<[number, number, number]>;
  isSprinting: React.RefObject<boolean>;
}

/**
 * Custom hook for bot AI logic
 * Handles movement, chasing, fleeing, tagging, and sprint bursts
 * Returns refs instead of values to avoid triggering re-renders
 */
export function useBotAI({
  targetPositionRef,
  isPaused,
  isIt,
  targetIsIt,
  onTagTarget,
  onFireAtTarget,
  isDowned,
  team,
  isCarryingFlag,
  targetTeam,
  onPositionUpdate,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  config,
  meshRef,
}: BotAIProps): BotAIRefs {
  const lastTagTime = useRef(0);
  const lastFireTime = useRef(0);
  const isPausedAfterTag = useRef(false);
  const pauseEndTime = useRef(0);
  const lastGotTaggedTimestamp = useRef(0);
  const botVelocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const lastPosition = useRef(new THREE.Vector3(...config.initialPosition));
  const lastReportedPosition = useRef(
    new THREE.Vector3(...config.initialPosition),
  );
  const POSITION_UPDATE_THRESHOLD = 0.01; // Only update if moved > 1cm
  const isSprintingRef = useRef(false);
  const sprintEndTime = useRef(0);
  const nextSprintTime = useRef(0);

  // Handle being tagged by target
  useEffect(() => {
    if (
      gotTaggedTimestamp &&
      gotTaggedTimestamp !== lastGotTaggedTimestamp.current
    ) {
      lastGotTaggedTimestamp.current = gotTaggedTimestamp;
      isPausedAfterTag.current = true;
      pauseEndTime.current = gotTaggedTimestamp + config.pauseAfterTag;
      tagDebug(
        `[${config.label}] Got tagged! Freezing for ${config.pauseAfterTag}ms until ${pauseEndTime.current}`,
      );
      tagDebug(
        `[${config.label}] Current time: ${Date.now()}, End time: ${pauseEndTime.current}`,
      );
      // Force bot to update isIt state after pause
      setTimeout(() => {
        tagDebug(`[${config.label}] Pause ended, checking isIt: ${isIt}`);
      }, config.pauseAfterTag + 10);
    }
  }, [gotTaggedTimestamp, config.pauseAfterTag, config.label, isIt]);

  useFrame((_state, delta) => {
    if (!meshRef.current || isPaused) return;

    const now = Date.now();

    // Check if bot is paused after tagging
    if (isPausedAfterTag.current) {
      if (now >= pauseEndTime.current) {
        isPausedAfterTag.current = false;
        tagDebug(`[${config.label}] Freeze ended at ${now}, isIt: ${isIt}`);
        // After pause, check if bot is now IT and should chase
        if (isIt) {
          tagDebug(
            `[${config.label}] Bot is now IT after pause, will chase player.`,
          );
        }
      } else {
        // Bot is frozen, show visual indicator by slightly pulsing scale
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        return; // Skip all movement logic while frozen
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }

    const botPos = meshRef.current.position;
    const targetPos = new THREE.Vector3(
      ...(targetPositionRef.current ?? [0, 0, 0]),
    );
    const distance = botPos.distanceTo(targetPos);

    // Calculate velocity for animation
    const currentPosVec = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
    const velocityVec = currentPosVec.clone().sub(lastPosition.current);
    botVelocityRef.current = [velocityVec.x, velocityVec.y, velocityVec.z];
    lastPosition.current.copy(currentPosVec);

    // Behavior depends on who is IT (only during active tag games)
    if (
      isIt &&
      gameState.isActive &&
      gameState.mode === "tag" &&
      !isPausedAfterTag.current
    ) {
      // Bot is IT - chase target
      if (distance > config.tagDistance) {
        // Sprint burst logic - IT bot sprints more aggressively
        if (now >= nextSprintTime.current && !isSprintingRef.current) {
          isSprintingRef.current = true;
          sprintEndTime.current = now + config.sprintDuration;
          nextSprintTime.current =
            now + config.sprintDuration + config.sprintCooldown;
          tagDebug(`🤖 ${config.label} SPRINT BURST started!`);
        } else if (isSprintingRef.current && now >= sprintEndTime.current) {
          isSprintingRef.current = false;
          tagDebug(`🤖 ${config.label} sprint ended - cooling down`);
        }

        // IT bot moves at sprint speed (faster to catch prey)
        const currentSpeed = isSprintingRef.current
          ? config.sprintSpeed
          : config.botSpeed;

        // Chase target
        const direction = new THREE.Vector3()
          .subVectors(targetPos, botPos)
          .normalize();

        // Calculate new position
        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * currentSpeed * delta,
          botPos.y,
          botPos.z + direction.z * currentSpeed * delta,
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos,
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        // Rotate bot to face target
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      } else if (now - lastTagTime.current > TAG_RETRY_INTERVAL_MS) {
        // In range - attempt to tag. GameManager.tagPlayer is the
        // authoritative gate (cooldowns/freeze), so just retry on a short
        // interval until it succeeds.
        tagDebug(
          `🤖 ${config.label} ATTEMPTING TAG! Distance: ${distance.toFixed(2)}`,
        );
        lastTagTime.current = now;
        onTagTarget();
      }
    } else if (
      targetIsIt &&
      gameState.isActive &&
      gameState.mode === "tag" &&
      !isPausedAfterTag.current
    ) {
      // Target is IT - flee when within detection radius
      // Non-IT bot moves SLOWER so it can be caught (for debugging)
      if (distance < config.chaseRadius) {
        const direction = new THREE.Vector3()
          .subVectors(botPos, targetPos)
          .normalize();

        // Use slower flee speed so IT bot can catch up (see FLEE_SPEED_MULTIPLIER constant)
        const fleeSpeed = config.fleeSpeed * FLEE_SPEED_MULTIPLIER;

        // Calculate new position
        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * fleeSpeed * delta,
          botPos.y,
          botPos.z + direction.z * fleeSpeed * delta,
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos,
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        // Rotate bot to face away from target
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      }
    } else if (gameState.isActive && gameState.mode === "deathmatch") {
      if (isDowned) {
        // Eliminated and awaiting respawn - pulse in place and sit out.
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        return;
      }

      // Always face the target while engaging
      const direction = new THREE.Vector3()
        .subVectors(targetPos, botPos)
        .normalize();
      meshRef.current.rotation.y = Math.atan2(direction.x, direction.z);

      if (distance > FIRE_RANGE) {
        // Advance until within firing range
        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * config.botSpeed * delta,
          botPos.y,
          botPos.z + direction.z * config.botSpeed * delta,
        );

        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos,
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }
      } else if (now - lastFireTime.current > FIRE_RETRY_INTERVAL_MS) {
        // In range - fire. The parent's WeaponManager is the authoritative
        // cooldown gate, so just retry on a short interval.
        lastFireTime.current = now;
        onFireAtTarget?.();
      }
    } else if (gameState.isActive && gameState.mode === "ctf" && team) {
      if (isDowned) {
        // Eliminated and awaiting respawn - pulse in place and sit out.
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        return;
      }

      // Engage an enemy within fire range while pursuing the flag
      // objective below - CTF combat doesn't pause movement to shoot.
      if (
        targetTeam !== undefined &&
        targetTeam !== team &&
        distance <= FIRE_RANGE &&
        now - lastFireTime.current > FIRE_RETRY_INTERVAL_MS
      ) {
        lastFireTime.current = now;
        onFireAtTarget?.();
      }

      // Carrying the enemy flag - head home to capture it. Otherwise grab
      // the enemy flag while it's unguarded, or hold position at our own
      // base to defend it.
      const flags = gameState.flags ?? [];
      const myFlag = flags.find((f) => f.team === team);
      const enemyFlag = flags.find((f) => f.team !== team);

      const destination =
        isCarryingFlag && myFlag
          ? myFlag.basePosition
          : enemyFlag && enemyFlag.carrierId === undefined
            ? enemyFlag.position
            : myFlag?.basePosition;

      if (destination) {
        const destPos = new THREE.Vector3(...destination);

        if (botPos.distanceTo(destPos) > 0.5) {
          const direction = new THREE.Vector3()
            .subVectors(destPos, botPos)
            .normalize();

          const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
          const newPos = new THREE.Vector3(
            botPos.x + direction.x * config.botSpeed * delta,
            botPos.y,
            botPos.z + direction.z * config.botSpeed * delta,
          );

          if (collisionSystem.current) {
            const resolved = collisionSystem.current.checkCollision(
              currentPos,
              newPos,
            );
            botPos.x = resolved.x;
            botPos.z = resolved.z;
          } else {
            botPos.x = newPos.x;
            botPos.z = newPos.z;
          }

          const angle = Math.atan2(direction.x, direction.z);
          meshRef.current.rotation.y = angle;
        }
      }
    }

    // Notify parent of position change (only when position actually changes)
    if (meshRef.current) {
      const pos = meshRef.current.position;
      const distanceMoved = pos.distanceTo(lastReportedPosition.current);

      if (distanceMoved > POSITION_UPDATE_THRESHOLD) {
        onPositionUpdate([pos.x, pos.y, pos.z]);
        lastReportedPosition.current.copy(pos);
      }
    }
  });

  return {
    velocity: botVelocityRef,
    isSprinting: isSprintingRef,
  };
}
