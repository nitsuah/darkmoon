import * as React from "react";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import SpacemanModel from "../SpacemanModel";
import CollisionSystem from "../CollisionSystem";
import { GameState } from "../GameManager";
import { useBotAI, BotConfig } from "./useBotAI";

// Tag debug logger
const tagDebug = (...args: unknown[]) => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
  console.log(`[TAG ${timestamp}]`, ...args);
};

export interface BotCharacterProps {
  targetPositionRef: React.RefObject<[number, number, number]>;
  isPaused: boolean;
  onPositionUpdate: (position: [number, number, number]) => void;
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
  /** Current health (deathmatch/CTF). Drives the health bar. */
  health?: number;
  /** Max health — used to compute the health bar fill fraction. */
  maxHealth?: number;
  gameState: GameState;
  collisionSystem: React.RefObject<CollisionSystem | null>;
  gotTaggedTimestamp?: number;
  showHitboxes?: boolean;
  config: BotConfig;
  color: string;
  labelColor?: string;
}

/**
 * BotCharacter component - renders a bot with AI behavior
 * Used for both Bot1 and Bot2 with different configs
 */
export const BotCharacter: React.FC<BotCharacterProps> = ({
  targetPositionRef,
  isPaused,
  onPositionUpdate,
  isIt,
  targetIsIt,
  onTagTarget,
  onFireAtTarget,
  isDowned,
  team,
  isCarryingFlag,
  targetTeam,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  showHitboxes,
  config,
  color,
  labelColor,
  health,
  maxHealth,
}) => {
  const meshRef = useRef<THREE.Group>(null);

  // Debug: Log when gotTaggedTimestamp changes
  useEffect(() => {
    if (gotTaggedTimestamp && gotTaggedTimestamp > 0) {
      tagDebug(
        `[BotCharacter ${config.label}] gotTaggedTimestamp prop changed to: ${gotTaggedTimestamp}`,
      );
    }
  }, [gotTaggedTimestamp, config.label]);

  // Use bot AI hook for movement and behavior logic
  const { velocity, isSprinting } = useBotAI({
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
  });

  // Patch initialPosition Y to 0.0 for flush floor spawn
  const adjustedInitialPosition: [number, number, number] = [
    config.initialPosition[0],
    0.0,
    config.initialPosition[2],
  ];

  // Health bar geometry — only in combat modes where health matters
  const showHealthBar =
    health !== undefined &&
    maxHealth !== undefined &&
    maxHealth > 0 &&
    gameState.mode !== "tag";
  const healthFraction = showHealthBar
    ? Math.max(0, health as number) / (maxHealth as number)
    : 0;
  const BAR_W = 0.65;
  const fillW = BAR_W * healthFraction;
  const fillX = -(BAR_W - fillW) / 2;
  const fillColor =
    healthFraction > 0.5
      ? "#44ff44"
      : healthFraction > 0.25
        ? "#ffaa00"
        : "#ff3333";

  return (
    <group
      ref={meshRef}
      position={adjustedInitialPosition}
      rotation={[0, Math.PI, 0]}
    >
      <SpacemanModel
        color={isIt ? "#ff4444" : color}
        isIt={isIt}
        velocity={velocity.current}
        cameraRotation={meshRef.current?.rotation?.y ?? 0} // eslint-disable-line react-hooks/refs
        isSprinting={isSprinting.current}
      />
      {/* Bot label sphere above head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={isIt ? "#ff4444" : labelColor || color} />
      </mesh>
      {/* Flag carrier indicator — shown in CTF when this bot holds the flag */}
      {isCarryingFlag && (
        <>
          {/* Glowing yellow diamond above head */}
          <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, Math.PI / 4]}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshBasicMaterial color="#ffee00" />
          </mesh>
          {/* Small flag pole */}
          <mesh position={[0, 2.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
            <meshBasicMaterial color="#888888" />
          </mesh>
        </>
      )}
      {/* Floating name label — always faces camera */}
      <Billboard position={[0, 2.15, 0]}>
        <Text
          fontSize={0.22}
          color={isIt ? "#ff4444" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {config.label}
        </Text>
      </Billboard>
      {/* Health bar — always faces camera via Billboard, hidden in tag mode */}
      {showHealthBar && (
        <Billboard position={[0, 1.9, 0]}>
          {/* Background track */}
          {}
          <mesh>
            <boxGeometry args={[BAR_W, 0.08, 0.01]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          {/* Fill — left-anchored, shrinks right as health drops */}
          {fillW > 0 && (
            <mesh position={[fillX, 0, 0.006]}>
              <boxGeometry args={[fillW, 0.08, 0.01]} />
              <meshBasicMaterial color={fillColor} />
            </mesh>
          )}
        </Billboard>
      )}
      {/* Debug hitbox visualization */}
      {showHitboxes && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#ffff00"
            // eslint-disable-next-line react/no-unknown-property
            wireframe={true}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}
    </group>
  );
};
