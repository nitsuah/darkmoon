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

// Dedicated tag debug logger with timestamps and clear prefixes
const tagDebug = (...args: unknown[]) => {
  if (__isDev) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(`[TAG ${timestamp}]`, ...args);
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
  collisionSystem: React.RefObject<CollisionSystem>;
  gotTaggedTimestamp?: number; // Timestamp when bot got tagged by player
  showHitboxes?: boolean;
}

const BotCharacter: React.FC<BotCharacterProps> = ({
  playerPosition,
  isPaused,
  onPositionUpdate,
  isIt,
  playerIsIt,
  onTagPlayer,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  showHitboxes,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const lastTagTime = useRef(0);
  const isPausedAfterTag = useRef(false);
  const pauseEndTime = useRef(0);
  const lastGotTaggedTimestamp = useRef(0);
  const CHASE_RADIUS = 10; // Start chasing when player is within 10 units
  const BOT_SPEED = 1.5; // Bot moves at 1.5 units/second
  const FLEE_SPEED = 1.8; // Slightly slower than player max speed (2.0)
  const TAG_COOLDOWN = 3000; // 3 second cooldown between tags
  const TAG_DISTANCE = 1.0; // Touch distance accounting for character sizes (~0.5 radius each)
  const PAUSE_AFTER_TAG = 3000; // Pause for 3 seconds after tagging
  const INITIAL_POSITION: [number, number, number] = [-5, 0.5, -5]; // Clear spawn away from rocks

  // Handle being tagged by player
  React.useEffect(() => {
    if (
      gotTaggedTimestamp &&
      gotTaggedTimestamp !== lastGotTaggedTimestamp.current
    ) {
      lastGotTaggedTimestamp.current = gotTaggedTimestamp;
      isPausedAfterTag.current = true;
      pauseEndTime.current = gotTaggedTimestamp + PAUSE_AFTER_TAG;
      tagDebug(`🤖 Bot got tagged! Freezing for ${PAUSE_AFTER_TAG}ms`);
    }
  }, [gotTaggedTimestamp]);

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

        // Calculate new position
        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * BOT_SPEED * delta,
          botPos.y,
          botPos.z + direction.z * BOT_SPEED * delta
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        // Rotate bot to face player
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      } else if (now - lastTagTime.current > TAG_COOLDOWN) {
        // Tag the player!
        tagDebug(
          `🤖 BOT TAGGING PLAYER! Distance: ${distance.toFixed(
            2
          )}, Cooldown elapsed: ${now - lastTagTime.current}ms`
        );
        tagDebug(`  State before: Bot isIT=${isIt}, Player isIT=${playerIsIt}`);
        lastTagTime.current = now;
        isPausedAfterTag.current = true;
        pauseEndTime.current = now + PAUSE_AFTER_TAG;
        tagDebug(`  Bot will freeze for ${PAUSE_AFTER_TAG}ms`);
        onTagPlayer();
        tagDebug(
          `  State after callback: Bot should become NOT IT, Player should become IT`
        );
      } else {
        // Too soon to tag again
        const cooldownRemaining = TAG_COOLDOWN - (now - lastTagTime.current);
        if (cooldownRemaining > 0 && cooldownRemaining < 100) {
          tagDebug(
            `🤖 Bot within range but cooldown active: ${cooldownRemaining}ms remaining`
          );
        }
      }
    } else if (playerIsIt && gameState.isActive && gameState.mode === "tag") {
      // Player is IT - only flee when player is within detection radius
      if (distance < CHASE_RADIUS) {
        // Flee away from player
        const direction = new THREE.Vector3()
          .subVectors(botPos, playerPos) // Reversed direction to flee
          .normalize();

        // Calculate new position
        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * FLEE_SPEED * delta,
          botPos.y,
          botPos.z + direction.z * FLEE_SPEED * delta
        );

        // Check collision with environment
        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        // Rotate bot to face away from player
        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;
      }
    } else if (!gameState.isActive || gameState.mode !== "tag") {
      // Game not active - bot should be idle
      // No movement when game is not active
    }

    // Notify parent of position change
    onPositionUpdate([botPos.x, botPos.y, botPos.z]);
  });

  return (
    <group ref={meshRef} position={INITIAL_POSITION}>
      <SpacemanModel color="#ff4444" isIt={isIt} />
      {/* Bot1 label - red sphere above head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ff4444" />
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

// Second bot for debug mode - targets other bot instead of player
interface BotCharacter2Props {
  bot1Position: [number, number, number];
  isPaused: boolean;
  onPositionUpdate: (position: [number, number, number]) => void;
  isIt: boolean;
  bot1IsIt: boolean;
  onTagBot: () => void;
  gameState: GameState;
  collisionSystem: React.RefObject<CollisionSystem>;
  gotTaggedTimestamp?: number; // Timestamp when bot2 got tagged
  showHitboxes?: boolean;
}

const BotCharacter2: React.FC<BotCharacter2Props> = ({
  bot1Position,
  isPaused,
  onPositionUpdate,
  isIt,
  bot1IsIt,
  onTagBot,
  gameState,
  collisionSystem,
  gotTaggedTimestamp,
  showHitboxes,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const lastTagTime = useRef(0);
  const isPausedAfterTag = useRef(false);
  const pauseEndTime = useRef(0);
  const lastGotTaggedTimestamp = useRef(0);
  const CHASE_RADIUS = 10;
  const BOT_SPEED = 1.6; // Slightly faster than Bot1
  const FLEE_SPEED = 1.9;
  const TAG_COOLDOWN = 1000; // 1 second for faster bot debug testing
  const TAG_DISTANCE = 1.0;
  const PAUSE_AFTER_TAG = 1000; // 1 second pause for faster games
  const INITIAL_POSITION: [number, number, number] = [8, 0.5, -8]; // Clear spawn away from rocks

  // Handle being tagged by Bot1
  React.useEffect(() => {
    if (
      gotTaggedTimestamp &&
      gotTaggedTimestamp !== lastGotTaggedTimestamp.current
    ) {
      lastGotTaggedTimestamp.current = gotTaggedTimestamp;
      isPausedAfterTag.current = true;
      pauseEndTime.current = gotTaggedTimestamp + PAUSE_AFTER_TAG;
      tagDebug(`🤖2 Bot2 got tagged! Freezing for ${PAUSE_AFTER_TAG}ms`);
    }
  }, [gotTaggedTimestamp]);

  useFrame((state, delta) => {
    if (!meshRef.current || isPaused) return;

    const now = Date.now();

    // Check if bot is paused after tagging
    if (isPausedAfterTag.current) {
      if (now >= pauseEndTime.current) {
        isPausedAfterTag.current = false;
        tagDebug(`🤖2 Bot2 unfrozen - resuming movement`);
      } else {
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        return;
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }

    const botPos = meshRef.current.position;
    const bot1Pos = new THREE.Vector3(...bot1Position);
    const distance = botPos.distanceTo(bot1Pos);

    // Behavior depends on who is IT (only during active tag games)
    if (isIt && gameState.isActive && gameState.mode === "tag") {
      // Bot2 is IT - chase Bot1
      if (distance > TAG_DISTANCE) {
        const direction = new THREE.Vector3()
          .subVectors(bot1Pos, botPos)
          .normalize();

        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * BOT_SPEED * delta,
          botPos.y,
          botPos.z + direction.z * BOT_SPEED * delta
        );

        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;

        // Log chase behavior periodically
        if (Math.random() < 0.01) {
          tagDebug(`🤖2 Bot2 chasing Bot1 - distance: ${distance.toFixed(2)}`);
        }
      } else if (now - lastTagTime.current > TAG_COOLDOWN) {
        // Tag Bot1!
        tagDebug(
          `🤖2 BOT2 TAGGING BOT1! Distance: ${distance.toFixed(2)}, Cooldown: ${
            now - lastTagTime.current
          }ms`
        );
        tagDebug(`  State before: Bot2 isIT=${isIt}, Bot1 isIT=${bot1IsIt}`);
        lastTagTime.current = now;
        isPausedAfterTag.current = true;
        pauseEndTime.current = now + PAUSE_AFTER_TAG;
        tagDebug(`  Bot2 will freeze for ${PAUSE_AFTER_TAG}ms`);
        onTagBot();
        tagDebug(
          `  State after: Bot2 should become NOT IT, Bot1 should become IT`
        );
      }
    } else if (bot1IsIt && gameState.isActive && gameState.mode === "tag") {
      // Bot1 is IT - flee
      if (distance < CHASE_RADIUS) {
        const direction = new THREE.Vector3()
          .subVectors(botPos, bot1Pos)
          .normalize();

        const currentPos = new THREE.Vector3(botPos.x, botPos.y, botPos.z);
        const newPos = new THREE.Vector3(
          botPos.x + direction.x * FLEE_SPEED * delta,
          botPos.y,
          botPos.z + direction.z * FLEE_SPEED * delta
        );

        if (collisionSystem.current) {
          const resolved = collisionSystem.current.checkCollision(
            currentPos,
            newPos
          );
          botPos.x = resolved.x;
          botPos.z = resolved.z;
        } else {
          botPos.x = newPos.x;
          botPos.z = newPos.z;
        }

        const angle = Math.atan2(direction.x, direction.z);
        meshRef.current.rotation.y = angle;

        // Log flee behavior periodically
        if (Math.random() < 0.01) {
          tagDebug(
            `🤖2 Bot2 fleeing from Bot1 - distance: ${distance.toFixed(2)}`
          );
        }
      }
    }

    onPositionUpdate([botPos.x, botPos.y, botPos.z]);
  });

  return (
    <group ref={meshRef} position={INITIAL_POSITION}>
      <SpacemanModel color="#4444ff" isIt={isIt} />
      {/* Bot2 label - blue sphere above head to distinguish from Bot1 */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#4444ff" />
      </mesh>
      {/* Debug hitbox visualization */}
      {showHitboxes && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#00ffff"
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
  setBot1GotTagged?: (timestamp: number) => void;
  setGameState?: React.Dispatch<React.SetStateAction<GameState>>;
  showHitboxes?: boolean;
  mobileJetpackTrigger?: React.MutableRefObject<boolean>;
}

export interface PlayerCharacterHandle {
  resetPosition: () => void;
  freezePlayer: (duration: number) => void;
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
    setBot1GotTagged,
    setGameState,
    mobileJetpackTrigger,
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

  // Player freeze state when tagged
  const isPlayerFrozen = useRef(false);
  const playerFreezeEndTime = useRef(0);
  const PLAYER_FREEZE_DURATION = 3000; // 3 seconds

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
                clientId === "bot-1" &&
                gameState.mode === "tag" &&
                gameState.isActive &&
                playerIsIt &&
                distance < 1.0 &&
                now - lastTagCheck.current > 3000
              ) {
                // Player tagged the bot!
                tagDebug(
                  `👤 PLAYER TAGGING BOT! Distance: ${distance.toFixed(
                    2
                  )}, Cooldown elapsed: ${now - lastTagCheck.current}ms`
                );
                tagDebug(
                  `  State before: Player isIT=${playerIsIt}, Bot isIT=false`
                );

                if (setPlayerIsIt) setPlayerIsIt(false);
                if (setBotIsIt) setBotIsIt(true);
                lastTagCheck.current = now;

                // Update gameState with new IT player
                if (setGameState) {
                  setGameState((prev) => ({
                    ...prev,
                    itPlayerId: "bot-1",
                  }));
                }

                // Trigger bot freeze by setting timestamp
                if (setBot1GotTagged) setBot1GotTagged(now);

                // Play success tag sound (player tagged bot)
                try {
                  const soundMgr = getSoundManager();
                  if (soundMgr) {
                    soundMgr.playTagSound();
                  }
                } catch (error) {
                  console.warn("Sound manager not ready for tag sound:", error);
                }

                // Freeze player for 3 seconds
                isPlayerFrozen.current = true;
                playerFreezeEndTime.current = now + PLAYER_FREEZE_DURATION;
                tagDebug(
                  `  Player will freeze for ${PLAYER_FREEZE_DURATION}ms`
                );
                tagDebug(
                  `  Bot will freeze for 3000ms (via gotTaggedTimestamp)`
                );
                tagDebug(
                  `  State after: Player should become NOT IT, Bot should become IT`
                );

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

        // TODO: Add dust particle effect on landing
      }
    }

    // Notify parent of position changes
    if (onPositionUpdate && meshRef.current) {
      onPositionUpdate(
        meshRef.current.position.toArray() as [number, number, number]
      );
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

  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      <SpacemanModel color={isIt ? "#ff4444" : "#4a90e2"} isIt={isIt} />
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
  const [bot1Position, setBot1Position] = useState<[number, number, number]>([
    -5, 0.5, -5,
  ]);
  const [bot2Position, setBot2Position] = useState<[number, number, number]>([
    5, 0.5, 5,
  ]);
  const [playerIsIt, setPlayerIsIt] = useState(true); // Player starts as IT
  const [botIsIt, setBotIsIt] = useState(false);
  const [bot2IsIt, setBot2IsIt] = useState(false);

  // Timestamps for when bots get tagged (to trigger freeze)
  const [bot1GotTagged, setBot1GotTagged] = useState(0);
  const [bot2GotTagged, setBot2GotTagged] = useState(0);

  // Bot debug mode - enables 2 bots playing each other with faster games
  // Can be enabled via: window.enableBotDebug() or UI button
  const [botDebugMode, setBotDebugMode] = useState(false); // Default false - user must enable
  const [showHitboxes, setShowHitboxes] = useState(false);

  // Mobile jetpack trigger (set to true when double-tap detected)
  const mobileJetpackTrigger = useRef(false);

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
  const collisionSystemRef = useRef(new CollisionSystem());
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

  // Expose bot debug mode toggle to window (dev console)
  useEffect(() => {
    if (__isDev) {
      // @ts-expect-error - Development debugging utility
      window.enableBotDebug = () => {
        setBotDebugMode(true);
        console.log(
          "🤖 Bot vs Bot Debug Mode ENABLED - 2 bots will play tag with faster games"
        );
      };
      // @ts-expect-error - Development debugging utility
      window.disableBotDebug = () => {
        setBotDebugMode(false);
        console.log("🤖 Bot vs Bot Debug Mode DISABLED");
      };

      console.log(
        "💡 Bot Debug Mode: Type window.enableBotDebug() to enable 2 bots playing tag"
      );
    }

    return () => {
      if (__isDev) {
        // @ts-expect-error - Cleanup
        delete window.enableBotDebug;
        // @ts-expect-error - Cleanup
        delete window.disableBotDebug;
      }
    };
  }, []);

  // Define handleStartGame early so it can be used in effects
  const handleStartGame = React.useCallback(
    (mode: string) => {
      if (!gameManager.current) return;

      // Enable bot debug mode if "debug" mode selected
      if (mode === "debug") {
        setBotDebugMode(true);
        setShowHitboxes(true);
        tagDebug("🔧 Debug Tag Mode enabled via UI button");
        // Auto-start will happen via useEffect
        return;
      }

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
        // Both debug and normal mode use 60 second duration
        const duration = 60; // 1 minute for all tag games
        const started = gameManager.current.startTagGame(duration);
        if (started) {
          if (botDebugMode) {
            tagDebug(`🤖 Bot Debug Mode: Starting ${duration}s tag game`);
          }
          // Only emit to server when connected
          if (socketClient && isConnected) {
            socketClient.emit("game-start", { mode: "tag", duration });
          }
        }
      }
    },
    [socketClient, isConnected, localPlayerId, botDebugMode]
  );

  // Bot debug mode setup - no auto-start, user must click button
  useEffect(() => {
    if (botDebugMode && gameManager.current) {
      tagDebug("🤖 Bot Debug Mode: Enabled - ready to start game manually");
      // Bot2 starts as IT when game starts
      setBotIsIt(false);
      setBot2IsIt(true);

      // Update gameState with initial IT player
      setGameState((prev) => ({
        ...prev,
        itPlayerId: "bot-2",
      }));
    }
  }, [botDebugMode]);

  // Mobile viewport handling - hide browser bars
  useEffect(() => {
    const hideBrowserUI = () => {
      // Scroll to hide address bar on mobile
      window.scrollTo(0, 1);

      // Update viewport height for mobile browsers
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      // Also set --app-height directly for additional compatibility
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };

    // Hide on load with slight delay to ensure layout is ready
    setTimeout(hideBrowserUI, 100);

    // Re-hide on orientation change or resize with debounce
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedHide = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(hideBrowserUI, 150);
    };

    window.addEventListener("resize", debouncedHide);
    window.addEventListener("orientationchange", hideBrowserUI);

    return () => {
      window.removeEventListener("resize", debouncedHide);
      window.removeEventListener("orientationchange", hideBrowserUI);
      clearTimeout(resizeTimeout);
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

    // Two-finger touch handling for mobile (simulates right-click)
    let lastTouchX = 0;
    let lastTouchY = 0;

    const handleTouchStart = (e: globalThis.TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers - simulate right-click for camera rotation
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchX = (touch1.clientX + touch2.clientX) / 2;
        lastTouchY = (touch1.clientY + touch2.clientY) / 2;

        setMouseControls((prev) => ({
          ...prev,
          rightClick: true,
          mouseX: lastTouchX,
          mouseY: lastTouchY,
        }));

        tagDebug(
          `📱 Two-finger touch detected at (${lastTouchX.toFixed(
            0
          )}, ${lastTouchY.toFixed(0)})`
        );
      }
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers - update camera rotation
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const touchX = (touch1.clientX + touch2.clientX) / 2;
        const touchY = (touch1.clientY + touch2.clientY) / 2;

        setMouseControls((prev) => ({
          ...prev,
          rightClick: true,
          mouseX: touchX,
          mouseY: touchY,
        }));

        lastTouchX = touchX;
        lastTouchY = touchY;
      }
    };

    const handleTouchEnd = (e: globalThis.TouchEvent) => {
      if (e.touches.length < 2) {
        // Less than two fingers - end right-click simulation
        setMouseControls((prev) => ({
          ...prev,
          rightClick: false,
        }));
      }
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

    // Touch event listeners for two-finger camera control
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
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

  const handleEndGame = () => {
    if (!gameManager.current) return;

    const results = gameManager.current.endGame();

    // Announce game end with results
    if (results && results.length > 0) {
      console.log("🏁 Game Over! Final Results:");
      results.forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}: ${player.score} points`);
      });

      // In bot debug mode, auto-restart after 1 second
      if (botDebugMode) {
        tagDebug("🤖 Bot Debug Mode: Auto-restarting game in 1 second...");
        setTimeout(() => {
          // Reset IT states - randomize who starts as IT
          const bot1StartsIT = Math.random() > 0.5;
          setBotIsIt(bot1StartsIT);
          setBot2IsIt(!bot1StartsIT);

          // Update gameState with initial IT player
          setGameState((prev) => ({
            ...prev,
            itPlayerId: bot1StartsIT ? "bot-1" : "bot-2",
          }));

          tagDebug(
            `🤖 Bot Debug Mode: ${bot1StartsIT ? "Bot1" : "Bot2"} starts as IT`
          );

          // Restart game
          handleStartGame("tag");
        }, 1000);
        return; // Skip normal end game logic
      }

      // Determine winner and loser in solo mode
      if (results.length === 2) {
        const winner = results[0]; // Highest score
        const loser = results[1]; // Lowest score

        // Add chat message
        const endMessage: ChatMessage = {
          id: Date.now().toString(),
          playerId: "system",
          playerName: "System",
          message: `🏁 Game Over! Winner: ${winner.name} (${winner.score} points) | Loser: ${loser.name} (${loser.score} points)`,
          timestamp: Date.now(),
        };

        setChatMessages((prev) => [
          ...prev.slice(-(MAX_CHAT_MESSAGES - 1)),
          endMessage,
        ]);

        console.log(`🏆 Winner: ${winner.name} with ${winner.score} points`);
        console.log(`😢 Loser: ${loser.name} with ${loser.score} points`);
      }

      // Show visual notification
      const gameOverText = document.createElement("div");
      gameOverText.textContent = "🏁 GAME OVER! 🏁";
      gameOverText.style.position = "fixed";
      gameOverText.style.top = "50%";
      gameOverText.style.left = "50%";
      gameOverText.style.transform = "translate(-50%, -50%)";
      gameOverText.style.fontSize = "72px";
      gameOverText.style.fontWeight = "bold";
      gameOverText.style.color = "#FFD700";
      gameOverText.style.textShadow =
        "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)";
      gameOverText.style.pointerEvents = "none";
      gameOverText.style.zIndex = "10000";
      gameOverText.style.animation =
        "popIn 0.5s ease-out, fadeOut 2s ease-out 1s";
      document.body.appendChild(gameOverText);
      setTimeout(() => gameOverText.remove(), 3000);
    }

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
        botDebugMode={botDebugMode}
        onToggleDebug={() => setBotDebugMode(!botDebugMode)}
      />

      {/* Debug Overlay - Show bot states, distances, and collision info */}
      {botDebugMode && (
        <div
          style={{
            position: "fixed",
            top: "200px", // Below GameUI panel
            right: "10px", // Right side to match GameUI
            padding: "12px",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            color: "#0f0",
            borderRadius: "6px",
            zIndex: 1000,
            fontFamily: "monospace",
            fontSize: "11px",
            lineHeight: "1.5",
            minWidth: "180px",
            border: "1px solid rgba(255, 140, 0, 0.5)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#ff8c00",
            }}
          >
            🔧 DEBUG TAG MODE
          </div>
          <div>Game: {gameState.isActive ? "Active" : "Waiting"}</div>
          <div>Time: {gameState.timeRemaining}s</div>
          <div style={{ marginTop: "8px", color: "#ffff00" }}>
            Bot1: {botIsIt ? "IT 🔴" : "Safe 🟢"}
          </div>
          <div style={{ color: "#00ffff" }}>
            Bot2: {bot2IsIt ? "IT 🔴" : "Safe 🟢"}
          </div>
          <div style={{ marginTop: "8px", color: "#aaa" }}>
            Distance:{" "}
            {Math.sqrt(
              Math.pow(bot1Position[0] - bot2Position[0], 2) +
                Math.pow(bot1Position[2] - bot2Position[2], 2)
            ).toFixed(2)}
            m
          </div>
          <div style={{ marginTop: "8px", fontSize: "9px", color: "#888" }}>
            Hitboxes: {showHitboxes ? "Visible" : "Hidden"}
          </div>
          <button
            onClick={() => setShowHitboxes(!showHitboxes)}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              backgroundColor: showHitboxes
                ? "rgba(255, 140, 0, 0.6)"
                : "rgba(100, 100, 100, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "3px",
              color: "white",
              cursor: "pointer",
              fontSize: "10px",
              width: "100%",
            }}
          >
            {showHitboxes ? "Hide" : "Show"} Hitboxes
          </button>
        </div>
      )}

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
          setBot1GotTagged={setBot1GotTagged}
          setGameState={setGameState}
          showHitboxes={showHitboxes}
          mobileJetpackTrigger={mobileJetpackTrigger}
        />

        {/* AI Bot 1 - chases/flees player (or Bot2 in debug mode) */}
        <BotCharacter
          playerPosition={botDebugMode ? bot2Position : playerPosition}
          isPaused={isPaused}
          isIt={botIsIt}
          playerIsIt={botDebugMode ? bot2IsIt : playerIsIt}
          gameState={gameState}
          collisionSystem={collisionSystemRef}
          gotTaggedTimestamp={bot1GotTagged}
          showHitboxes={showHitboxes}
          onTagPlayer={() => {
            // Bot tagged the target (player or Bot2) - only if game is active and in tag mode
            if (!gameState.isActive || gameState.mode !== "tag") {
              tagDebug(`🤖 Bot1 tag attempt outside active game - BLOCKED`);
              return;
            }

            if (botDebugMode) {
              tagDebug(`🤖1 Bot1 successfully tagged Bot2!`);
              setBotIsIt(false);
              setBot2IsIt(true);
              setBot2GotTagged(Date.now()); // Freeze Bot2

              // Update gameState with new IT player
              setGameState((prev) => ({
                ...prev,
                itPlayerId: "bot-2",
              }));
            } else {
              tagDebug(`🤖 Bot1 successfully tagged player!`);
              setPlayerIsIt(true);
              setBotIsIt(false);

              // Update gameState with new IT player
              setGameState((prev) => ({
                ...prev,
                itPlayerId: localPlayerId,
              }));

              // Play "got tagged" sound (player got tagged by bot)
              try {
                const soundMgr = getSoundManager();
                if (soundMgr) {
                  soundMgr.playTaggedSound();
                }
              } catch (error) {
                console.warn(
                  "Sound manager not ready for tagged sound:",
                  error
                );
              }

              // Freeze player for 3 seconds
              if (playerCharacterRef.current) {
                playerCharacterRef.current.freezePlayer(3000);
              }

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
            }
          }}
          onPositionUpdate={(position) => {
            setBot1Position(position);
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

        {/* AI Bot 2 - only in debug mode */}
        {botDebugMode && (
          <BotCharacter2
            bot1Position={bot1Position}
            isPaused={isPaused}
            isIt={bot2IsIt}
            bot1IsIt={botIsIt}
            gameState={gameState}
            collisionSystem={collisionSystemRef}
            gotTaggedTimestamp={bot2GotTagged}
            showHitboxes={showHitboxes}
            onTagBot={() => {
              if (!gameState.isActive || gameState.mode !== "tag") {
                tagDebug(`🤖2 Bot2 tag attempt outside active game - BLOCKED`);
                return;
              }

              tagDebug(`🤖2 Bot2 successfully tagged Bot1!`);
              setBot2IsIt(false);
              setBotIsIt(true);
              setBot1GotTagged(Date.now()); // Freeze Bot1

              // Update gameState with new IT player
              setGameState((prev) => ({
                ...prev,
                itPlayerId: "bot-1",
              }));
            }}
            onPositionUpdate={(position) => {
              setBot2Position(position);
              setClients((prev) => ({
                ...prev,
                "bot-2": {
                  ...prev["bot-2"],
                  position,
                },
              }));
              if (gameManager.current) {
                gameManager.current.updatePlayer("bot-2", { position });
              }
            }}
          />
        )}

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
            onDoubleTap={() => {
              // Trigger mobile jetpack on double-tap
              mobileJetpackTrigger.current = true;
            }}
          />
        </>
      )}
    </div>
  );
};

export default Solo;
