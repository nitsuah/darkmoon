import * as React from "react";
import { useRef, useEffect } from "react";
import * as THREE from "three";
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
  targetPosition: [number, number, number];
  isPaused: boolean;
  onPositionUpdate: (position: [number, number, number]) => void;
  isIt: boolean;
  targetIsIt: boolean;
  onTagTarget: () => void;
  gameState: GameState;
  collisionSystem: React.RefObject<CollisionSystem>;
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
  targetPosition,
  isPaused,
  onPositionUpdate,
  isIt,
  targetIsIt,
  onTagTarget,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  showHitboxes,
  config,
  color,
  labelColor,
}) => {
  const meshRef = useRef<THREE.Group>(null);

  // Debug: Log when gotTaggedTimestamp changes
  useEffect(() => {
    if (gotTaggedTimestamp && gotTaggedTimestamp > 0) {
      tagDebug(
        `[BotCharacter ${config.label}] gotTaggedTimestamp prop changed to: ${gotTaggedTimestamp}`
      );
    }
  }, [gotTaggedTimestamp, config.label]);

  // Use bot AI hook for movement and behavior logic
  const { velocity, isSprinting } = useBotAI({
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
  });

  return (
    <group
      ref={meshRef}
      position={config.initialPosition}
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
