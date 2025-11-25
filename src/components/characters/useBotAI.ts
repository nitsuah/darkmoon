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
  targetPosition: [number, number, number];
  isPaused: boolean;
  isIt: boolean;
  targetIsIt: boolean;
  onTagTarget: () => void;
  onPositionUpdate: (position: [number, number, number]) => void;
  gameState: GameState;
  collisionSystem: React.RefObject<CollisionSystem>;
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
  targetPosition,
  isPaused,
  isIt,
  targetIsIt,
  onTagTarget,
  onPositionUpdate,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  config,
  meshRef,
}: BotAIProps): BotAIRefs {
  const lastTagTime = useRef(0);
  const isPausedAfterTag = useRef(false);
  const pauseEndTime = useRef(0);
  const lastGotTaggedTimestamp = useRef(0);
  const botVelocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const lastPosition = useRef(new THREE.Vector3(...config.initialPosition));
  const lastReportedPosition = useRef(
    new THREE.Vector3(...config.initialPosition)
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
        `[${config.label}] Got tagged! Freezing for ${config.pauseAfterTag}ms until ${pauseEndTime.current}`
      );
      tagDebug(
        `[${config.label}] Current time: ${Date.now()}, End time: ${
          pauseEndTime.current
        }`
      );
    }
  }, [gotTaggedTimestamp, config.pauseAfterTag, config.label]);

  useFrame((_state, delta) => {
    if (!meshRef.current || isPaused) return;

    const now = Date.now();

    // Check if bot is paused after tagging
    if (isPausedAfterTag.current) {
      if (now >= pauseEndTime.current) {
        isPausedAfterTag.current = false;
        tagDebug(`[${config.label}] Freeze ended at ${now}`);
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
    const targetPos = new THREE.Vector3(...targetPosition);
    const distance = botPos.distanceTo(targetPos);

    // Calculate velocity for animation
    const currentPosVec = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
    const velocityVec = currentPosVec.clone().sub(lastPosition.current);
    botVelocityRef.current = [velocityVec.x, velocityVec.y, velocityVec.z];
    lastPosition.current.copy(currentPosVec);

    // Behavior depends on who is IT (only during active tag games)
    if (isIt && gameState.isActive && gameState.mode === "tag") {
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
          botPos.z + direction.z * currentSpeed * delta
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
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
      } else if (now - lastTagTime.current > config.tagCooldown) {
        // Tag the target!
        tagDebug(
          `🤖 ${config.label} TAGGING TARGET! Distance: ${distance.toFixed(
            2
          )}, Cooldown elapsed: ${now - lastTagTime.current}ms`
        );
        lastTagTime.current = now;
        tagDebug(`  ${config.label} continues moving (no freeze for tagger)`);
        onTagTarget();
      }
    } else if (targetIsIt && gameState.isActive && gameState.mode === "tag") {
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
          botPos.z + direction.z * fleeSpeed * delta
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
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
