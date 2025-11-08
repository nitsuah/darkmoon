import * as React from "react";
import { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Socket } from "socket.io-client";
import * as THREE from "three";
import type { Clients } from "../../types/socket";
import CollisionSystem from "../CollisionSystem";
import GameManager, { GameState } from "../GameManager";
import { W, A, S, D, Q, E, SHIFT, SPACE } from "../utils";
import SpacemanModel from "../SpacemanModel";
import { getSoundManager } from "../SoundManager";

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

// Dedicated tag debug logger with timestamps and clear prefixes
const tagDebug = (...args: unknown[]) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta may not be available
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[TAG ${timestamp}]`, ...args);
  }
};

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

  const meshRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const cameraOffset = useRef(new THREE.Vector3(0, 3, -5)); // Camera position relative to player
  const cameraRotation = useRef({ horizontal: 0, vertical: 0.2 }); // Track camera rotation
  const skycam = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const isFirstMouse = useRef(true);
  const collisionSystem = useRef(new CollisionSystem());
  const lastTagCheck = useRef(0);
  const frameCounter = useRef(0);

  // Track last reported position to avoid unnecessary updates
  const lastReportedPosition = useRef(new THREE.Vector3(0, 0, 0));
  const POSITION_UPDATE_THRESHOLD = 0.01; // Only update if moved > 1cm

  // Player freeze state when tagged
  const isPlayerFrozen = useRef(false);
  const playerFreezeEndTime = useRef(0);

  // Jump mechanics - True moon-like low gravity physics (1/6 Earth gravity)
  const isJumping = useRef(false);
  const verticalVelocity = useRef(0);
  const jumpHoldTime = useRef(0); // Track how long space is held
  const horizontalMomentum = useRef(new THREE.Vector3(0, 0, 0)); // Preserve momentum in air
  const lastJumpTime = useRef(0); // For double-jump detection
  const jetpackActive = useRef(false); // Track if jetpack mode is active
  const isUsingRCS = useRef(false); // Track if RCS jets are active (SHIFT in air)

  const jetpackThrustSound = useRef<{
    osc: OscillatorNode;
    gain: GainNode;
  } | null>(null); // Track thrust sound
  const lastRCSSoundTime = useRef(0); // Throttle RCS sound

  // Reusable vectors to avoid allocations in animation loop
  const inputDirectionRef = useRef(new THREE.Vector3());
  const finalMovementRef = useRef(new THREE.Vector3());
  const idealCameraPositionRef = useRef(new THREE.Vector3());
  const skyTargetRef = useRef(new THREE.Vector3());

  // Dust effect state for landing
  const [showDustEffect, setShowDustEffect] = useState(false);
  const [showJetpackFlame, setShowJetpackFlame] = useState(false);

  // Physics constants - tuned for heavier, floatier feel
  const GRAVITY = 0.0005; // Reduced from 0.0008 for more floaty feel
  const GROUND_Y = 0.5;
  const AIR_RESISTANCE = 0.996; // Slightly more resistance for heavier feel
  const HORIZONTAL_AIR_CONTROL = 0.5; // Reduced from 0.6 - less control in air
  const MOMENTUM_PRESERVATION = 0.985; // Slightly more decay for heavier feel

  // Jump physics (first jump)
  const JUMP_INITIAL_FORCE = 0.1; // Reduced from 0.12 for heavier feel

  // Jetpack physics (mobile double-tap triggered only)
  const JETPACK_INITIAL_BOOST = 0.04; // Reduced for slower jetpack
  const JETPACK_HOLD_FORCE = 0.05; // Reduced for slower, more controlled thrust
  const JETPACK_MAX_HOLD_TIME = 2.5; // Increased from 1.5 - longer duration

  // RCS jets (SHIFT in air)
  const RCS_THRUST = 0.05; // Directional thrust strength
  const RCS_MAX_DURATION = 3.0; // Can use RCS for 3 seconds
  const rcsTimeRemaining = useRef(0); // Track RCS fuel

  // Expose reset and freeze functions to parent via ref
  React.useImperativeHandle(ref, () => ({
    resetPosition: () => {
      if (meshRef.current) {
        meshRef.current.position.set(0, 0.5, 0);
      }
      cameraRotation.current = { horizontal: 0, vertical: 0.2 };
      velocity.current.set(0, 0, 0);
      direction.current.set(0, 0, 0);
      isJumping.current = false;
      verticalVelocity.current = 0;
    },
    freezePlayer: (duration: number) => {
      isPlayerFrozen.current = true;
      playerFreezeEndTime.current = Date.now() + duration;
      tagDebug(`👤 Player frozen for ${duration}ms via ref`);
    },
  }));

  // gated debug logger - only logs in dev
  const debug = (...args: unknown[]) => {
    // Vite exposes import.meta.env.DEV; fall back to false if undefined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.log(...args);
    }
  };

  useFrame((state, delta) => {
    frameCounter.current++;

    if (!meshRef.current || isPaused) {
      // Debug: Log if we're not processing frames (every 100 frames)
      if (frameCounter.current % 100 === 0) {
        debug("Frame skipped:", { hasMesh: !!meshRef.current, isPaused });
      }
      return;
    }

    const now = Date.now();

    // Store mobile jetpack trigger locally to satisfy linter
    const mobileJetpackTriggerRef = mobileJetpackTrigger;

    // Check if player is frozen after being tagged
    if (isPlayerFrozen.current) {
      if (now >= playerFreezeEndTime.current) {
        isPlayerFrozen.current = false;
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
      if (isFirstMouse.current) {
        previousMouse.current.x = mouseControls.mouseX;
        previousMouse.current.y = mouseControls.mouseY;
        isFirstMouse.current = false;
      }

      const deltaX = mouseControls.mouseX - previousMouse.current.x;
      const deltaY = mouseControls.mouseY - previousMouse.current.y;

      const sensitivity = 0.002;

      if (bothMouseButtons) {
        // Both buttons: Rotate camera AND player (for movement control)
        cameraRotation.current.horizontal -= deltaX * sensitivity;
        cameraRotation.current.vertical += deltaY * sensitivity;
        skycam.current = false;
      } else if (mouseControls.rightClick) {
        // Right-click only: Rotate camera AND player facing (WoW style)
        cameraRotation.current.horizontal -= deltaX * sensitivity;
        cameraRotation.current.vertical += deltaY * sensitivity;
        skycam.current = false;
      } else if (mouseControls.middleClick) {
        // Middle-click: Rotate camera WITHOUT rotating player (peek mode)
        skycam.current = true;
        cameraRotation.current.horizontal -= deltaX * sensitivity;
        cameraRotation.current.vertical += deltaY * sensitivity;
      }
      // Left-click is now free for interactions (no camera control)

      // Clamp vertical rotation
      cameraRotation.current.vertical = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotation.current.vertical)
      );

      previousMouse.current.x = mouseControls.mouseX;
      previousMouse.current.y = mouseControls.mouseY;
    } else {
      isFirstMouse.current = true;
      skycam.current = false;
    }

    // Joystick camera rotation
    if (joystickCamera.x !== 0 || joystickCamera.y !== 0) {
      const joystickSensitivity = 0.03;
      cameraRotation.current.horizontal -=
        joystickCamera.x * joystickSensitivity * delta;
      cameraRotation.current.vertical +=
        joystickCamera.y * joystickSensitivity * delta;
    }

    // Keyboard camera rotation (A/D keys) - Also rotates character
    if (keysPressedRef.current[A]) {
      cameraRotation.current.horizontal += 2 * delta; // Rotate left
      // Also rotate character to match camera direction
      if (meshRef.current) {
        meshRef.current.rotation.y = cameraRotation.current.horizontal;
      }
    }
    if (keysPressedRef.current[D]) {
      cameraRotation.current.horizontal -= 2 * delta; // Rotate right
      // Also rotate character to match camera direction
      if (meshRef.current) {
        meshRef.current.rotation.y = cameraRotation.current.horizontal;
      }
    }

    // Always clamp vertical rotation (from joystick too)
    cameraRotation.current.vertical = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, cameraRotation.current.vertical)
    );

    // Calculate camera offset based on rotation
    const distance = 5;
    const offsetX =
      Math.sin(cameraRotation.current.horizontal) *
      Math.cos(cameraRotation.current.vertical) *
      distance;
    const offsetY = Math.sin(cameraRotation.current.vertical) * distance + 3;
    const offsetZ =
      Math.cos(cameraRotation.current.horizontal) *
      Math.cos(cameraRotation.current.vertical) *
      distance;

    cameraOffset.current.set(offsetX, offsetY, offsetZ);

    // If player is frozen, skip movement but allow camera controls
    if (isPlayerFrozen.current) {
      // Update camera position but don't process movement
      state.camera.position
        .copy(meshRef.current.position)
        .add(cameraOffset.current);
      state.camera.lookAt(meshRef.current.position);
      return;
    }

    // Calculate direction based on keys pressed and camera rotation
    direction.current.set(0, 0, 0);

    const hasKeyboardInput =
      keysPressedRef.current[W] ||
      keysPressedRef.current[S] ||
      keysPressedRef.current[Q] ||
      keysPressedRef.current[E];
    const hasJoystickInput = joystickMove.x !== 0 || joystickMove.y !== 0;

    // Calculate speed (used for movement and jump momentum)
    // Jetpack mode: fixed slower speed (sprint has no effect)
    // Normal mode: sprint = 5, walk = 2
    const speed = jetpackActive.current
      ? 1.5
      : keysPressedRef.current[SHIFT]
      ? 5
      : 2;

    // WoW-style auto-run: both mouse buttons held = move forward
    if (bothMouseButtons || hasKeyboardInput || hasJoystickInput) {
      // Movement relative to camera direction
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      // Calculate forward and right vectors based on camera rotation
      forward.set(
        -Math.sin(cameraRotation.current.horizontal),
        0,
        -Math.cos(cameraRotation.current.horizontal)
      );
      right.set(
        Math.cos(cameraRotation.current.horizontal),
        0,
        -Math.sin(cameraRotation.current.horizontal)
      );

      // Both mouse buttons: auto-run forward
      if (bothMouseButtons) {
        direction.current.add(forward);
      }

      // Keyboard input (can combine with mouse movement)
      if (keysPressedRef.current[W]) {
        direction.current.add(forward);
      }
      if (keysPressedRef.current[S]) {
        direction.current.sub(forward);
      }
      if (keysPressedRef.current[Q]) {
        direction.current.sub(right);
      }
      if (keysPressedRef.current[E]) {
        direction.current.add(right);
      }

      // Joystick input (Y is forward/back, X is left/right)
      if (hasJoystickInput) {
        direction.current.add(forward.clone().multiplyScalar(-joystickMove.y));
        direction.current.add(right.clone().multiplyScalar(joystickMove.x));
      }

      // Normalize direction
      if (direction.current.length() > 0) {
        direction.current.normalize();
        velocity.current.copy(direction.current).multiplyScalar(speed * delta);

        // Calculate new position with collision detection
        const currentPosition = meshRef.current.position.clone();
        const newPosition = currentPosition.clone().add(velocity.current);

        // Check for collisions and get resolved position
        const resolvedPosition = collisionSystem.current.checkCollision(
          currentPosition,
          newPosition
        );

        // Check for player-to-player collisions and tagging
        const myId = socketClient?.id || currentPlayerId;
        if (myId && gameManager) {
          const currentPlayer = gameManager.getPlayers().get(myId);
          const gameState = gameManager.getGameState();
          const now = Date.now();

          for (const [clientId, clientData] of Object.entries(clients)) {
            if (clientId !== myId) {
              const otherPlayerPos = new THREE.Vector3(...clientData.position);
              const distance = resolvedPosition.distanceTo(otherPlayerPos);

              // Handle collision
              if (
                collisionSystem.current.checkPlayerCollision(
                  resolvedPosition,
                  otherPlayerPos
                )
              ) {
                // Simple push-back collision resolution
                const pushDirection = resolvedPosition
                  .clone()
                  .sub(otherPlayerPos)
                  .normalize();
                resolvedPosition.add(pushDirection.multiplyScalar(0.1));
              }

              // Handle tagging bot in solo mode (only during active tag game)
              if (
                (clientId === "bot-1" || clientId === "bot-2") &&
                gameState.mode === "tag" &&
                gameState.isActive &&
                playerIsIt &&
                distance < 1.0 &&
                now - lastTagCheck.current > 3000
              ) {
                // Player tagged the bot!
                tagDebug(
                  `👤 PLAYER TAGGING ${clientId.toUpperCase()}! Distance: ${distance.toFixed(
                    2
                  )}, Cooldown elapsed: ${now - lastTagCheck.current}ms`
                );
                tagDebug(
                  `  State before: Player isIT=${playerIsIt}, Bot isIT=false`
                );

                if (setPlayerIsIt) setPlayerIsIt(false);
                if (setBotIsIt) setBotIsIt(true);
                lastTagCheck.current = now;

                // Update GameManager to keep it in sync
                if (gameManager) {
                  gameManager.updatePlayer(currentPlayerId, { isIt: false });
                  gameManager.updatePlayer(clientId, { isIt: true });
                }

                // Update gameState with new IT player
                if (setGameState) {
                  setGameState((prev) => ({
                    ...prev,
                    itPlayerId: clientId,
                  }));
                }

                // Trigger bot freeze by setting timestamp (only tagged player freezes)
                if (clientId === "bot-1" && setBot1GotTagged) {
                  setBot1GotTagged(now);
                } else if (clientId === "bot-2" && setBot2GotTagged) {
                  setBot2GotTagged(now);
                }

                // Play success tag sound (player tagged bot)
                try {
                  const soundMgr = getSoundManager();
                  if (soundMgr) {
                    soundMgr.playTagSound();
                  }
                } catch (error) {
                  console.warn("Sound manager not ready for tag sound:", error);
                }

                // Player should NOT freeze when tagging - only the tagged player freezes
                // isPlayerFrozen.current = true; // REMOVED
                // playerFreezeEndTime.current = now + PLAYER_FREEZE_DURATION; // REMOVED
                tagDebug(`  Player continues moving (no freeze for tagger)`);
                tagDebug(
                  `  Bot will freeze for 3000ms (via gotTaggedTimestamp)`
                );
                tagDebug(
                  `  State after: Player should become NOT IT, Bot should become IT and freeze`
                );

                // Notify parent component
                if (onTagSuccess) onTagSuccess();

                // Victory celebration effects
                const flashOverlay = document.createElement("div");
                flashOverlay.style.position = "fixed";
                flashOverlay.style.top = "0";
                flashOverlay.style.left = "0";
                flashOverlay.style.width = "100%";
                flashOverlay.style.height = "100%";
                flashOverlay.style.backgroundColor = "rgba(0, 255, 100, 0.3)";
                flashOverlay.style.pointerEvents = "none";
                flashOverlay.style.zIndex = "9999";
                flashOverlay.style.animation = "fadeOut 0.8s ease-out";
                document.body.appendChild(flashOverlay);
                setTimeout(() => flashOverlay.remove(), 800);

                // Show victory text with fireworks
                const victoryText = document.createElement("div");
                victoryText.textContent = "🎉🎆 TAG! 🎇🎉";
                victoryText.style.position = "fixed";
                victoryText.style.top = "50%";
                victoryText.style.left = "50%";
                victoryText.style.transform = "translate(-50%, -50%)";
                victoryText.style.fontSize = "72px";
                victoryText.style.fontWeight = "bold";
                victoryText.style.color = "#FFD700";
                victoryText.style.textShadow =
                  "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)";
                victoryText.style.pointerEvents = "none";
                victoryText.style.zIndex = "10000";
                victoryText.style.animation =
                  "popIn 0.5s ease-out, fadeOut 1s ease-out 0.5s";
                document.body.appendChild(victoryText);
                setTimeout(() => victoryText.remove(), 1500);

                // Confetti burst!
                for (let i = 0; i < 50; i++) {
                  const confetti = document.createElement("div");
                  confetti.textContent = ["🎉", "🎊", "⭐", "✨", "💫"][
                    Math.floor(Math.random() * 5)
                  ];
                  confetti.style.position = "fixed";
                  confetti.style.left = "50%";
                  confetti.style.top = "50%";
                  confetti.style.fontSize = "24px";
                  confetti.style.pointerEvents = "none";
                  confetti.style.zIndex = "9998";

                  const angle = (Math.PI * 2 * i) / 50;
                  const velocity = 200 + Math.random() * 200;
                  const tx = Math.cos(angle) * velocity;
                  const ty = Math.sin(angle) * velocity;

                  confetti.style.animation = `confettiBurst 1.5s ease-out forwards`;
                  confetti.style.setProperty("--tx", `${tx}px`);
                  confetti.style.setProperty("--ty", `${ty}px`);

                  document.body.appendChild(confetti);
                  setTimeout(() => confetti.remove(), 1500);
                }

                lastTagCheck.current = now;
              }

              // Handle tagging (multiplayer mode - only if current player is 'it' and close enough)
              if (
                gameState.isActive &&
                gameState.mode === "tag" &&
                currentPlayer?.isIt &&
                distance < 1.0 &&
                now - lastTagCheck.current > 1000
              ) {
                // 1 second cooldown

                debug(`Attempting to tag player ${clientId}`);
                if (gameManager.tagPlayer(myId, clientId)) {
                  // Play tag sound
                  const soundMgr = getSoundManager();
                  soundMgr.playTagSound();

                  // Victory celebration effects
                  // Flash screen green briefly
                  const flashOverlay = document.createElement("div");
                  flashOverlay.style.position = "fixed";
                  flashOverlay.style.top = "0";
                  flashOverlay.style.left = "0";
                  flashOverlay.style.width = "100%";
                  flashOverlay.style.height = "100%";
                  flashOverlay.style.backgroundColor = "rgba(0, 255, 100, 0.3)";
                  flashOverlay.style.pointerEvents = "none";
                  flashOverlay.style.zIndex = "9999";
                  flashOverlay.style.animation = "fadeOut 0.8s ease-out";
                  document.body.appendChild(flashOverlay);
                  setTimeout(() => flashOverlay.remove(), 800);

                  // Show victory text with fireworks
                  const victoryText = document.createElement("div");
                  victoryText.textContent = "🎉🎆 TAG! 🎇🎉";
                  victoryText.style.position = "fixed";
                  victoryText.style.top = "50%";
                  victoryText.style.left = "50%";
                  victoryText.style.transform = "translate(-50%, -50%)";
                  victoryText.style.fontSize = "72px";
                  victoryText.style.fontWeight = "bold";
                  victoryText.style.color = "#FFD700";
                  victoryText.style.textShadow =
                    "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)";
                  victoryText.style.pointerEvents = "none";
                  victoryText.style.zIndex = "10000";
                  victoryText.style.animation =
                    "popIn 0.5s ease-out, fadeOut 1s ease-out 0.5s";
                  document.body.appendChild(victoryText);
                  setTimeout(() => victoryText.remove(), 1500);

                  // Confetti burst!
                  for (let i = 0; i < 50; i++) {
                    const confetti = document.createElement("div");
                    confetti.textContent = ["🎉", "🎊", "⭐", "✨", "💫"][
                      Math.floor(Math.random() * 5)
                    ];
                    confetti.style.position = "fixed";
                    confetti.style.left = "50%";
                    confetti.style.top = "50%";
                    confetti.style.fontSize = "24px";
                    confetti.style.pointerEvents = "none";
                    confetti.style.zIndex = "9998";

                    const angle = (Math.PI * 2 * i) / 50;
                    const velocity = 200 + Math.random() * 200;
                    const tx = Math.cos(angle) * velocity;
                    const ty = Math.sin(angle) * velocity;

                    confetti.style.animation = `confettiBurst 1.5s ease-out forwards`;
                    confetti.style.setProperty("--tx", `${tx}px`);
                    confetti.style.setProperty("--ty", `${ty}px`);

                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 1500);
                  }

                  if (socketClient) {
                    socketClient.emit("player-tagged", {
                      taggerId: myId,
                      taggedId: clientId,
                    });
                  }
                  lastTagCheck.current = now;
                }
              }
            }
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
    const isOnGround = meshRef.current.position.y <= GROUND_Y + 0.01;
    const currentTime = Date.now();

    if (keysPressedRef.current[SPACE] && isOnGround && !isJumping.current) {
      // Check for mobile jetpack trigger only
      const mobileDoubleTap = mobileJetpackTriggerRef?.current || false;

      if (mobileDoubleTap) {
        // Mobile double-tap - activate jetpack mode
        jetpackActive.current = true;
        setShowJetpackFlame(true);
        isJumping.current = true;
        verticalVelocity.current = JETPACK_INITIAL_BOOST;
        jumpHoldTime.current = 0;
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
        } catch (error) {
          console.warn("Sound manager not ready for jetpack sound:", error);
        }
      } else {
        // Single jump - normal jump only (no jetpack from space bar)
        jetpackActive.current = false;
        isJumping.current = true;
        verticalVelocity.current = JUMP_INITIAL_FORCE;
        jumpHoldTime.current = 0;
        lastJumpTime.current = currentTime;
      }

      // Capture horizontal momentum at jump start
      horizontalMomentum.current.copy(direction.current).multiplyScalar(speed);

      // Play jump sound with error handling
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) {
          soundMgr.playJumpSound();
        }
      } catch (error) {
        console.warn("Sound manager not ready for jump sound:", error);
      }
    }

    // Apply jetpack thrust while space is held (only if jetpack active)
    if (
      jetpackActive.current &&
      isJumping.current &&
      keysPressedRef.current[SPACE]
    ) {
      if (jumpHoldTime.current < JETPACK_MAX_HOLD_TIME) {
        jumpHoldTime.current += delta;
        // Consistent, gentle thrust for floaty jetpack feel
        const thrustMultiplier =
          1 - (jumpHoldTime.current / JETPACK_MAX_HOLD_TIME) * 0.3;
        verticalVelocity.current +=
          JETPACK_HOLD_FORCE * delta * thrustMultiplier;

        // Start thrust sound if not already playing
        if (!jetpackThrustSound.current) {
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              jetpackThrustSound.current = soundMgr.playJetpackThrustSound();
            }
          } catch (error) {
            console.warn("Sound manager not ready for thrust sound:", error);
          }
        }
      }
    } else if (jetpackThrustSound.current) {
      // Stop thrust sound when space is released or jetpack ends
      try {
        const soundMgr = getSoundManager();
        if (soundMgr) {
          soundMgr.stopJetpackThrustSound(jetpackThrustSound.current);
          jetpackThrustSound.current = null;
        }
      } catch (error) {
        console.warn("Error stopping thrust sound:", error);
      }
    }

    // RCS jets (SHIFT in air) - directional thrust from QWEASD
    if (!isOnGround && keysPressedRef.current[SHIFT]) {
      if (!isUsingRCS.current) {
        isUsingRCS.current = true;
        rcsTimeRemaining.current = RCS_MAX_DURATION;
        tagDebug("🎯 RCS jets activated!");
      }

      if (rcsTimeRemaining.current > 0) {
        rcsTimeRemaining.current -= delta;

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
          verticalVelocity.current += RCS_THRUST * delta * 2; // Up
        if (keysPressedRef.current[E])
          verticalVelocity.current -= RCS_THRUST * delta * 2; // Down

        // Play RCS sound when input is active (throttle to ~10 times per second)
        if (hasRCSInput && currentTime - lastRCSSoundTime.current > 100) {
          lastRCSSoundTime.current = currentTime;
          try {
            const soundMgr = getSoundManager();
            if (soundMgr) {
              soundMgr.playRCSSound();
            }
          } catch (error) {
            console.warn("Sound manager not ready for RCS sound:", error);
          }
        }

        // Rotate direction by camera angle
        if (rcsDirection.length() > 0) {
          rcsDirection.normalize();
          rcsDirection.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            -cameraRotation.current.horizontal
          );
          horizontalMomentum.current.add(
            rcsDirection.multiplyScalar(RCS_THRUST * delta * 10)
          );
        }
      }
    } else if (isOnGround) {
      // Reset RCS when landing
      isUsingRCS.current = false;
      rcsTimeRemaining.current = RCS_MAX_DURATION;
    }

    // Apply moon gravity and physics while in air
    if (isJumping.current || !isOnGround) {
      // Very slow fall due to moon's low gravity
      verticalVelocity.current -= GRAVITY;
      verticalVelocity.current *= AIR_RESISTANCE;
      meshRef.current.position.y += verticalVelocity.current;

      // Preserve horizontal momentum with slight decay
      horizontalMomentum.current.multiplyScalar(MOMENTUM_PRESERVATION);

      // Allow some air control - blend player input with momentum
      inputDirectionRef.current
        .copy(direction.current)
        .multiplyScalar(speed * HORIZONTAL_AIR_CONTROL);
      finalMovementRef.current
        .copy(horizontalMomentum.current)
        .add(inputDirectionRef.current);

      meshRef.current.position.x += finalMovementRef.current.x * delta * 10;
      meshRef.current.position.z += finalMovementRef.current.z * delta * 10;

      // Check if landed
      if (meshRef.current.position.y <= GROUND_Y) {
        meshRef.current.position.y = GROUND_Y;

        // Capture landing velocity before resetting
        const landingVelocity = Math.abs(verticalVelocity.current);

        isJumping.current = false;
        jetpackActive.current = false;
        setShowJetpackFlame(false);
        isUsingRCS.current = false;
        verticalVelocity.current = 0;
        jumpHoldTime.current = 0;
        horizontalMomentum.current.set(0, 0, 0);

        // Play landing sound scaled by impact velocity
        try {
          const soundMgr = getSoundManager();
          if (soundMgr) {
            soundMgr.playLandingSoundScaled(landingVelocity);
          }
        } catch (error) {
          console.warn("Sound manager not ready for landing sound:", error);
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
      const distanceMoved = currentPos.distanceTo(lastReportedPosition.current);

      if (distanceMoved > POSITION_UPDATE_THRESHOLD) {
        onPositionUpdate(currentPos.toArray() as [number, number, number]);
        lastReportedPosition.current.copy(currentPos);
      }
    }

    // Smooth third-person camera follow with rotation
    idealCameraPositionRef.current.set(
      meshRef.current.position.x + cameraOffset.current.x,
      meshRef.current.position.y + cameraOffset.current.y,
      meshRef.current.position.z + cameraOffset.current.z
    );

    // Lerp camera position for smooth following
    // If skycam is active, raise the camera and lerp more slowly for a floating feel
    if (skycam.current) {
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
    velocity.current.x, // eslint-disable-line react-hooks/refs
    velocity.current.y, // eslint-disable-line react-hooks/refs
    velocity.current.z, // eslint-disable-line react-hooks/refs
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
        cameraRotation={cameraRotation.current.horizontal} // eslint-disable-line react-hooks/refs
        isSprinting={isSprinting} // eslint-disable-line react-hooks/refs
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
