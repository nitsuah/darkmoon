import * as React from "react";
import { useFrame } from "@react-three/fiber";
import type { GameManager } from "../../../components/GameManager";
import type { WeaponManager } from "../../../components/combat/WeaponManager";
import { getSoundManager } from "../../../components/SoundManager";
import {
  KEY_1,
  KEY_2,
  KEY_3,
  KEY_4,
  KEY_5,
  KEY_R,
  SPACE,
  SHIFT,
} from "../../utils";

interface PlayerInputProps {
  /** Game manager for player state */
  gameManager: GameManager | null;
  /** Current player ID */
  currentPlayerId: string;
  /** Socket client */
  socketClient: {
    emit: (event: string, data: unknown) => void;
    id?: string;
  } | null;
  /** Key press state ref */
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  /** Mobile jetpack trigger ref */
  mobileJetpackTriggerRef: React.RefObject<boolean>;
  /** Whether game is paused */
  isPaused: boolean;
  /** Weapon manager ref */
  weaponManagerRef: React.RefObject<WeaponManager>;
  /** Callback for freeze player event */
  onPlayerFrozen?: (duration: number) => void;
}

export const PlayerInput = React.memo(
  ({
    gameManager,
    currentPlayerId,
    socketClient,
    keysPressedRef,
    mobileJetpackTriggerRef,
    isPaused,
    weaponManagerRef,
    onPlayerFrozen,
  }: PlayerInputProps) => {
    // Handle freeze from bot tag
    React.useEffect(() => {
      function handleFreezePlayer() {
        if (onPlayerFrozen) {
          onPlayerFrozen(1500);
        }
      }
      window.addEventListener("player-tagged-by-bot", handleFreezePlayer);
      return () =>
        window.removeEventListener("player-tagged-by-bot", handleFreezePlayer);
    }, [onPlayerFrozen]);

    // Handle weapon pickup events
    React.useEffect(() => {
      function handleWeaponPickup(event: CustomEvent) {
        if (!gameManager || isPaused) return;
        const weaponId = event.detail?.weaponId;
        if (!weaponId) return;

        weaponManagerRef.current.equip(weaponId);
        const myId = socketClient?.id || currentPlayerId;
        gameManager.updatePlayer(myId, {
          equippedWeaponId: weaponId,
          currentAmmo: weaponManagerRef.current.getAmmo(weaponId),
        });
      }
      window.addEventListener(
        "weapon-pickup",
        handleWeaponPickup as EventListener,
      );
      return () =>
        window.removeEventListener(
          "weapon-pickup",
          handleWeaponPickup as EventListener,
        );
    }, [
      gameManager,
      currentPlayerId,
      isPaused,
      socketClient,
      weaponManagerRef,
    ]);

    // Imperative handle for external ref access
    // This is now handled in the main PlayerCharacter component

    return null;
  },
);

PlayerInput.displayName = "PlayerInput";
