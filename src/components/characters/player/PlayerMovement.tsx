import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SHIFT, SPACE, W, A, S, D, Q, E } from "../../utils";
import {
  usePlayerPhysics,
  PHYSICS_CONSTANTS,
} from "../../../lib/hooks/usePlayerPhysics";
import { usePlayerState } from "../../../lib/hooks/usePlayerState";
import usePlayerMovement from "../../../lib/hooks/usePlayerMovement";
import { getSoundManager } from "../../../components/SoundManager";
import {
  computeJetpackThrust,
  shouldActivateJetpackFromMobile,
} from "../../../lib/hooks/useJetpack";

interface PlayerMovementProps {
  /** Current player mesh ref */
  meshRef: React.RefObject<THREE.Group>;
  /** Camera horizontal rotation (yaw) */
  cameraHorizontal: number;
  /** Whether both mouse buttons are pressed (auto-run) */
  bothMouseButtons: boolean;
  /** Joystick movement input */
  joystickMove: { x: number; y: number };
  /** Key press state */
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  /** Whether player is frozen (tagged) */
  isPlayerFrozenRef: React.RefObject<boolean>;
  /** Time when freeze ends */
  playerFreezeEndTimeRef: React.RefObject<number>;
  /** Mobile jetpack trigger ref */
  mobileJetpackTriggerRef: React.RefObject<boolean>;
  /** Callback when position updates */
  onPositionUpdate?: (position: [number, number, number]) => void;
  /** Socket client for network updates */
  socketClient?: {
    emit: (event: string, data: unknown) => void;
    id?: string;
  } | null;
  /** Current player ID */
  currentPlayerId: string;
  /** Whether game is paused */
  isPaused: boolean;
  /** Last walk sound time ref */
  lastWalkSoundTimeRef: React.RefObject<number>;
  /** Game manager for player state */
  gameManager?: {
    getPlayers: () => Map<
      string,
      { isIt: boolean; position: [number, number, number]; respawnAt?: number }
    >;
    getGameState: () => { mode: string; isActive: boolean };
  };
  /** Other clients for collision */
  clients: Record<string, { position: [number, number, number] }>;
  /** Collision system ref */
  collisionSystemRef: React.RefObject<{
    checkCollision: (
      current: THREE.Vector3,
      next: THREE.Vector3,
    ) => THREE.Vector3;
    checkPlayerCollision: (a: THREE.Vector3, b: THREE.Vector3) => boolean;
  }>;
  /** Set jetpack flame visibility */
  setShowJetpackFlame: (show: boolean) => void;
  /** Ref for look indicator */
  lookIndicatorRef?: React.RefObject<THREE.Mesh>;
  /** Delta time for frame */
  delta?: number;
}

export const PlayerMovement = React.memo(
  ({
    meshRef,
    cameraHorizontal,
    bothMouseButtons,
    joystickMove,
    keysPressedRef,
    isPlayerFrozenRef,
    playerFreezeEndTimeRef,
    mobileJetpackTriggerRef,
    onPositionUpdate,
    socketClient,
    currentPlayerId,
    isPaused,
    lastWalkSoundTimeRef,
    gameManager,
    clients,
    collisionSystemRef,
    setShowJetpackFlame,
    lookIndicatorRef,
  }: PlayerMovementProps) => {
    const physics = usePlayerPhysics();
    const movement = usePlayerMovement();
    const playerState = usePlayerState();

    const {
      velocityRef,
      directionRef,
      currentSpeedRef,
      inputDirectionRef,
      finalMovementRef,
      isJumpingRef,
      verticalVelocityRef,
      jumpHoldTimeRef,
      horizontalMomentumRef,
      lastJumpTimeRef,
      jetpackActiveRef,
      isUsingRCSRef,
      rcsTimeRemainingRef,
      jetpackThrustSoundRef,
      lastRCSSoundTimeRef,
    } = physics;

    const POSITION_UPDATE_THRESHOLD = 0.001;

    useFrame((state, delta) => {
      const now = Date.now();

      if (isPaused || !meshRef.current) return;

      // Check freeze state
      if (isPlayerFrozenRef.current) {
        if (now >= playerFreezeEndTimeRef.current) {
          isPlayerFrozenRef.current = false;
        } else {
          // Show visual indicator while frozen
          const pulse = 1 + Math.sin(now * 0.01) * 0.1;
          meshRef.current.scale.set(pulse, pulse, pulse);
          return; // Skip movement while frozen
        }
      } else {
        meshRef.current.scale.set(1, 1, 1);
      }

      // Compute movement direction
      const dir = movement.computeDirection(
        cameraHorizontal,
        joystickMove,
        keysPressedRef.current,
        bothMouseButtons,
      );

      const hasKeyboardInput =
        keysPressedRef.current[W] ||
        keysPressedRef.current[A] ||
        keysPressedRef.current[S] ||
        keysPressedRef.current[D] ||
        keysPressedRef.current[Q] ||
        keysPressedRef.current[E];
      const hasJoystickInput = joystickMove.x !== 0 || joystickMove.y !== 0;

      if (
        dir &&
        dir.length() > 0 &&
        (bothMouseButtons || hasKeyboardInput || hasJoystickInput)
      ) {
        directionRef.current.copy(dir);
        const speed = movement.computeSpeed(
          jetpackActiveRef.current,
          keysPressedRef.current[SHIFT] ?? false,
        );

        currentSpeedRef.current = THREE.MathUtils.lerp(
          currentSpeedRef.current,
          speed,
          Math.min(1, 10 * delta),
        );

        velocityRef.current
          .copy(directionRef.current)
          .multiplyScalar(currentSpeedRef.current * delta);

        // Calculate new position with collision detection
        const currentPosition = meshRef.current.position.clone();
        const newPosition = currentPosition.clone().add(velocityRef.current);

        const resolvedPosition = collisionSystemRef.current.checkCollision(
          currentPosition,
          newPosition,
        );

        // Player collision
        if (gameManager) {
          const myId = socketClient?.id || currentPlayerId;
          for (const [clientId, clientData] of Object.entries(clients)) {
            if (clientId !== myId) {
              const otherPlayerPos = new THREE.Vector3(...clientData.position);
              if (
                collisionSystemRef.current.checkPlayerCollision(
                  resolvedPosition,
                  otherPlayerPos,
                )
              ) {
                const pushDirection = resolvedPosition
                  .clone()
                  .sub(otherPlayerPos)
                  .normalize();
                resolvedPosition.add(pushDirection.multiplyScalar(0.1));
              }
            }
          }
        }

        meshRef.current.position.copy(resolvedPosition);

        // Walking/sprinting sounds
        const isSprinting = keysPressedRef.current[SHIFT] ?? false;
        if (
          currentSpeedRef.current > 0.1 &&
          now - lastWalkSoundTimeRef.current > (isSprinting ? 300 : 500)
        ) {
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              if (isSprinting) soundMgr.playSprintSound();
              else soundMgr.playWalkSound();
            }
          } catch {
            /* Sound manager not ready */
          }
          lastWalkSoundTimeRef.current = now;
        }

        // Facing yaw
        const isAiming = keysPressedRef.current["MouseRight"] ?? false; // Placeholder - need to pass mouse controls
        const targetYaw = movement.computeFacingYaw(
          directionRef.current,
          cameraHorizontal,
          isAiming,
          meshRef.current.rotation.y,
        );
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y,
          targetYaw,
          0.2,
        );
      } else {
        // Decelerate
        currentSpeedRef.current = THREE.MathUtils.lerp(
          currentSpeedRef.current,
          0,
          Math.min(1, 15 * delta),
        );
      }

      // Jump mechanics
      const isOnGround =
        meshRef.current.position.y <= PHYSICS_CONSTANTS.GROUND_Y + 0.01;
      const currentTime = Date.now();

      const mobileDoubleTap = mobileJetpackTriggerRef.current || false;
      const canMobileJump =
        mobileDoubleTap && isOnGround && !isJumpingRef.current;
      const canKeyboardJump =
        keysPressedRef.current[SPACE] && isOnGround && !isJumpingRef.current;

      if (canKeyboardJump || canMobileJump) {
        if (shouldActivateJetpackFromMobile(mobileDoubleTap)) {
          jetpackActiveRef.current = true;
          setShowJetpackFlame(true);
          isJumpingRef.current = true;
          verticalVelocityRef.current = PHYSICS_CONSTANTS.JETPACK_INITIAL_BOOST;
          jumpHoldTimeRef.current = 0;
          mobileJetpackTriggerRef.current = false; // Reset to prevent re-activation
        } else {
          // Regular jump
          isJumpingRef.current = true;
          verticalVelocityRef.current = PHYSICS_CONSTANTS.JUMP_INITIAL_FORCE;
          jumpHoldTimeRef.current = 0;
          lastJumpTimeRef.current = currentTime;
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) soundMgr.playJumpSound();
          } catch {
            /* Sound manager not ready */
          }
        }
      }

      // Apply jetpack thrust while space held
      if (
        jetpackActiveRef.current &&
        isJumpingRef.current &&
        (keysPressedRef.current[SHIFT] ?? false)
      ) {
        if (jumpHoldTimeRef.current < PHYSICS_CONSTANTS.JETPACK_MAX_HOLD_TIME) {
          jumpHoldTimeRef.current += delta;
          const thrust = computeJetpackThrust(jumpHoldTimeRef.current, delta, {
            JETPACK_MAX_HOLD_TIME: PHYSICS_CONSTANTS.JETPACK_MAX_HOLD_TIME,
            JETPACK_HOLD_FORCE: PHYSICS_CONSTANTS.JETPACK_HOLD_FORCE,
          });
          verticalVelocityRef.current += thrust;

          // Start thrust sound
          if (!jetpackThrustSoundRef.current) {
            try {
              const soundMgr = getSoundManager();
              if (soundMgr) {
                jetpackThrustSoundRef.current =
                  soundMgr.playJetpackThrustSound();
              }
            } catch {
              /* Sound manager not ready */
            }
          }
        }
      } else if (jetpackThrustSoundRef.current) {
        // Stop thrust sound
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

      // RCS jets (SHIFT in air) - directional thrust
      if (
        !isOnGround &&
        keysPressedRef.current[SHIFT] &&
        !jetpackActiveRef.current
      ) {
        if (!isUsingRCSRef.current) {
          isUsingRCSRef.current = true;
          rcsTimeRemainingRef.current = PHYSICS_CONSTANTS.RCS_MAX_DURATION;
        }

        if (rcsTimeRemainingRef.current > 0) {
          rcsTimeRemainingRef.current -= delta;

          const rcsDirection = new THREE.Vector3();
          if (keysPressedRef.current[W]) rcsDirection.z -= 1;
          if (keysPressedRef.current[S]) rcsDirection.z += 1;
          if (keysPressedRef.current[A]) rcsDirection.x -= 1;
          if (keysPressedRef.current[D]) rcsDirection.x += 1;
          if (keysPressedRef.current[Q]) rcsDirection.y += 1;
          if (keysPressedRef.current[E]) rcsDirection.y -= 1;

          if (rcsDirection.length() > 0) {
            rcsDirection.normalize();
            rcsDirection.applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              -cameraHorizontal,
            );
            horizontalMomentumRef.current.add(
              rcsDirection.multiplyScalar(
                PHYSICS_CONSTANTS.RCS_THRUST * delta * 10,
              ),
            );
          }

          // RCS sound
          if (now - (lastRCSSoundTimeRef.current || 0) > 200) {
            try {
              const soundMgr = getSoundManager();
              if (soundMgr) soundMgr.playRCSSound();
              lastRCSSoundTimeRef.current = now;
            } catch {
              /* Sound manager not ready */
            }
          }
        }
      } else if (isOnGround) {
        // Reset RCS when landing
        isUsingRCSRef.current = false;
        rcsTimeRemainingRef.current = PHYSICS_CONSTANTS.RCS_MAX_DURATION;
      }

      // Apply gravity physics while in air
      if (isJumpingRef.current || !isOnGround) {
        verticalVelocityRef.current -= PHYSICS_CONSTANTS.GRAVITY;
        verticalVelocityRef.current *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
        meshRef.current.position.y += verticalVelocityRef.current;

        // Preserve horizontal momentum with decay
        horizontalMomentumRef.current.multiplyScalar(
          PHYSICS_CONSTANTS.MOMENTUM_PRESERVATION,
        );

        // Allow some control - blend player input momentum
        inputDirectionRef.current
          .copy(directionRef.current)
          .multiplyScalar(
            movement.computeSpeed(
              jetpackActiveRef.current,
              keysPressedRef.current[SHIFT] ?? false,
            ) * PHYSICS_CONSTANTS.HORIZONTAL_AIR_CONTROL,
          );
        finalMovementRef.current
          .copy(horizontalMomentumRef.current)
          .add(inputDirectionRef.current);

        meshRef.current.position.x += finalMovementRef.current.x * delta * 10;
        meshRef.current.position.z += finalMovementRef.current.z * delta * 10;

        // Check landing
        if (meshRef.current.position.y <= PHYSICS_CONSTANTS.GROUND_Y + 0.01) {
          meshRef.current.position.y = PHYSICS_CONSTANTS.GROUND_Y;
          if (isJumpingRef.current) {
            // Capture landing velocity before zeroing
            const landingVelocity = verticalVelocityRef.current;
            isJumpingRef.current = false;
            jetpackActiveRef.current = false;
            setShowJetpackFlame(false);
            verticalVelocityRef.current = 0;
            horizontalMomentumRef.current.set(0, 0, 0);
            try {
              const soundMgr = getSoundManager();
              if (soundMgr)
                soundMgr.playLandingSoundScaled(
                  Math.abs(landingVelocity) * 100,
                );
            } catch {
              /* Sound manager not ready */
            }
          }
        }
      }

      // Emit position to server
      if (socketClient) {
        socketClient.emit("move", {
          position: meshRef.current.position.toArray(),
          rotation: meshRef.current.rotation.toArray(),
        });
      }

      // Position update callback
      if (onPositionUpdate && meshRef.current) {
        const currentPos = meshRef.current.position;
        const distanceMoved = currentPos.distanceTo(
          playerState.lastReportedPositionRef.current,
        );
        if (distanceMoved > POSITION_UPDATE_THRESHOLD) {
          onPositionUpdate(currentPos.toArray() as [number, number, number]);
          playerState.lastReportedPositionRef.current.copy(currentPos);
        }
      }

      // Look indicator for aiming
      if (lookIndicatorRef?.current) {
        const lookForward = new THREE.Vector3(
          -Math.sin(cameraHorizontal),
          0,
          -Math.cos(cameraHorizontal),
        );
        const lookDistance = 6;
        const lookPos = meshRef.current.position
          .clone()
          .add(lookForward.multiplyScalar(lookDistance));
        lookIndicatorRef.current.visible = true;
        lookIndicatorRef.current.position.set(lookPos.x, 0.03, lookPos.z);
        lookIndicatorRef.current.rotation.set(
          -Math.PI / 2,
          0,
          -cameraHorizontal,
        );
      }
    });

    return null; // This component only provides useFrame logic
  },
);

PlayerMovement.displayName = "PlayerMovement";
