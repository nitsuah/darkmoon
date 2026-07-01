import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getSoundManager } from "../../../components/SoundManager";
import {
  computeJetpackThrust,
  shouldActivateJetpackFromMobile,
} from "../../../lib/hooks/useJetpack";

interface PlayerJetpackProps {
  /** Whether jetpack flame should be visible */
  showJetpackFlame: boolean;
  /** Set jetpack flame visibility */
  setShowJetpackFlame: (show: boolean) => void;
  /** Jetpack active state ref */
  jetpackActiveRef: React.RefObject<boolean>;
  /** Jump mechanics state */
  isJumpingRef: React.RefObject<boolean>;
  /** Vertical velocity ref */
  verticalVelocityRef: React.RefObject<number>;
  /** Jump hold time ref */
  jumpHoldTimeRef: React.RefObject<number>;
  /** Jetpack thrust sound */
  jetpackThrustSoundRef: React.RefObject<any>;
  /** Keys pressed state */
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  /** Camera rotation */
  cameraRotationRef: React.RefObject<{ horizontal: number; vertical: number }>;
  /** Game state from physics constants */
  gameState: {
    JETPACK_MAX_HOLD_TIME: number;
    JETPACK_HOLD_FORCE: number;
    JETPACK_INITIAL_BOOST: number;
    GROUND_Y: number;
  };
  /** Whether game is paused */
  isPaused: boolean;
  /** Socket client for network updates */
  socketClient: {
    emit: (event: string, data: unknown) => void;
    id?: string;
  } | null;
  /** Current player ID */
  currentPlayerId: string;
  /** For bot/tag events */
  onPlayerTagged?: () => void;
  /** Game manager reference */
  gameManager: any;
}

export const PlayerJetpackV2 = React.memo((props: PlayerJetpackProps) => {
  const {
    showJetpackFlame,
    setShowJetpackFlame,
    jetpackActiveRef,
    isJumpingRef,
    verticalVelocityRef,
    jumpHoldTimeRef,
    jetpackThrustSoundRef,
    keysPressedRef,
    cameraRotationRef,
    gameState,
    isPaused,
    socketClient,
    currentPlayerId,
    onPlayerTagged,
    gameManager,
  } = props;

  // Frame update for jetpack behavior
  useFrame((state, delta) => {
    const now = Date.now();
    const isSprinting =
      keysPressedRef.current.SPACE || keysPressedRef.current.SHIFT;
    const currentTime = Date.now();

    if (isPaused) return;

    // Apply jetpack thrust while space is held (only if jetpack active)
    if (jetpackActiveRef.current && isJumpingRef.current && isSprinting) {
      if (jumpHoldTimeRef.current < gameState.JETPACK_MAX_HOLD_TIME) {
        jumpHoldTimeRef.current += delta;
        // Compute thrust using helper function
        const thrust = computeJetpackThrust(jumpHoldTimeRef.current, delta, {
          JETPACK_MAX_HOLD_TIME: gameState.JETPACK_MAX_HOLD_TIME,
          JETPACK_HOLD_FORCE: gameState.JETPACK_HOLD_FORCE,
        });
        verticalVelocityRef.current += thrust;

        // Start thrust sound if not already playing
        if (!jetpackThrustSoundRef.current) {
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              jetpackThrustSoundRef.current = soundMgr.playJetpackThrustSound();
            }
          } catch {
            /* Sound manager not ready */
          }
        }
      }
    } else if (jetpackThrustSoundRef.current) {
      // Stop thrust sound when space is released or jetpack ends
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) {
          soundMgr.stopJetpackThrustSound(jetpackThrustSoundRef.current);
          jetpackThrustSoundRef.current = null;
        }
      } catch {
        /* Sound manager not ready */
      }
    }

    // Handle RTS tags for jetpack behavior
    if (onPlayerTagged) {
      // This would be handled by PlayerTag component instead
    }
  });

  return null;
});

PlayerJetpackV2.displayName = "PlayerJetpackV2";
