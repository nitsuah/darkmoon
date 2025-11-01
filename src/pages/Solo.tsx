import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import { io, Socket } from "socket.io-client";
import * as THREE from "three";
import type { Clients } from "../types/socket";
import PerformanceMonitor from "../components/PerformanceMonitor";
import QualitySettings, { QualityLevel } from "../components/QualitySettings";
import ThemeToggle from "../components/ThemeToggle";
import Tutorial from "../components/Tutorial";
import HelpModal from "../components/HelpModal";
import ChatBox from "../components/ChatBox";
import CollisionSystem from "../components/CollisionSystem";
import GameManager, { GameState, Player } from "../components/GameManager";
import GameUI from "../components/GameUI";
import {
  KeyDisplay,
  W,
  A,
  S,
  D,
  Q,
  E,
  SHIFT,
  SPACE,
} from "../components/utils";
import { MobileJoystick } from "../components/MobileJoystick";
import { MobileButton } from "../components/MobileButton";
import { useOrientation } from "../components/useOrientation";
import SpacemanModel from "../components/SpacemanModel";
import "../styles/App.css";
import { getSoundManager } from "../components/SoundManager";
import PauseMenu from "../components/PauseMenu";
import { useNavigate } from "react-router-dom";
import { filterProfanity } from "../lib/constants/profanity";

// Solo mode: no reconnection needed
const MAX_CHAT_MESSAGES = 50;

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface UserWrapperProps {
  position: [number, number, number];
  rotation: [number, number, number];
  id: string;
  isIt?: boolean;
}

// Top-level gated debug logger - only logs in dev
let __isDev = false;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - import.meta may not be available
try {
  // access import.meta in a try to avoid environments where it might not be available
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - import.meta may not be available
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    __isDev = true;
  }
} catch {
  // ignore
}

// Also enable debug if Node's NODE_ENV is not production (useful in test envs)
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - process may not be defined in browser
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV &&
    process.env.NODE_ENV !== "production"
  ) {
    __isDev = true;
  }
} catch {
  // ignore
}

const debug = (...args: unknown[]) => {
  if (__isDev) {
    console.log(...args);
  }
};

const UserWrapper: React.FC<UserWrapperProps> = ({
  position,
  rotation,
  id,
  isIt = false,
}) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color={isIt ? "#ff4444" : "#44ff44"} />
      </mesh>

      {/* Glow effect for 'it' player */}
      {isIt && (
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#ff6666" transparent opacity={0.3} />
        </mesh>
      )}

      <Text
        position={[0, 1.2, 0]}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontSize={0.3}
      >
        {id.slice(-4)}
        {isIt && " (IT)"}
      </Text>
    </group>
  );
};

const TerrainPlane: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    // Add height variation to terrain using vertex manipulation
    const geometry = meshRef.current.geometry as THREE.PlaneGeometry;

    // Safety check for test environment
    if (!geometry || !geometry.getAttribute) return;

    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) return;

    // Generate simple rolling hills using noise-like function
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);

      // Multiple sine waves for varied terrain
      const height =
        Math.sin(x * 0.1) * 0.3 +
        Math.cos(y * 0.15) * 0.25 +
        Math.sin((x + y) * 0.08) * 0.2 +
        Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.15;

      positionAttribute.setZ(i, height);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals(); // Recalculate normals for proper lighting
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 100, 64, 64]} />{" "}
      {/* Increased segments for terrain detail */}
      <meshStandardMaterial
        color="#8B8680"
        roughness={0.95}
        metalness={0.1}
      />{" "}
      {/* Moon-like gray */}
    </mesh>
  );
};

interface BotCharacterProps {
  playerPosition: [number, number, number];
  isPaused: boolean;
  onPositionUpdate: (position: [number, number, number]) => void;
  isIt: boolean;
  playerIsIt: boolean;
  onTagPlayer: () => void;
  gameState: GameState;
}

const BotCharacter: React.FC<BotCharacterProps> = ({
  playerPosition,
  isPaused,
  onPositionUpdate,
  isIt,
  playerIsIt,
  onTagPlayer,
  gameState,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const lastTagTime = useRef(0);
  const isPausedAfterTag = useRef(false);
  const pauseEndTime = useRef(0);
  const CHASE_RADIUS = 10; // Start chasing when player is within 10 units
  const BOT_SPEED = 1.5; // Bot moves at 1.5 units/second
  const FLEE_SPEED = 1.8; // Slightly slower than player max speed (2.0)
  const TAG_COOLDOWN = 2500; // 2.5 second cooldown between tags (increased from 1500)
  const TAG_DISTANCE = 1.2; // Reduced collision distance for easier tagging
  const PAUSE_AFTER_TAG = 1500; // Pause for 1.5 seconds after tagging
  const INITIAL_POSITION: [number, number, number] = [5, 0.5, 5];

  useFrame((state, delta) => {
    if (!meshRef.current || isPaused) return;

    const now = Date.now();

    // Check if bot is paused after tagging
    if (isPausedAfterTag.current) {
      if (now >= pauseEndTime.current) {
        isPausedAfterTag.current = false;
      } else {
        // Bot is frozen, show visual indicator by slightly pulsing scale
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        return;
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }

    const botPos = meshRef.current.position;
    const playerPos = new THREE.Vector3(...playerPosition);
    const distance = botPos.distanceTo(playerPos);

    // Behavior depends on who is IT (only during active tag games)
    if (isIt && gameState.isActive && gameState.mode === "tag") {
      // Bot is IT - ALWAYS chase player (no distance limit)
      if (distance > TAG_DISTANCE) {
        // Chase player
        const direction = new THREE.Vector3()
          .subVectors(playerPos, botPos)
          .normalize();

        botPos.x += direction.x * BOT_SPEED * delta;
        botPos.z += direction.z * BOT_SPEED * delta;

        // Rotate bot to face player
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      } else if (now - lastTagTime.current > TAG_COOLDOWN) {
        // Tag the player!
        lastTagTime.current = now;
        isPausedAfterTag.current = true;
        pauseEndTime.current = now + PAUSE_AFTER_TAG;
        onTagPlayer();
      }
    } else if (playerIsIt && gameState.isActive && gameState.mode === "tag") {
      // Player is IT - only flee when player is within detection radius
      if (distance < CHASE_RADIUS) {
        // Flee away from player
        const direction = new THREE.Vector3()
          .subVectors(botPos, playerPos) // Reversed direction to flee
          .normalize();

        botPos.x += direction.x * FLEE_SPEED * delta;
        botPos.z += direction.z * FLEE_SPEED * delta;

        // Rotate bot to face away from player
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      }
    }

    // Notify parent of position change
    onPositionUpdate([botPos.x, botPos.y, botPos.z]);
  });

  return (
    <group ref={meshRef} position={INITIAL_POSITION}>
      <SpacemanModel color={isIt ? "#ff4444" : "#44ff44"} isIt={isIt} />
      {/* Bot label - yellow sphere above head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      {/* Chase radius indicator - transparent ring at ground level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[CHASE_RADIUS - 0.2, CHASE_RADIUS, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

interface PlayerCharacterProps {
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
}

export interface PlayerCharacterHandle {
  resetPosition: () => void;
}

const PlayerCharacter = React.forwardRef<
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

  // Jump mechanics - Moon-like low gravity physics
  const isJumping = useRef(false);
  const verticalVelocity = useRef(0);
  const jumpHoldTime = useRef(0); // Track how long space is held
  const JUMP_INITIAL_FORCE = 0.1; // Initial thrust (increased from 0.08 for better launch)
  const JUMP_HOLD_FORCE = 0.15; // Additional thrust while holding (increased from 0.12 for stronger jetpack)
  const JUMP_MAX_HOLD_TIME = 1.0; // Max seconds to hold for extra height (doubled from 0.5 for longer thrust)
  const GRAVITY = 0.002; // Moon gravity (reduced from 0.003 for more floaty feeling)
  const GROUND_Y = 0.5;
  const AIR_RESISTANCE = 0.99; // More floaty feeling (increased from 0.98 for less drag)

  // Expose reset function to parent via ref
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

    // Calculate direction based on keys pressed and camera rotation
    direction.current.set(0, 0, 0);

    const hasKeyboardInput =
      keysPressedRef.current[W] ||
      keysPressedRef.current[S] ||
      keysPressedRef.current[Q] ||
      keysPressedRef.current[E];
    const hasJoystickInput = joystickMove.x !== 0 || joystickMove.y !== 0;

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

        // Apply speed (faster with shift)
        const speed = keysPressedRef.current[SHIFT] ? 5 : 2;
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
                clientId === "bot-1" &&
                gameState.mode === "tag" &&
                gameState.isActive &&
                playerIsIt &&
                distance < 1.2 &&
                now - lastTagCheck.current > 2500
              ) {
                // Player tagged the bot!
                if (setPlayerIsIt) setPlayerIsIt(false);
                if (setBotIsIt) setBotIsIt(true);
                lastTagCheck.current = now;

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
                victoryText.textContent = "🎉🎆 TAG! ��🎉";
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
                  victoryText.textContent = "🎉🎆 TAG! ��🎉";
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

        // Play walking sound (throttled to avoid spam)
        const now = Date.now();
        const walkSoundInterval = keysPressedRef.current[SHIFT] ? 250 : 400; // Faster sounds when running
        if (now - lastWalkSoundTimeRef.current > walkSoundInterval) {
          const soundMgr = getSoundManager();
          soundMgr.playWalkSound();
          lastWalkSoundTimeRef.current = now;
        }

        // Debug: Log position changes (gated)
        if (
          Math.abs(direction.current.x) > 0 ||
          Math.abs(direction.current.z) > 0
        ) {
          debug("Character position:", meshRef.current.position.toArray());
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

    // Jump mechanics (independent of horizontal movement) - Floaty jetpack style
    const isOnGround = meshRef.current.position.y <= GROUND_Y + 0.01;

    if (keysPressedRef.current[SPACE] && isOnGround && !isJumping.current) {
      // Start jump
      isJumping.current = true;
      verticalVelocity.current = JUMP_INITIAL_FORCE;
      jumpHoldTime.current = 0;
    }

    // Apply continuous thrust while space is held (jetpack style)
    if (isJumping.current && keysPressedRef.current[SPACE]) {
      if (jumpHoldTime.current < JUMP_MAX_HOLD_TIME) {
        jumpHoldTime.current += delta;
        // Gradual thrust that decreases over time
        const thrustMultiplier = 1 - jumpHoldTime.current / JUMP_MAX_HOLD_TIME;
        verticalVelocity.current += JUMP_HOLD_FORCE * delta * thrustMultiplier;
      }
    }

    // Apply moon gravity and air resistance
    if (isJumping.current || !isOnGround) {
      verticalVelocity.current -= GRAVITY;
      verticalVelocity.current *= AIR_RESISTANCE; // Floaty feeling
      meshRef.current.position.y += verticalVelocity.current;

      // Apply horizontal air drift (maintain momentum)
      if (velocity.current.length() > 0) {
        const airDrift = velocity.current.clone().multiplyScalar(0.95);
        meshRef.current.position.x += airDrift.x * delta * 10;
        meshRef.current.position.z += airDrift.z * delta * 10;
      }

      // Check if landed
      if (meshRef.current.position.y <= GROUND_Y) {
        meshRef.current.position.y = GROUND_Y;
        isJumping.current = false;
        verticalVelocity.current = 0;
        jumpHoldTime.current = 0;
        // Play landing sound
        const soundMgr = getSoundManager();
        soundMgr.playJumpSound(); // Reuse jump sound for landing
      }
    }

    // Notify parent of position changes
    if (onPositionUpdate && meshRef.current) {
      onPositionUpdate(
        meshRef.current.position.toArray() as [number, number, number]
      );
    }

    // Smooth third-person camera follow with rotation
    const idealCameraPosition = new THREE.Vector3(
      meshRef.current.position.x + cameraOffset.current.x,
      meshRef.current.position.y + cameraOffset.current.y,
      meshRef.current.position.z + cameraOffset.current.z
    );

    // Lerp camera position for smooth following
    // If skycam is active, raise the camera and lerp more slowly for a floating feel
    if (skycam.current) {
      const skyTarget = idealCameraPosition.clone();
      skyTarget.y += 12; // raise camera when in skycam
      state.camera.position.lerp(skyTarget, 0.06);
    } else {
      state.camera.position.lerp(idealCameraPosition, 0.1);
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

  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      <SpacemanModel color={isIt ? "#ff4444" : "#4a90e2"} isIt={isIt} />
    </group>
  );
});

PlayerCharacter.displayName = "PlayerCharacter";

const Solo: React.FC = () => {
  const navigate = useNavigate();
  const [socketClient, setSocketClient] = useState<Socket | null>(null);
  const [clients, setClients] = useState<Clients>({});
  const [isConnected, setIsConnected] = useState(false);
  const [currentFPS, setCurrentFPS] = useState(60);
  const [quality, setQuality] = useState<QualityLevel>("auto");
  const [isPaused, setIsPaused] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [keysPressed, setKeysPressed] = useState<{ [key: string]: boolean }>({
    [W]: false,
    [A]: false,
    [S]: false,
    [D]: false,
    [Q]: false,
    [E]: false,
    [SHIFT]: false,
    [SPACE]: false,
  });
  const [mouseControls, setMouseControls] = useState({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    mouseX: 0,
    mouseY: 0,
  });
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    mode: "none",
    isActive: false,
    timeRemaining: 0,
    scores: {},
  });
  const [gamePlayers, setGamePlayers] = useState<Map<string, Player>>(
    new Map()
  );
  const [currentGameManager, setCurrentGameManager] =
    useState<GameManager | null>(null);
  // Generate stable local ID using useState with lazy initializer (React-approved pattern)
  const [localPlayerId] = useState(
    () => `local-${Math.random().toString(36).slice(2, 8)}`
  );
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const [joystickCamera, setJoystickCamera] = useState({ x: 0, y: 0 });
  const [playerPosition, setPlayerPosition] = useState<
    [number, number, number]
  >([0, 0.5, 0]);
  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  const [botIsIt, setBotIsIt] = useState(false);
  const orientation = useOrientation();

  // Detect if device is mobile/touch-enabled
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and small screen
      const hasTouchScreen =
        "ontouchstart" in window ||
        (typeof window !== "undefined" &&
          "navigator" in window &&
          (window.navigator.maxTouchPoints > 0 ||
            // @ts-expect-error - Legacy IE support
            window.navigator.msMaxTouchPoints > 0));
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobileDevice(hasTouchScreen && isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Solo mode: no reconnection refs needed
  const keyDisplayRef = useRef<KeyDisplay | null>(null);
  const lastEmitTime = useRef(0);
  const gameManager = useRef<GameManager | null>(null);
  const soundManager = useRef(getSoundManager());
  const lastWalkSoundTime = useRef(0);
  const isPausedRef = useRef(isPaused);
  const chatVisibleRef = useRef(chatVisible);
  const keysPressedRef = useRef(keysPressed);
  const playerCharacterRef = useRef<PlayerCharacterHandle>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    chatVisibleRef.current = chatVisible;
  }, [chatVisible]);

  useEffect(() => {
    keysPressedRef.current = keysPressed;
  }, [keysPressed]);

  // Quality presets
  const getQualitySettings = (level: QualityLevel) => {
    switch (level) {
      case "low":
        return {
          shadows: false,
          pixelRatio: 1,
          antialias: false,
        };
      case "medium":
        return {
          shadows: true,
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          antialias: true,
        };
      case "high":
        return {
          shadows: true,
          pixelRatio: window.devicePixelRatio,
          antialias: true,
        };
      default: // auto
        return {
          shadows: currentFPS >= 50,
          pixelRatio: currentFPS >= 50 ? window.devicePixelRatio : 1,
          antialias: currentFPS >= 40,
        };
    }
  };

  const qualitySettings = getQualitySettings(quality);

  // Solo mode: no reconnection logic needed
  const connectSocket = useCallback(() => {
    const serverUrl =
      import.meta.env.VITE_SOCKET_SERVER_URL || window.location.origin;
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: false, // Disable auto-reconnection for solo mode
      reconnectionAttempts: 0,
      reconnectionDelay: 0,
      autoConnect: false, // Don't connect automatically
    });

    socket.on("connect", () => {
      debug("Socket connected:", socket.id);
      setIsConnected(true);

      // Initialize game manager
      if (!gameManager.current) {
        const newGameManager = new GameManager();
        newGameManager.setCallbacks({
          onGameStateUpdate: setGameState,
          onPlayerUpdate: setGamePlayers,
        });
        gameManager.current = newGameManager;
        setCurrentGameManager(newGameManager);
      }

      // Add this player to game manager
      if (socket.id) {
        gameManager.current.addPlayer({
          id: socket.id,
          name: `Player ${socket.id.slice(-4)}`,
          position: [0, 0.5, 0],
          rotation: [0, 0, 0],
        });
      }
    });

    socket.on("disconnect", (reason) => {
      debug("Socket disconnected:", reason);
      setIsConnected(false);

      // Remove player from game manager
      if (gameManager.current && socket.id) {
        gameManager.current.removePlayer(socket.id);
      }

      // Solo mode: no reconnection needed
    });

    socket.on("connect_error", (error) => {
      // Solo mode: connection errors are expected, just log to debug
      debug("Socket connection error (expected in solo mode):", error);
    });

    setSocketClient(socket);
    return socket;
  }, []); // No dependencies needed - solo mode doesn't reconnect

  useEffect(() => {
    const socket = connectSocket();
    return () => {
      socket.disconnect();
    };
  }, [connectSocket]);

  // Mobile viewport handling - hide browser bars
  useEffect(() => {
    const hideBrowserUI = () => {
      // Scroll to hide address bar on mobile
      window.scrollTo(0, 1);

      // Update viewport height for mobile browsers
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Hide on load
    hideBrowserUI();

    // Re-hide on orientation change or resize
    window.addEventListener("resize", hideBrowserUI);
    window.addEventListener("orientationchange", hideBrowserUI);

    return () => {
      window.removeEventListener("resize", hideBrowserUI);
      window.removeEventListener("orientationchange", hideBrowserUI);
    };
  }, []);

  // Initialize GameManager immediately for solo mode (even without socket)
  useEffect(() => {
    if (!gameManager.current) {
      debug("Initializing GameManager for solo mode");
      const newGameManager = new GameManager();
      newGameManager.setCallbacks({
        onGameStateUpdate: setGameState,
        onPlayerUpdate: setGamePlayers,
      });
      gameManager.current = newGameManager;
      setCurrentGameManager(newGameManager);

      // Add local player
      newGameManager.addPlayer({
        id: localPlayerId,
        name: "Solo Player",
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
      });

      // Add inert bot for collision testing
      const botId = "bot-1";
      newGameManager.addPlayer({
        id: botId,
        name: "Bot",
        position: [5, 0.5, 5],
        rotation: [0, 0, 0],
      });

      // Add bot to clients for collision detection
      setClients({
        [botId]: {
          position: [5, 0.5, 5],
          rotation: [0, 0, 0],
        },
      });

      setGamePlayers(new Map(newGameManager.getPlayers()));

      // Start background music
      setTimeout(() => {
        soundManager.current.startBackgroundMusic();
      }, 1000);
    }
  }, [localPlayerId]);

  // Cleanup sound on unmount
  useEffect(() => {
    const manager = soundManager.current;
    return () => {
      manager.dispose();
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    keyDisplayRef.current = new KeyDisplay();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Handle ESC key for pause menu
      if (key === "escape") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      // Handle chat toggle
      if (key === "c" && !chatVisibleRef.current && !isPausedRef.current) {
        setChatVisible(true);
        return;
      }

      // Only process movement keys if chat is not visible and game is not paused
      if (
        !chatVisibleRef.current &&
        !isPausedRef.current &&
        [W, A, S, D, Q, E, SHIFT, SPACE].includes(key)
      ) {
        e.preventDefault(); // Prevent default browser behavior
        setKeysPressed((prev) => ({ ...prev, [key]: true }));
        keyDisplayRef.current?.down(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      debug("Key up:", key);

      // Only process movement keys if chat is not visible and game is not paused
      if (
        !chatVisibleRef.current &&
        !isPausedRef.current &&
        [W, A, S, D, Q, E, SHIFT, SPACE].includes(key)
      ) {
        e.preventDefault();
        setKeysPressed((prev) => ({ ...prev, [key]: false }));
        keyDisplayRef.current?.up(key);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent default context menu on right-click and middle-click
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
      }

      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? true : prev.leftClick,
        middleClick: e.button === 1 ? true : prev.middleClick,
        rightClick: e.button === 2 ? true : prev.rightClick,
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      setMouseControls((prev) => ({
        ...prev,
        leftClick: e.button === 0 ? false : prev.leftClick,
        middleClick: e.button === 1 ? false : prev.middleClick,
        rightClick: e.button === 2 ? false : prev.rightClick,
      }));
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMouseControls((prev) => ({
        ...prev,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Disable right-click context menu
    };

    // Fix for stuck keys when focus is lost
    const handleWindowBlur = () => {
      // Reset all key states when window loses focus
      setKeysPressed({
        [W]: false,
        [A]: false,
        [S]: false,
        [D]: false,
        [Q]: false,
        [E]: false,
        [SHIFT]: false,
        [SPACE]: false,
      });
      // Clear visual key display
      if (keyDisplayRef.current) {
        [W, A, S, D, Q, E, SHIFT, SPACE].forEach((key) => {
          keyDisplayRef.current?.up(key);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("blur", handleWindowBlur);
      // Clean up KeyDisplay elements
      if (keyDisplayRef.current) {
        [W, A, S, D, Q, E, SHIFT, SPACE].forEach((key) => {
          const element = keyDisplayRef.current?.map.get(key);
          if (element && element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
      }
    };
  }, []); // No dependencies - handlers use refs for current values

  useEffect(() => {
    if (!socketClient) return;

    socketClient.on("move", (clients: Clients) => {
      setClients(clients);

      // Update game manager with player positions
      if (gameManager.current) {
        Object.entries(clients).forEach(([id, data]) => {
          gameManager.current?.updatePlayer(id, {
            position: data.position,
            rotation: data.rotation,
          });
        });
      }
    });

    socketClient.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.length < MAX_CHAT_MESSAGES) {
          return [...prev, message];
        }
        // Avoid copying large arrays every time: rotate
        const copied = prev.slice();
        copied.shift();
        copied.push(message);
        return copied;
      });
    });

    // Game-related socket events
    socketClient.on(
      "game-start",
      (gameData: { mode: string; duration: number }) => {
        debug("Game started:", gameData);
        if (gameManager.current) {
          gameManager.current.startTagGame(gameData.duration);
        }
      }
    );

    socketClient.on(
      "player-tagged",
      (data: { taggerId: string; taggedId: string }) => {
        debug("Player tagged:", data);
        if (gameManager.current) {
          gameManager.current.tagPlayer(data.taggerId, data.taggedId);
        }
      }
    );

    return () => {
      socketClient.off("move");
      socketClient.off("chat-message");
      socketClient.off("game-start");
      socketClient.off("player-tagged");
    };
  }, [socketClient]);

  const handleSendMessage = useCallback(
    (message: string) => {
      // Apply profanity filter (imported from shared constants)
      const filteredMessage = filterProfanity(message);

      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: socketClient?.id || localPlayerId,
        playerName: socketClient?.id
          ? `Player ${socketClient.id.slice(-4)}`
          : "Solo Player",
        message: filteredMessage,
        timestamp: Date.now(),
      };

      // Add to local messages immediately for responsive UI
      setChatMessages((prev) => [
        ...prev.slice(-(MAX_CHAT_MESSAGES - 1)),
        chatMessage,
      ]);

      // Emit to server if connected (optional for solo mode)
      if (socketClient && isConnected) {
        socketClient.emit("chat-message", chatMessage);
      }
    },
    [socketClient, isConnected, localPlayerId]
  );

  const toggleChat = () => {
    setChatVisible(!chatVisible);
  };

  const handleStartGame = (mode: string) => {
    if (!gameManager.current) return;

    // If we're offline (no socket client), ensure there is a local player in the game manager
    const currentId = socketClient?.id || localPlayerId;
    if (!gameManager.current.getPlayers().has(currentId)) {
      gameManager.current.addPlayer({
        id: currentId,
        name: `Player ${currentId.slice(-4)}`,
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
      });
      // If we're using a local id, also update local gamePlayers map for UI
      setGamePlayers(new Map(gameManager.current.getPlayers()));
    }

    if (mode === "tag") {
      const started = gameManager.current.startTagGame(60); // 1 minute
      if (started) {
        // Only emit to server when connected
        if (socketClient && isConnected) {
          socketClient.emit("game-start", { mode: "tag", duration: 60 });
        }
      }
    }
  };

  const handleEndGame = () => {
    if (!gameManager.current) return;

    gameManager.current.endGame();
    if (socketClient) {
      socketClient.emit("game-end");
    }
  };

  const handlePauseResume = () => {
    setIsPaused(false);
  };

  const handlePauseRestart = () => {
    // Reset game state
    setIsPaused(false);

    // End current game if active
    if (gameManager.current) {
      gameManager.current.endGame();
    }

    // Reset player position via ref
    if (playerCharacterRef.current) {
      playerCharacterRef.current.resetPosition();
    }

    // Clear all key states
    setKeysPressed({
      [W]: false,
      [A]: false,
      [S]: false,
      [D]: false,
      [Q]: false,
      [E]: false,
      [SHIFT]: false,
      [SPACE]: false,
    });

    // Reset mouse controls
    setMouseControls({
      leftClick: false,
      rightClick: false,
      middleClick: false,
      mouseX: 0,
      mouseY: 0,
    });

    // Reset joystick positions
    setJoystickMove({ x: 0, y: 0 });
    setJoystickCamera({ x: 0, y: 0 });
  };

  const handlePauseQuit = () => {
    // Clean up and navigate to home
    setIsPaused(false);
    if (gameManager.current) {
      gameManager.current.endGame();
    }
    navigate("/");
  };

  // Update game timer
  useEffect(() => {
    if (!gameState.isActive || !gameManager.current) return;

    const interval = setInterval(() => {
      gameManager.current!.updateGameTimer(1); // 1 second
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.isActive]);

  // Monitor keysPressed changes for debugging
  useEffect(() => {
    const anyKeyPressed = Object.values(keysPressed).some((pressed) => pressed);
    if (anyKeyPressed) {
      debug("Keys state updated:", keysPressed);
    }
  }, [keysPressed]);

  // Emit position updates (throttled to 50ms)
  useEffect(() => {
    if (!socketClient || !isConnected) return;

    const hasAnyKeyPressed = Object.values(keysPressed).some(
      (pressed) => pressed
    );
    if (!hasAnyKeyPressed) return;

    const now = Date.now();
    if (now - lastEmitTime.current < 50) return;
    lastEmitTime.current = now;

    debug("Emitting movement:", keysPressed);
    // Emit basic movement state for now (will integrate with CharacterControls later)
    socketClient.emit("move", { keysPressed });
  }, [keysPressed, socketClient, isConnected]);

  return (
    <div
      className={
        orientation === "portrait"
          ? "mobile-layout-portrait"
          : "mobile-layout-landscape"
      }
    >
      <PauseMenu
        isVisible={isPaused}
        onResume={handlePauseResume}
        onRestart={handlePauseRestart}
        onQuit={handlePauseQuit}
      />
      <Tutorial />
      <HelpModal />
      <ThemeToggle />
      <PerformanceMonitor onPerformanceChange={setCurrentFPS} />
      <QualitySettings onChange={setQuality} currentFPS={currentFPS} />

      {/* Control buttons - top left */}
      <div
        style={{
          position: "fixed",
          top: "10px",
          left: "10px",
          display: "flex",
          gap: "8px",
          zIndex: 1000,
        }}
      >
        {/* Sound toggle button */}
        <button
          onClick={() => {
            const isMuted = soundManager.current.toggleMute();
            setIsSoundMuted(isMuted);
            console.log(isMuted ? "Sound muted" : "Sound unmuted");
          }}
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
          }}
          title="Toggle sound"
        >
          {isSoundMuted ? "🔇" : "🔊"}
        </button>

        {/* Chat toggle button */}
        <button
          onClick={toggleChat}
          style={{
            padding: "8px 12px",
            backgroundColor: chatVisible
              ? "rgba(74, 144, 226, 0.8)"
              : "rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
          }}
          title="Toggle chat (C key)"
        >
          �
        </button>
      </div>
      <ChatBox
        isVisible={chatVisible}
        onToggle={toggleChat}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentPlayerId={socketClient?.id || localPlayerId}
      />
      <GameUI
        gameState={gameState}
        players={gamePlayers}
        currentPlayerId={socketClient?.id || localPlayerId}
        onStartGame={handleStartGame}
        onEndGame={handleEndGame}
      />

      {/* Connection Status - Always show, centered at top */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "6px 12px",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          color: "rgba(255, 255, 255, 0.5)",
          borderRadius: "4px",
          zIndex: 1000,
          pointerEvents: "none", // Click-through
          fontSize: "12px",
          fontFamily: "monospace",
          opacity: 0.5,
        }}
      >
        Solo — Offline {orientation === "portrait" ? "📱" : "🖥️"}
      </div>
      <Canvas
        camera={{ position: [0, 3, -5], near: 0.1, far: 1000 }}
        shadows={qualitySettings.shadows}
        dpr={qualitySettings.pixelRatio}
        gl={{ antialias: qualitySettings.antialias }}
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          touchAction: "none",
        }}
      >
        <OrbitControls enabled={false} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[-60, 100, -10]}
          intensity={1}
          castShadow={qualitySettings.shadows}
          shadow-mapSize-width={qualitySettings.shadows ? 4096 : 512}
          shadow-mapSize-height={qualitySettings.shadows ? 4096 : 512}
        />
        <gridHelper rotation={[0, 0, 0]} />

        {/* Environment Obstacles */}
        {/* Central pillar - moved to side so it doesn't block spawn */}
        <mesh position={[8, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 4, 4]} />
          <meshStandardMaterial color="#666666" />
        </mesh>

        {/* Corner obstacles */}
        <mesh position={[17.5, 1.5, 17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>

        <mesh position={[-17.5, 1.5, -17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>

        <mesh position={[17.5, 1.5, -17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>

        <mesh position={[-17.5, 1.5, 17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>

        {/* Ground plane for better visibility */}
        {/* Terrain with height variation */}
        <TerrainPlane />

        {/* Visible obstacles matching collision system */}
        {/* Corner obstacles */}
        <mesh position={[17.5, 1.5, 17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>

        <mesh position={[-17.5, 1.5, -17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>

        <mesh position={[17.5, 1.5, -17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>

        <mesh position={[-17.5, 1.5, 17.5]} castShadow receiveShadow>
          <boxGeometry args={[5, 3, 5]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>

        {/* Moon Rocks - scattered on terrain with collision */}
        <mesh position={[5, 0.8, 5]} castShadow receiveShadow>
          <sphereGeometry args={[1.5, 8, 6]} />
          <meshStandardMaterial color="#6B6660" roughness={0.9} />
        </mesh>
        <mesh position={[-8, 0.6, 10]} castShadow receiveShadow>
          <sphereGeometry args={[1.2, 8, 6]} />
          <meshStandardMaterial color="#7B7670" roughness={0.9} />
        </mesh>
        <mesh position={[12, 0.5, -5]} castShadow receiveShadow>
          <sphereGeometry args={[1.0, 8, 6]} />
          <meshStandardMaterial color="#5B5650" roughness={0.9} />
        </mesh>
        <mesh position={[-15, 0.9, -8]} castShadow receiveShadow>
          <sphereGeometry args={[1.6, 8, 6]} />
          <meshStandardMaterial color="#8B8680" roughness={0.9} />
        </mesh>
        <mesh position={[3, 0.7, -12]} castShadow receiveShadow>
          <sphereGeometry args={[1.3, 8, 6]} />
          <meshStandardMaterial color="#7B7670" roughness={0.9} />
        </mesh>
        <mesh position={[-3, 0.4, 15]} castShadow receiveShadow>
          <sphereGeometry args={[0.8, 8, 6]} />
          <meshStandardMaterial color="#6B6660" roughness={0.9} />
        </mesh>

        <PlayerCharacter
          ref={playerCharacterRef}
          keysPressedRef={keysPressedRef}
          socketClient={socketClient}
          mouseControls={mouseControls}
          clients={clients}
          gameManager={currentGameManager}
          currentPlayerId={socketClient?.id || localPlayerId}
          joystickMove={joystickMove}
          joystickCamera={joystickCamera}
          lastWalkSoundTimeRef={lastWalkSoundTime}
          isPaused={isPaused}
          onPositionUpdate={(position) => setPlayerPosition(position)}
          playerIsIt={playerIsIt}
          setPlayerIsIt={setPlayerIsIt}
          setBotIsIt={setBotIsIt}
        />

        {/* AI Bot - chases/flees player */}
        <BotCharacter
          playerPosition={playerPosition}
          isPaused={isPaused}
          isIt={botIsIt}
          playerIsIt={playerIsIt}
          gameState={gameState}
          onTagPlayer={() => {
            // Bot tagged the player - only if game is active and in tag mode
            if (!gameState.isActive || gameState.mode !== "tag") return;

            // Bot tagged the player - swap IT status
            setPlayerIsIt(false);
            setBotIsIt(true);

            // Show tag notification
            const tagText = document.createElement("div");
            tagText.textContent = "🤖 BOT TAGGED YOU! 🤖";
            tagText.style.position = "fixed";
            tagText.style.top = "50%";
            tagText.style.left = "50%";
            tagText.style.transform = "translate(-50%, -50%)";
            tagText.style.fontSize = "72px";
            tagText.style.fontWeight = "bold";
            tagText.style.color = "#ff4444";
            tagText.style.textShadow =
              "0 0 20px rgba(255, 68, 68, 0.8), 0 0 40px rgba(255, 68, 68, 0.5)";
            tagText.style.pointerEvents = "none";
            tagText.style.zIndex = "10000";
            tagText.style.animation =
              "popIn 0.5s ease-out, fadeOut 1s ease-out 0.5s";
            document.body.appendChild(tagText);
            setTimeout(() => tagText.remove(), 1500);
          }}
          onPositionUpdate={(position) => {
            // Update bot in clients for collision detection
            setClients((prev) => ({
              ...prev,
              "bot-1": {
                ...prev["bot-1"],
                position,
              },
            }));
            // Update bot in game manager
            if (gameManager.current) {
              gameManager.current.updatePlayer("bot-1", { position });
            }
          }}
        />

        {Object.keys(clients)
          .filter((clientKey) => socketClient && clientKey !== socketClient.id)
          .map((client) => {
            const { position, rotation } = clients[client];
            const player = gamePlayers.get(client);
            return (
              <UserWrapper
                key={client}
                id={client}
                position={position}
                rotation={rotation}
                isIt={player?.isIt || false}
              />
            );
          })}
      </Canvas>

      {/* Mobile Joysticks - only appear on touch devices */}
      {isMobileDevice && (
        <>
          <MobileJoystick
            side="left"
            label="MOVE"
            onMove={(x, y) => setJoystickMove({ x, y })}
          />
          <MobileJoystick
            side="right"
            label="CAMERA"
            onMove={(x, y) => setJoystickCamera({ x, y })}
          />

          {/* Mobile Jump Button */}
          <MobileButton
            label="JUMP"
            icon="⬆️"
            position="bottom-center"
            onPress={() => {
              setKeysPressed((prev) => ({ ...prev, [SPACE]: true }));
            }}
            onRelease={() => {
              setKeysPressed((prev) => ({ ...prev, [SPACE]: false }));
            }}
          />
        </>
      )}
    </div>
  );
};

export default Solo;
