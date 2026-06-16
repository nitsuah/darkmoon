import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameState } from "../GameManager";

const PICKUP_RADIUS = 1.8;
const RESPAWN_MS = 12000;
const BOB_AMPLITUDE = 0.08;
const BOB_FREQUENCY = 600;
const SPIN_SPEED = 1.5;
const HEAL_AMOUNT = 25;

type HealthPickupDef = {
  id: string;
  position: [number, number, number];
};

export const HEALTH_PICKUP_DEFS: HealthPickupDef[] = [
  { id: "health-front", position: [0, 0.8, 12] },
  { id: "health-left-back", position: [-12, 0.8, -8] },
  { id: "health-right-back", position: [12, 0.8, -8] },
  { id: "health-mid", position: [0, 0.8, -6] },
];

const HEALTH_COLOR = "#44ff88";

type PickupState = {
  visible: boolean;
  respawnAt: number | null;
};

export interface HealthPickupsProps {
  playerPositionRef: React.RefObject<[number, number, number]>;
  gameState: GameState;
}

const HealthPickups: React.FC<HealthPickupsProps> = ({
  playerPositionRef,
  gameState,
}) => {
  const groupRefs = React.useRef<(THREE.Group | null)[]>(
    HEALTH_PICKUP_DEFS.map(() => null),
  );
  const pickupStates = React.useRef<PickupState[]>(
    HEALTH_PICKUP_DEFS.map(() => ({ visible: true, respawnAt: null })),
  );

  useFrame((_, delta) => {
    const isActive =
      gameState.isActive &&
      (gameState.mode === "deathmatch" || gameState.mode === "ctf");

    if (!isActive) {
      groupRefs.current.forEach((g) => {
        if (g) g.visible = false;
      });
      return;
    }

    const now = Date.now();
    const playerPos = playerPositionRef.current;

    for (let i = 0; i < HEALTH_PICKUP_DEFS.length; i++) {
      const state = pickupStates.current[i];
      const def = HEALTH_PICKUP_DEFS[i];
      const group = groupRefs.current[i];

      if (
        !state.visible &&
        state.respawnAt !== null &&
        now >= state.respawnAt
      ) {
        state.visible = true;
        state.respawnAt = null;
      }

      if (!group) continue;
      group.visible = state.visible;
      if (!state.visible) continue;

      group.rotation.y += delta * SPIN_SPEED;
      group.position.y =
        def.position[1] + Math.sin(now / BOB_FREQUENCY) * BOB_AMPLITUDE;

      if (playerPos) {
        const dx = playerPos[0] - def.position[0];
        const dz = playerPos[2] - def.position[2];
        if (Math.sqrt(dx * dx + dz * dz) < PICKUP_RADIUS) {
          state.visible = false;
          state.respawnAt = now + RESPAWN_MS;
          window.dispatchEvent(
            new window.CustomEvent("health-pickup", {
              detail: { amount: HEAL_AMOUNT },
            }),
          );
        }
      }
    }
  });

  /* eslint-disable react/no-unknown-property */
  return (
    <>
      {HEALTH_PICKUP_DEFS.map((def, i) => (
        <group
          key={def.id}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          position={def.position}
          visible={false}
        >
          {/* Cross shape: two overlapping bars */}
          <mesh>
            <boxGeometry args={[0.35, 0.1, 0.1]} />
            <meshBasicMaterial
              color={HEALTH_COLOR}
              transparent
              opacity={0.95}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.35]} />
            <meshBasicMaterial
              color={HEALTH_COLOR}
              transparent
              opacity={0.95}
            />
          </mesh>
          {/* Outer glow shell */}
          <mesh>
            <boxGeometry args={[0.42, 0.42, 0.42]} />
            <meshBasicMaterial
              color={HEALTH_COLOR}
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      ))}
    </>
  );
  /* eslint-enable react/no-unknown-property */
};

export default HealthPickups;
