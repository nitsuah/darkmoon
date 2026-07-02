import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameManager } from "../../../components/GameManager";
import { pickSafeSpawn } from "../../../lib/constants/spawnPoints";

interface PlayerRespawnerProps {
  /** Player mesh ref */
  meshRef: React.RefObject<THREE.Group>;
  /** Game manager for player state */
  gameManager: GameManager | null;
  /** Current player ID */
  currentPlayerId: string;
  /** Whether game is paused */
  isPaused: boolean;
  /** Weapon manager ref */
  weaponManagerRef: React.RefObject<{
    getEquipped: () => { id: string } | null;
    refill: (weaponId: string) => void;
    getAmmo: (weaponId: string) => number | null;
  } | null>;
}

export const PlayerRespawner = React.memo(
  ({
    meshRef,
    gameManager,
    currentPlayerId,
    isPaused,
    weaponManagerRef,
  }: PlayerRespawnerProps) => {
    const prevRespawnAtRef = React.useRef<number | undefined>(undefined);

    // Listen for respawn event
    React.useEffect(() => {
      function handleRespawn() {
        if (!gameManager || isPaused) return;
        const mePlayer = gameManager.getPlayers().get(currentPlayerId);
        const respawnAt = mePlayer?.respawnAt;
        if (respawnAt !== undefined) return; // Not respawning yet

        // Player just respawned - refill ammo
        const equipped = weaponManagerRef.current?.getEquipped();
        if (equipped) {
          weaponManagerRef.current?.refill(equipped.id);
          gameManager.updatePlayer(currentPlayerId, {
            currentAmmo: weaponManagerRef.current?.getAmmo(equipped.id),
          });
        }
      }
      window.addEventListener("player-respawn", handleRespawn);
      return () => window.removeEventListener("player-respawn", handleRespawn);
    }, [gameManager, currentPlayerId, isPaused, weaponManagerRef]);

    // Handle respawn teleport via frame (checking respawnAt changes)
    useFrame(() => {
      if (isPaused || !meshRef.current || !gameManager) return;

      const mePlayer = gameManager.getPlayers().get(currentPlayerId);
      const respawnAt = mePlayer?.respawnAt;

      const wasDown = prevRespawnAtRef.current !== undefined;
      const isUp = respawnAt === undefined;

      if (wasDown && isUp) {
        // Player just respawned - pick safe spawn point
        const enemyPositions: [number, number, number][] = [];
        gameManager.getPlayers().forEach((p, id) => {
          if (id !== currentPlayerId && p.respawnAt === undefined) {
            enemyPositions.push(p.position as [number, number, number]);
          }
        });
        const [sx, sy, sz] = pickSafeSpawn(enemyPositions);
        meshRef.current.position.set(sx, sy, sz);
      }
      prevRespawnAtRef.current = respawnAt;
    });

    return null;
  },
);

PlayerRespawner.displayName = "PlayerRespawner";
