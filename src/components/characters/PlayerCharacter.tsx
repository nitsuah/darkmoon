import * as React from "react";
import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Socket } from "socket.io-client";
import * as THREE from "three";
import type { Clients } from "../../types/socket";
import GameManager, { GameState } from "../GameManager";
import { W, A, S, D, Q, E, SHIFT, SPACE } from "../utils";
import SpacemanModel from "../SpacemanModel";
import { getSoundManager } from "../SoundManager";
import { createTagLogger } from "../../lib/utils/logger";
import {
  usePlayerPhysics,
  PHYSICS_CONSTANTS,
} from "../../lib/hooks/usePlayerPhysics";
import { usePlayerCamera } from "../../lib/hooks/usePlayerCamera";
import { usePlayerState } from "../../lib/hooks/usePlayerState";
import {
  resolveMovement,
  detectPlayerCollision,
} from "../../lib/hooks/usePlayerCollision";
import { processTagging } from "../../lib/hooks/usePlayerTagging";
import {
  computeDirection,
  computeSpeed,
} from "../../lib/hooks/usePlayerMovement";

const tagDebug = createTagLogger("PlayerCharacter");

export interface PlayerCharacterProps {
  keysPressedRef: React.MutableRefObject<{ [key: string]: boolean }>;
  socketClient: Socket | null;
  mouseControls: {
    leftClick: boolean;
    rightClick: boolean;
    middleClick: boolean;
    mouseX: number;
    mouseY: number;
  };
  clients: Clients;
  gameManager: GameManager | null;
  currentPlayerId: string;
  joystickMove: { x: number; y: number };
  joystickCamera: { x: number; y: number };
  lastWalkSoundTimeRef: React.MutableRefObject<number>;
  isPaused: boolean;
  onPositionUpdate?: (position: [number, number, number]) => void;
  playerIsIt?: boolean;
  setPlayerIsIt?: (isIt: boolean) => void;
  setBotIsIt?: (isIt: boolean) => void;
  setBot1GotTagged?: (timestamp: number) => void;
  setBot2GotTagged?: (timestamp: number) => void;
  setGameState?: React.Dispatch<React.SetStateAction<GameState>>;
  showHitboxes?: boolean;
  mobileJetpackTrigger?: React.MutableRefObject<boolean>;
  onTagSuccess?: () => void;
}

export interface PlayerCharacterHandle {
  resetPosition: () => void;
  freezePlayer: (duration: number) => void;
}

export const PlayerCharacter = React.forwardRef<
  PlayerCharacterHandle,
  PlayerCharacterProps
>((props, ref) => {
  const {
    keysPressedRef,
    socketClient,
    mouseControls,
    clients,
    gameManager,
    currentPlayerId,
    joystickMove,
    joystickCamera,
    lastWalkSoundTimeRef,
    isPaused,
    onPositionUpdate,
    playerIsIt,
    setPlayerIsIt,
    setBotIsIt,
    setBot1GotTagged,
    setBot2GotTagged,
    setGameState,
    mobileJetpackTrigger,
    onTagSuccess,
  } = props;

  // Use custom hooks for organized state management
  const playerState = usePlayerState();
  const {
    meshRef,
    collisionSystemRef,
    lastReportedPositionRef,
    lastTagCheckRef,
    frameCounterRef,
    isPlayerFrozenRef,
    playerFreezeEndTimeRef,
  } = playerState;

  const physics = usePlayerPhysics();
  const {
    velocityRef,
    directionRef,
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

  const camera = usePlayerCamera();
  const {
    cameraOffsetRef,
    cameraRotationRef,
    skycamRef,
    previousMouseRef,
    isFirstMouseRef,
    idealCameraPositionRef,
    skyTargetRef,
  } = camera;

  // Dust effect state for landing
  const [showDustEffect, setShowDustEffect] = useState(false);
  const [showJetpackFlame, setShowJetpackFlame] = useState(false);

  // Expose reset and freeze functions to parent via ref
  React.useImperativeHandle(ref, () => ({
    resetPosition: () => {
      if (meshRef.current) {
        meshRef.current.position.set(0, 0.5, 0);
      }
      cameraRotationRef.current = { horizontal: 0, vertical: 0.2 };
      velocityRef.current.set(0, 0, 0);
      directionRef.current.set(0, 0, 0);
      isJumpingRef.current = false;
      verticalVelocityRef.current = 0;
    },
    freezePlayer: (duration: number) => {
      isPlayerFrozenRef.current = true;
      playerFreezeEndTimeRef.current = Date.now() + duration;
      tagDebug(`👤 Player frozen for ${duration}ms via ref`);
    },
  }));

  // gated debug logger - only logs in dev
  const debug = (...args: unknown[]) => {
    // Vite exposes import.meta.env.DEV; fall back to false if undefined
    if (import.meta?.env?.DEV) {
      console.log(...args);
    }
  };

  useFrame((state, delta) => {
    frameCounterRef.current++;

    if (!meshRef.current || isPaused) {
      // Debug: Log if we're not processing frames (every 100 frames)
      if (frameCounterRef.current % 100 === 0) {
        debug("Frame skipped:", { hasMesh: !!meshRef.current, isPaused });
      }
      return;
    }

    const now = Date.now();

    // Store mobile jetpack trigger locally to satisfy linter
    const mobileJetpackTriggerRef = mobileJetpackTrigger;

    // Check if player is frozen after being tagged
    if (isPlayerFrozenRef.current) {
      if (now >= playerFreezeEndTimeRef.current) {
        isPlayerFrozenRef.current = false;
        tagDebug(`👤 Player unfrozen - can move again`);
      } else {
        // Player is frozen - show visual indicator and prevent movement
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        // Still allow camera controls but no movement - return early after camera updates
        // We'll add a flag to allow camera controls below
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }

    // WoW-style camera controls
    const bothMouseButtons =
      mouseControls.leftClick && mouseControls.rightClick;

    // Handle mouse camera rotation
    if (
      mouseControls.leftClick ||
      mouseControls.rightClick ||
      mouseControls.middleClick
    ) {
      if (isFirstMouseRef.current) {
        previousMouseRef.current.x = mouseControls.mouseX;
        previousMouseRef.current.y = mouseControls.mouseY;
        isFirstMouseRef.current = false;
      }

      const deltaX = mouseControls.mouseX - previousMouseRef.current.x;
      const deltaY = mouseControls.mouseY - previousMouseRef.current.y;

      const sensitivity = 0.002;

      if (bothMouseButtons) {
        // Both buttons: Rotate camera AND player (for movement control)
        cameraRotationRef.current.horizontal -= deltaX * sensitivity;
        cameraRotationRef.current.vertical += deltaY * sensitivity;
        skycamRef.current = false;
      } else if (mouseControls.rightClick) {
        // Right-click only: Rotate camera AND player facing (WoW style)
        cameraRotationRef.current.horizontal -= deltaX * sensitivity;
        cameraRotationRef.current.vertical += deltaY * sensitivity;
        skycamRef.current = false;
      } else if (mouseControls.middleClick) {
        // Middle-click: Rotate camera WITHOUT rotating player (peek mode)
        skycamRef.current = true;
        cameraRotationRef.current.horizontal -= deltaX * sensitivity;
        cameraRotationRef.current.vertical += deltaY * sensitivity;
      }
      // Left-click is now free for interactions (no camera control)

      // Clamp vertical rotation
      cameraRotationRef.current.vertical = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotationRef.current.vertical)
      );

      previousMouseRef.current.x = mouseControls.mouseX;
      previousMouseRef.current.y = mouseControls.mouseY;
    } else {
      isFirstMouseRef.current = true;
      skycamRef.current = false;
    }

    // Joystick camera rotation
    if (joystickCamera.x !== 0 || joystickCamera.y !== 0) {
      const joystickSensitivity = 0.03;
      cameraRotationRef.current.horizontal -=
        joystickCamera.x * joystickSensitivity * delta;
      cameraRotationRef.current.vertical +=
        joystickCamera.y * joystickSensitivity * delta;
    }

    // Keyboard camera rotation (A/D keys) - Also rotates character
    if (keysPressedRef.current[A]) {
      cameraRotationRef.current.horizontal += 2 * delta; // Rotate left
      // Also rotate character to match camera direction
      if (meshRef.current) {
        meshRef.current.rotation.y = cameraRotationRef.current.horizontal;
      }
    }
    if (keysPressedRef.current[D]) {
      cameraRotationRef.current.horizontal -= 2 * delta; // Rotate right
      // Also rotate character to match camera direction
      if (meshRef.current) {
        meshRef.current.rotation.y = cameraRotationRef.current.horizontal;
      }
    }

    // Always clamp vertical rotation (from joystick too)
    cameraRotationRef.current.vertical = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, cameraRotationRef.current.vertical)
    );

    // Calculate camera offset based on rotation
    const distance = 5;
    const offsetX =
      Math.sin(cameraRotationRef.current.horizontal) *
      Math.cos(cameraRotationRef.current.vertical) *
      distance;
    const offsetY = Math.sin(cameraRotationRef.current.vertical) * distance + 3;
    const offsetZ =
      Math.cos(cameraRotationRef.current.horizontal) *
      Math.cos(cameraRotationRef.current.vertical) *
      distance;

    cameraOffsetRef.current.set(offsetX, offsetY, offsetZ);

    // If player is frozen, skip movement but allow camera controls
    if (isPlayerFrozenRef.current) {
      // Update camera position but don't process movement
      state.camera.position
        .copy(meshRef.current.position)
        .add(cameraOffsetRef.current);
      state.camera.lookAt(meshRef.current.position);
      return;
    }

    // Calculate direction based on keys pressed and camera rotation
    directionRef.current.set(0, 0, 0);

    const hasKeyboardInput =
      keysPressedRef.current[W] ||
      keysPressedRef.current[S] ||
      keysPressedRef.current[Q] ||
      keysPressedRef.current[E];
    const hasJoystickInput = joystickMove.x !== 0 || joystickMove.y !== 0;

    // Calculate speed using helper
    const speed = computeSpeed(
      jetpackActiveRef.current,
      keysPressedRef.current[SHIFT]
    );

    // WoW-style auto-run: both mouse buttons held = move forward
    if (bothMouseButtons || hasKeyboardInput || hasJoystickInput) {
      // Compute direction via helper
      const dir = computeDirection(
        cameraRotationRef.current.horizontal,
        joystickMove,
        {
          W: keysPressedRef.current[W],
          S: keysPressedRef.current[S],
          Q: keysPressedRef.current[Q],
          E: keysPressedRef.current[E],
        },
        bothMouseButtons
      );

      if (dir && dir.length() > 0) {
        directionRef.current.copy(dir);
        velocityRef.current
          .copy(directionRef.current)
          .multiplyScalar(speed * delta);

        // Calculate new position with collision detection
        const currentPosition = meshRef.current.position.clone();
        const newPosition = currentPosition.clone().add(velocityRef.current);

        // Check for collisions and get resolved position
        const resolvedPosition = resolveMovement(
          collisionSystemRef.current,
          currentPosition,
          newPosition
        );

        // Player collision + tagging logic handled by helper
        const myId = socketClient?.id || currentPlayerId;
        if (myId && gameManager) {
          // Simple push-back collision resolution for players
          for (const [clientId, clientData] of Object.entries(clients)) {
            if (clientId !== myId) {
              const otherPlayerPos = new THREE.Vector3(...clientData.position);

              if (
                detectPlayerCollision(
                  collisionSystemRef.current,
                  resolvedPosition,
                  otherPlayerPos
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

          // Delegate tagging to helper to keep PlayerCharacter smaller
          try {
            processTagging({
              resolvedPosition,
              clients,
              myId,
              gameManager,
              lastTagCheckRef,
              playerIsIt,
              setPlayerIsIt,
              setBotIsIt,
              setBot1GotTagged,
              setBot2GotTagged,
              setGameState,
              onTagSuccess,
              socketClient,
            });
          } catch (e) {
            // best-effort; keep original behavior if helper throws
            void e;
          }
        }

        // Move the character to resolved position
        meshRef.current.position.copy(resolvedPosition);

        // Play footstep sounds (throttled to avoid spam) - different for walk vs sprint
        const now = Date.now();
        const isSprinting = keysPressedRef.current[SHIFT];
        const footstepInterval = isSprinting ? 250 : 400; // Faster sounds when running
        if (now - lastWalkSoundTimeRef.current > footstepInterval) {
          const soundMgr = getSoundManager();
          if (isSprinting) {
            soundMgr.playSprintSound();
          } else {
            soundMgr.playWalkSound();
          }
          lastWalkSoundTimeRef.current = now;
        }

        // Character rotation is now controlled by A/D keys (camera rotation)
        // and doesn't auto-rotate to movement direction for strafing support

        // Emit position to server
        if (socketClient) {
          socketClient.emit("move", {
            position: meshRef.current.position.toArray(),
            rotation: meshRef.current.rotation.toArray(),
          });
        }
      }
    }

    // Jump mechanics - Single jump only, no jetpack from jump
    // Jetpack only activates from mobile double-tap button
    const isOnGround =
      meshRef.current.position.y <= PHYSICS_CONSTANTS.GROUND_Y + 0.01;
    const currentTime = Date.now();

    if (keysPressedRef.current[SPACE] && isOnGround && !isJumpingRef.current) {
      // Check for mobile jetpack trigger only
      const mobileDoubleTap = mobileJetpackTriggerRef?.current || false;

      if (mobileDoubleTap) {
        // Mobile double-tap - activate jetpack mode
        jetpackActiveRef.current = true;
        setShowJetpackFlame(true);
        isJumpingRef.current = true;
        verticalVelocityRef.current = PHYSICS_CONSTANTS.JETPACK_INITIAL_BOOST;
        jumpHoldTimeRef.current = 0;
        tagDebug(`🚀 Jetpack activated (mobile double-tap)!`);

        // Reset mobile trigger
        if (mobileJetpackTriggerRef) {
          mobileJetpackTriggerRef.current = false;
        }

        // Play jetpack activation sound
        try {
          const soundMgr = getSoundManager();
          if (soundMgr) {
            soundMgr.playJetpackActivateSound();
          }
        } catch {
          // Sound manager not ready - silently continue
        }
      } else {
        // Single jump - normal jump only (no jetpack from space bar)
        jetpackActiveRef.current = false;
        isJumpingRef.current = true;
        verticalVelocityRef.current = PHYSICS_CONSTANTS.JUMP_INITIAL_FORCE;
        jumpHoldTimeRef.current = 0;
        lastJumpTimeRef.current = currentTime;
      }

      // Capture horizontal momentum at jump start
      horizontalMomentumRef.current
        .copy(directionRef.current)
        .multiplyScalar(speed);

      // Play jump sound with error handling
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) {
          soundMgr.playJumpSound();
        }
      } catch {
        // Sound manager not ready - silently continue
      }
    }

    // Apply jetpack thrust while space is held (only if jetpack active)
    if (
      jetpackActiveRef.current &&
      isJumpingRef.current &&
      keysPressedRef.current[SPACE]
    ) {
      if (jumpHoldTimeRef.current < PHYSICS_CONSTANTS.JETPACK_MAX_HOLD_TIME) {
        jumpHoldTimeRef.current += delta;
        // Consistent, gentle thrust for floaty jetpack feel
        const thrustMultiplier =
          1 -
          (jumpHoldTimeRef.current / PHYSICS_CONSTANTS.JETPACK_MAX_HOLD_TIME) *
            0.3;
        verticalVelocityRef.current +=
          PHYSICS_CONSTANTS.JETPACK_HOLD_FORCE * delta * thrustMultiplier;

        // Start thrust sound if not already playing
        if (!jetpackThrustSoundRef.current) {
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              jetpackThrustSoundRef.current = soundMgr.playJetpackThrustSound();
            }
          } catch {
            // Sound manager not ready - silently continue
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
        // Sound manager not ready - silently continue
      }
    }

    // RCS jets (SHIFT in air) - directional thrust from QWEASD
    if (!isOnGround && keysPressedRef.current[SHIFT]) {
      if (!isUsingRCSRef.current) {
        isUsingRCSRef.current = true;
        rcsTimeRemainingRef.current = PHYSICS_CONSTANTS.RCS_MAX_DURATION;
        tagDebug("🎯 RCS jets activated!");
      }

      if (rcsTimeRemainingRef.current > 0) {
        rcsTimeRemainingRef.current -= delta;

        // Apply directional RCS thrust based on QWEASD input
        const rcsDirection = new THREE.Vector3();
        const hasRCSInput =
          keysPressedRef.current[W] ||
          keysPressedRef.current[S] ||
          keysPressedRef.current[A] ||
          keysPressedRef.current[D] ||
          keysPressedRef.current[Q] ||
          keysPressedRef.current[E];

        if (keysPressedRef.current[W]) rcsDirection.z += 1;
        if (keysPressedRef.current[S]) rcsDirection.z -= 1;
        if (keysPressedRef.current[A]) rcsDirection.x += 1;
        if (keysPressedRef.current[D]) rcsDirection.x -= 1;
        if (keysPressedRef.current[Q])
          verticalVelocityRef.current +=
            PHYSICS_CONSTANTS.RCS_THRUST * delta * 2; // Up
        if (keysPressedRef.current[E])
          verticalVelocityRef.current -=
            PHYSICS_CONSTANTS.RCS_THRUST * delta * 2; // Down

        // Play RCS sound when input is active (throttle to ~10 times per second)
        if (hasRCSInput && currentTime - lastRCSSoundTimeRef.current > 100) {
          lastRCSSoundTimeRef.current = currentTime;
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              soundMgr.playRCSSound();
            }
          } catch {
            // Sound manager not ready - silently continue
          }
        }

        // Rotate direction by camera angle
        if (rcsDirection.length() > 0) {
          rcsDirection.normalize();
          rcsDirection.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            -cameraRotationRef.current.horizontal
          );
          horizontalMomentumRef.current.add(
            rcsDirection.multiplyScalar(
              PHYSICS_CONSTANTS.RCS_THRUST * delta * 10
            )
          );
        }
      }
    } else if (isOnGround) {
      // Reset RCS when landing
      isUsingRCSRef.current = false;
      rcsTimeRemainingRef.current = PHYSICS_CONSTANTS.RCS_MAX_DURATION;
    }

    // Apply moon PHYSICS_CONSTANTS.GRAVITY and physics while in air
    if (isJumpingRef.current || !isOnGround) {
      // Very slow fall due to moon's low PHYSICS_CONSTANTS.GRAVITY
      verticalVelocityRef.current -= PHYSICS_CONSTANTS.GRAVITY;
      verticalVelocityRef.current *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
      meshRef.current.position.y += verticalVelocityRef.current;

      // Preserve horizontal momentum with slight decay
      horizontalMomentumRef.current.multiplyScalar(
        PHYSICS_CONSTANTS.MOMENTUM_PRESERVATION
      );

      // Allow some air control - blend player input with momentum
      inputDirectionRef.current
        .copy(directionRef.current)
        .multiplyScalar(speed * PHYSICS_CONSTANTS.HORIZONTAL_AIR_CONTROL);
      finalMovementRef.current
        .copy(horizontalMomentumRef.current)
        .add(inputDirectionRef.current);

      meshRef.current.position.x += finalMovementRef.current.x * delta * 10;
      meshRef.current.position.z += finalMovementRef.current.z * delta * 10;

      // Check if landed
      if (meshRef.current.position.y <= PHYSICS_CONSTANTS.GROUND_Y) {
        meshRef.current.position.y = PHYSICS_CONSTANTS.GROUND_Y;

        // Capture landing velocity before resetting
        const landingVelocity = Math.abs(verticalVelocityRef.current);

        isJumpingRef.current = false;
        jetpackActiveRef.current = false;
        setShowJetpackFlame(false);
        isUsingRCSRef.current = false;
        verticalVelocityRef.current = 0;
        jumpHoldTimeRef.current = 0;
        horizontalMomentumRef.current.set(0, 0, 0);

        // Play landing sound scaled by impact velocity
        try {
          const soundMgr = getSoundManager();
          if (soundMgr) {
            soundMgr.playLandingSoundScaled(landingVelocity);
          }
        } catch {
          // Sound manager not ready - silently continue
        }

        // Trigger dust effect on hard landing (velocity > 0.02)
        if (landingVelocity > 0.02) {
          setShowDustEffect(true);
          setTimeout(() => setShowDustEffect(false), 300);
        }
      }
    }

    // Notify parent of position changes (only when position actually changes)
    if (onPositionUpdate && meshRef.current) {
      const currentPos = meshRef.current.position;
      const distanceMoved = currentPos.distanceTo(
        lastReportedPositionRef.current
      );

      if (distanceMoved > PHYSICS_CONSTANTS.POSITION_UPDATE_THRESHOLD) {
        onPositionUpdate(currentPos.toArray() as [number, number, number]);
        lastReportedPositionRef.current.copy(currentPos);
      }
    }

    // Smooth third-person camera follow with rotation
    idealCameraPositionRef.current.set(
      meshRef.current.position.x + cameraOffsetRef.current.x,
      meshRef.current.position.y + cameraOffsetRef.current.y,
      meshRef.current.position.z + cameraOffsetRef.current.z
    );

    // Lerp camera position for smooth following
    // If skycam is active, raise the camera and lerp more slowly for a floating feel
    if (skycamRef.current) {
      skyTargetRef.current.copy(idealCameraPositionRef.current);
      skyTargetRef.current.y += 12; // raise camera when in skycam
      state.camera.position.lerp(skyTargetRef.current, 0.06);
    } else {
      state.camera.position.lerp(idealCameraPositionRef.current, 0.1);
    }

    // Make camera look at the character
    state.camera.lookAt(
      meshRef.current.position.x,
      meshRef.current.position.y + 0.5,
      meshRef.current.position.z
    );
  });

  const currentPlayer = gameManager?.getPlayers().get(currentPlayerId);
  const isIt = currentPlayer?.isIt || false;

  // Calculate current velocity for animation
  const currentVelocity: [number, number, number] = [
    velocityRef.current.x, // eslint-disable-line react-hooks/refs
    velocityRef.current.y, // eslint-disable-line react-hooks/refs
    velocityRef.current.z, // eslint-disable-line react-hooks/refs
  ];

  // Check if sprinting
  const isSprinting = keysPressedRef.current[SHIFT];

  // Player spawn at [0, 0.5, 0] - center of map, clear of all rocks
  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      <SpacemanModel
        color={isIt ? "#ff4444" : "#4a90e2"}
        isIt={isIt}
        // Pass ref values for per-frame updates without React re-renders (R3F optimization pattern)
        velocity={currentVelocity} // eslint-disable-line react-hooks/refs
        cameraRotation={cameraRotationRef.current.horizontal} // eslint-disable-line react-hooks/refs
        isSprinting={isSprinting} // eslint-disable-line react-hooks/refs
        isJetpackActive={jetpackActiveRef.current} // eslint-disable-line react-hooks/refs
      />
      {/* Jetpack thrust visual effect */}
      {showJetpackFlame && (
        <group position={[0, -0.5, 0]}>
          {/* Flame cone */}
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.15, 0.4, 8]} />
            <meshStandardMaterial
              color="#ff6600"
              opacity={0.7}
              transparent
              // eslint-disable-next-line react/no-unknown-property
              emissive="#ff4400"
              // eslint-disable-next-line react/no-unknown-property
              emissiveIntensity={1.5}
            />
          </mesh>
          {/* Inner bright core */}
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.08, 0.25, 8]} />
            <meshStandardMaterial
              color="#ffff00"
              opacity={0.9}
              transparent
              // eslint-disable-next-line react/no-unknown-property
              emissive="#ffff00"
              // eslint-disable-next-line react/no-unknown-property
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      )}
      {/* Landing dust effect */}
      {showDustEffect && (
        <group position={[0, -0.4, 0]}>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.3 + (i % 2) * 0.2; // Alternating radii for variation
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * radius,
                  0.1,
                  Math.sin(angle) * radius,
                ]}
              >
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color="#999999" opacity={0.6} transparent />
              </mesh>
            );
          })}
        </group>
      )}
      {/* Debug hitbox visualization */}
      {props.showHitboxes && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#00ff00"
            // eslint-disable-next-line react/no-unknown-property
            wireframe={true}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}
    </group>
  );
});

PlayerCharacter.displayName = "PlayerCharacter";
