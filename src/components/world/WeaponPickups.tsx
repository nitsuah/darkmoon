import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameState } from "../GameManager";

const PICKUP_RADIUS = 2;
const RESPAWN_MS = 15000;
const BOB_AMPLITUDE = 0.1;
const BOB_FREQUENCY = 500;
const SPIN_SPEED = 2;

type PickupDef = {
  id: string;
  position: [number, number, number];
  weaponId: string;
  color: string;
};

export const PICKUP_DEFS: PickupDef[] = [
  {
    id: "pickup-center-shotgun",
    position: [0, 0.8, 0],
    weaponId: "shotgun",
    color: "#ff7700",
  },
  {
    id: "pickup-left-laser",
    position: [-10, 0.8, 0],
    weaponId: "laser",
    color: "#33ffe6",
  },
  {
    id: "pickup-right-laser",
    position: [10, 0.8, 0],
    weaponId: "laser",
    color: "#33ffe6",
  },
  {
    id: "pickup-rocket",
    position: [0, 0.8, -14],
    weaponId: "rocket",
    color: "#ff1100",
  },
];

type PickupState = {
  visible: boolean;
  respawnAt: number | null;
};

export interface WeaponPickupsProps {
  playerPositionRef: React.RefObject<[number, number, number]>;
  gameState: GameState;
}

const WeaponPickups: React.FC<WeaponPickupsProps> = ({
  playerPositionRef,
  gameState,
}) => {
  const groupRefs = React.useRef<(THREE.Group | null)[]>(
    PICKUP_DEFS.map(() => null),
  );
  const pickupStates = React.useRef<PickupState[]>(
    PICKUP_DEFS.map(() => ({ visible: true, respawnAt: null })),
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

    for (let i = 0; i < PICKUP_DEFS.length; i++) {
      const state = pickupStates.current[i];
      const def = PICKUP_DEFS[i];
      const group = groupRefs.current[i];

      // Respawn check
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

      // Animate: spin and bob
      group.rotation.y += delta * SPIN_SPEED;
      group.position.y =
        def.position[1] + Math.sin(now / BOB_FREQUENCY) * BOB_AMPLITUDE;

      // Proximity check (XZ plane only — ignore height difference)
      if (playerPos) {
        const dx = playerPos[0] - def.position[0];
        const dz = playerPos[2] - def.position[2];
        if (Math.sqrt(dx * dx + dz * dz) < PICKUP_RADIUS) {
          state.visible = false;
          state.respawnAt = now + RESPAWN_MS;
          window.dispatchEvent(
            new window.CustomEvent("weapon-pickup", {
              detail: { weaponId: def.weaponId },
            }),
          );
        }
      }
    }
  });

  /* eslint-disable react/no-unknown-property */
  return (
    <>
      {PICKUP_DEFS.map((def, i) => (
        <group
          key={def.id}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          position={def.position}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshBasicMaterial color={def.color} transparent opacity={0.9} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.45, 0.45, 0.45]} />
            <meshBasicMaterial
              color={def.color}
              wireframe
              transparent
              opacity={0.4}
            />
          </mesh>
        </group>
      ))}
    </>
  );
  /* eslint-enable react/no-unknown-property */
};

export default WeaponPickups;
