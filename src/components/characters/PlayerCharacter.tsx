import * as React from "react";
import * as THREE from "three";
import { Socket } from "socket.io-client";
import { useFrame } from "@react-three/fiber";
import type { Clients } from "../../types/socket";
import GameManager, { GameState } from "../GameManager";
import { SHIFT } from "../utils";
import SpacemanModel from "../SpacemanModel";
import { createTagLogger } from "../../lib/utils/logger";
import { TrajectoryArc } from "../world/vfx/TrajectoryArc";
import {
  usePlayerPhysics,
  PHYSICS_CONSTANTS,
} from "../../lib/hooks/usePlayerPhysics";
import { usePlayerCamera } from "../../lib/hooks/usePlayerCamera";
import { usePlayerState } from "../../lib/hooks/usePlayerState";

import {
  PlayerMovement,
  PlayerCamera,
  PlayerWeapon,
  PlayerHealth,
  PlayerRespawner,
  PlayerInput,
  PlayerJetpack,
} from "./player/index";

const tagDebug = createTagLogger("PlayerCharacter");

// How long a fired laser beam stays visible before fading out.
const LASER_BEAM_VISIBLE_MS = 160;

type WindowWithPlayerFreeze = typeof globalThis & {
  __playerFreezeUntil?: number;
};

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
  setBot1GotTagged?: (timestamp: number) => void;
  setBot2GotTagged?: (timestamp: number) => void;
  setGameState?: React.Dispatch<React.SetStateAction<GameState>>;
  showHitboxes?: boolean;
  mobileJetpackTrigger?: React.MutableRefObject<boolean>;
  onTagSuccess?: () => void;
  // Added for IT state management
  playerIsIt?: boolean;
  setPlayerIsIt?: (isIt: boolean) => void;
  setBotIsIt?: (isIt: boolean) => void;
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
    isPlayerFrozenRef,
    playerFreezeEndTimeRef,
    frameCounterRef,
    lastTagCheckRef,
    lastReportedPositionRef,
  } = playerState;

  const physics = usePlayerPhysics();
  const {
    velocityRef,
    directionRef,
    currentSpeedRef,
    jetpackActiveRef,
    isJumpingRef,
    verticalVelocityRef,
    jumpHoldTimeRef,
    jetpackThrustSoundRef,
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

  // Weapon manager ref (from usePlayerState hook, initialized lazily)
  const { weaponManagerRef } = playerState;

  const canActRef = React.useRef(true);

  // Laser beam visual effect refs (passed to PlayerWeapon sub-component)
  const laserBeamRef = React.useRef<THREE.Group>(null as unknown as THREE.Group);
  const laserBeamHideAtRef = React.useRef(0);
  const beamMeshRef = React.useRef<THREE.Mesh>(null as unknown as THREE.Mesh);
  const beamGlowRef = React.useRef<THREE.Mesh>(null as unknown as THREE.Mesh);
  const muzzleFlashRef = React.useRef<THREE.PointLight>(null as unknown as THREE.PointLight);
  const muzzleFlashHideAtRef = React.useRef(0);
  const cameraShakeRef = React.useRef(new THREE.Vector3());

  // Rising-edge detection keys (passed to PlayerWeapon)
  const prevKey1Ref = React.useRef(false);
  const prevKey2Ref = React.useRef(false);
  const prevKey3Ref = React.useRef(false);
  const prevKey4Ref = React.useRef(false);
  const prevKey5Ref = React.useRef(false);
  const prevKeyRRef = React.useRef(false);

  // Look indicator (aim preview)
  const lookIndicatorRef = React.useRef<THREE.Mesh>(null as unknown as THREE.Mesh);

  // Jetpack flame visibility state
  const [showJetpackFlame, setShowJetpackFlame] = React.useState(false);
  const [showDustEffect, setShowDustEffect] = React.useState(false);

  // Stable refs for optional props
  const fallbackMobileJetpackRef = React.useRef(false);
  const mobileJetpackTriggerRef =
    mobileJetpackTrigger ?? fallbackMobileJetpackRef;

  // Equip the laser blaster by default and surface the equipped weapon to the HUD.
  React.useEffect(() => {
    weaponManagerRef.current.equip("laser");
    if (gameManager) {
      gameManager.updatePlayer(currentPlayerId, {
        equippedWeaponId: "laser",
        currentAmmo: null,
      });
    }
  }, [gameManager, currentPlayerId, weaponManagerRef]);

  // Expose reset and freeze functions to parent via ref
  React.useImperativeHandle(ref, () => ({
    resetPosition: () => {
      if (meshRef.current) {
        meshRef.current.position.set(0, 0.0, 0);
      }
      cameraRotationRef.current = { horizontal: 0, vertical: 0.2 };
      velocityRef.current.set(0, 0, 0);
      directionRef.current.set(0, 0, 0);
      currentSpeedRef.current = 0;
      isJumpingRef.current = false;
      verticalVelocityRef.current = 0;
    },
    freezePlayer: (duration: number) => {
      isPlayerFrozenRef.current = true;
      playerFreezeEndTimeRef.current = Date.now() + duration;
      tagDebug(`👤 Player frozen for ${duration}ms via ref`);
    },
  }));

  // player-tagged-by-bot → handled by PlayerInput component
  // weapon-pickup → handled by PlayerInput component
  // health-pickup → handled by PlayerHealth component
  // respawn teleport → handled by PlayerRespawner component

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

    const mePlayer = gameManager?.getPlayers().get(currentPlayerId);

    // Grenade charge logic
    const equipped = weaponManagerRef.current.getEquipped();
    const isGrenade = equipped?.id === "grenade";
    const canAct =
      mePlayer?.respawnAt === undefined && !isPlayerFrozenRef.current;
    canActRef.current = canAct;

    if (isGrenade && canAct) {
      if (mouseControls.rightClick) {
        if (!weaponManagerRef.current.isCharging("grenade")) {
          weaponManagerRef.current.startCharge("grenade", now);
        }
      } else if (weaponManagerRef.current.isCharging("grenade")) {
        weaponManagerRef.current.stopCharge("grenade");
      }
    } else if (weaponManagerRef.current.isCharging("grenade")) {
      // Clear charge if player cannot act or grenade unequipped
      weaponManagerRef.current.stopCharge("grenade");
    }

    // Freeze all input while the player is awaiting respawn (downed in deathmatch/CTF).
    if (mePlayer?.respawnAt !== undefined) {
      return;
    }

    // Freeze visual + window timestamp bots. Movement/Camera/Weapons → sub-components.
    if (isPlayerFrozenRef.current) {
      if (now >= playerFreezeEndTimeRef.current) {
        isPlayerFrozenRef.current = false;
        tagDebug(`👤 Player unfrozen`);
      } else {
        const pulse = 1 + Math.sin(now * 0.01) * 0.1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        if (typeof window !== "undefined") {
          (window as WindowWithPlayerFreeze).__playerFreezeUntil =
            playerFreezeEndTimeRef.current;
        }
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);
    }

    // Camera shake decay (generated by PlayerWeapon sub-component)
    if (cameraShakeRef.current.lengthSq() > 0.00001) {
      cameraShakeRef.current.multiplyScalar(Math.max(0, 1 - delta * 18));
    }
  });

  const currentPlayer = gameManager?.getPlayers().get(currentPlayerId);
  const isIt = currentPlayer?.isIt || false;

  // Calculate current velocity for animation
  const currentVelocity: [number, number, number] = [
    velocityRef.current.x,
    velocityRef.current.y,
    velocityRef.current.z,
  ];
  const currentCameraRotation = cameraRotationRef.current.horizontal;
  const isSprinting = keysPressedRef.current[SHIFT];
  const isJetpackActive = jetpackActiveRef.current;

  // Precompute dust meshes to avoid const declarations in JSX
  let dustMeshes: React.ReactElement[] = [];
  if (showDustEffect) {
    dustMeshes = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 0.3 + (i % 2) * 0.2;
      return (
        <mesh
          key={i}
          position={[Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#999999" opacity={0.6} transparent />
        </mesh>
      );
    });
  }

  // Player spawn at [0, 0.5, 0] - center of map, clear of all rocks
  return (
    <>
      <group ref={meshRef} position={[0, 0.5, 0]}>
        <SpacemanModel
          color={isIt ? "#ff4444" : "#4a90e2"}
          isIt={isIt}
          velocity={currentVelocity}
          cameraRotation={currentCameraRotation}
          isSprinting={isSprinting}
          isJetpackActive={isJetpackActive}
        />
        {/* Jetpack thrust visual effect */}
        {showJetpackFlame && (
          <group position={[0, -0.05, 0]}>
            <mesh rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.15, 0.4, 8]} />
              <meshStandardMaterial
                color="#ff6600"
                opacity={0.7}
                transparent
                emissive="#ff4400"
                emissiveIntensity={1.5}
              />
            </mesh>
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.08, 0.25, 8]} />
              <meshStandardMaterial
                color="#ffff00"
                opacity={0.9}
                transparent
                emissive="#ffff00"
                emissiveIntensity={2}
              />
            </mesh>
          </group>
        )}
        {/* Landing dust effect */}
        {showDustEffect && <group position={[0, 0.05, 0]}>{dustMeshes}</group>}
        {/* Debug hitbox visualization */}
        {props.showHitboxes && (
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial
              color="#00ff00"
              wireframe={true}
              opacity={0.3}
              transparent
            />
          </mesh>
        )}
      </group>
      {/* Weapon beam visual: a short-lived stretched box from the shooter
          toward the hit point (or weapon range on a miss). Color and width
          are updated imperatively in useFrame based on equipped weapon. */}
      <group ref={laserBeamRef} visible={false}>
        {/* Core beam */}
        <mesh ref={beamMeshRef}>
          <boxGeometry args={[0.06, 0.06, 1]} />
          <meshBasicMaterial color="#33ffe6" transparent opacity={0.9} />
        </mesh>
        {/* Outer glow — same color at low opacity, slightly larger */}
        <mesh ref={beamGlowRef}>
          <boxGeometry args={[0.16, 0.16, 1.01]} />
          <meshBasicMaterial color="#33ffe6" transparent opacity={0.2} />
        </mesh>
      </group>

      {weaponManagerRef.current && (
        <TrajectoryArc
          origin={
            meshRef.current?.position.clone().add(new THREE.Vector3(0, 1, 0)) ??
            new THREE.Vector3()
          }
          direction={
            new THREE.Vector3(
              -Math.sin(cameraRotationRef.current.horizontal),
              0,
              -Math.cos(cameraRotationRef.current.horizontal),
            )
          }
          chargeProgress={weaponManagerRef.current.getChargeProgress("grenade")}
          isVisible={weaponManagerRef.current.isCharging("grenade")}
        />
      )}

      {/* Muzzle flash: brief warm point light burst at gun origin on fire. */}
      <pointLight
        ref={muzzleFlashRef}
        args={["#ffeecc", 5, 5]}
        visible={false}
      />

      {/* Modular sub-components — each contains its own useFrame hook */}
      <PlayerMovement
        meshRef={meshRef}
        cameraHorizontal={cameraRotationRef.current.horizontal}
        bothMouseButtons={mouseControls.leftClick && mouseControls.rightClick}
        joystickMove={joystickMove}
        keysPressedRef={keysPressedRef}
        isPlayerFrozenRef={isPlayerFrozenRef}
        playerFreezeEndTimeRef={playerFreezeEndTimeRef}
        mobileJetpackTriggerRef={mobileJetpackTriggerRef}
        onPositionUpdate={onPositionUpdate}
        socketClient={socketClient}
        currentPlayerId={currentPlayerId}
        isPaused={isPaused}
        lastWalkSoundTimeRef={lastWalkSoundTimeRef}
        gameManager={
          gameManager as unknown as {
            getPlayers: () => Map<
              string,
              {
                isIt: boolean;
                position: [number, number, number];
                respawnAt?: number;
              }
            >;
            getGameState: () => { mode: string; isActive: boolean };
          }
        }
        clients={
          clients as unknown as Record<
            string,
            { position: [number, number, number] }
          >
        }
        collisionSystemRef={
          collisionSystemRef as React.RefObject<{
            checkCollision: (
              a: THREE.Vector3,
              b: THREE.Vector3,
            ) => THREE.Vector3;
            checkPlayerCollision: (
              a: THREE.Vector3,
              b: THREE.Vector3,
            ) => boolean;
          }>
        }
        setShowJetpackFlame={setShowJetpackFlame}
        lookIndicatorRef={lookIndicatorRef}
        delta={0.016}
      />
      <PlayerCamera
        meshRef={meshRef}
        cameraRotationRef={cameraRotationRef}
        skycamRef={skycamRef}
        previousMouseRef={previousMouseRef}
        isFirstMouseRef={isFirstMouseRef}
        cameraOffsetRef={cameraOffsetRef}
        idealCameraPositionRef={idealCameraPositionRef}
        skyTargetRef={skyTargetRef}
        mouseControls={mouseControls}
        joystickCamera={joystickCamera}
        keysPressedRef={keysPressedRef}
        isPaused={isPaused}
        size={{ width: window.innerWidth, height: window.innerHeight }}
        isPlayerFrozenRef={isPlayerFrozenRef}
        playerFreezeEndTimeRef={playerFreezeEndTimeRef}
        cameraShakeRef={cameraShakeRef}
      />
      <PlayerWeapon
        meshRef={meshRef}
        cameraHorizontal={cameraRotationRef.current.horizontal}
        mouseControls={mouseControls}
        keysPressedRef={keysPressedRef}
        socketClient={socketClient}
        currentPlayerId={currentPlayerId}
        gameManager={gameManager}
        size={{ width: 0, height: 0 }}
        isPaused={isPaused}
        weaponManagerRef={weaponManagerRef}
        laserBeamRef={laserBeamRef}
        laserBeamHideAtRef={laserBeamHideAtRef}
        beamMeshRef={beamMeshRef}
        beamGlowRef={beamGlowRef}
        muzzleFlashRef={muzzleFlashRef}
        muzzleFlashHideAtRef={muzzleFlashHideAtRef}
        cameraShakeRef={cameraShakeRef}
        prevKey1Ref={prevKey1Ref}
        prevKey2Ref={prevKey2Ref}
        prevKey3Ref={prevKey3Ref}
        prevKey4Ref={prevKey4Ref}
        prevKey5Ref={prevKey5Ref}
        prevKeyRRef={prevKeyRRef}
        canAct={canActRef.current}
        collisionSystemRef={collisionSystemRef}
        isPlayerFrozenRef={isPlayerFrozenRef}
      />
      <PlayerHealth
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        isPaused={isPaused}
      />
      <PlayerRespawner
        meshRef={meshRef}
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        isPaused={isPaused}
        weaponManagerRef={weaponManagerRef}
      />
      <PlayerInput
        gameManager={gameManager}
        currentPlayerId={currentPlayerId}
        socketClient={socketClient}
        keysPressedRef={keysPressedRef}
        mobileJetpackTriggerRef={mobileJetpackTriggerRef}
        isPaused={isPaused}
        weaponManagerRef={weaponManagerRef}
        onPlayerFrozen={(duration: number) => {
          isPlayerFrozenRef.current = true;
          playerFreezeEndTimeRef.current = Date.now() + duration;
        }}
      />
      <PlayerJetpack
        showJetpackFlame={showJetpackFlame}
        setShowJetpackFlame={setShowJetpackFlame}
        jetpackActiveRef={jetpackActiveRef}
        isJumpingRef={isJumpingRef}
        verticalVelocityRef={verticalVelocityRef}
        jumpHoldTimeRef={jumpHoldTimeRef}
        jetpackThrustSoundRef={jetpackThrustSoundRef}
        keysPressedRef={keysPressedRef}
        cameraRotationRef={
          cameraRotationRef as React.RefObject<{
            horizontal: number;
            vertical: number;
          }>
        }
        jetpackConstants={PHYSICS_CONSTANTS}
        isPaused={isPaused}
        socketClient={socketClient}
        currentPlayerId={currentPlayerId}
        gameManager={gameManager}
      />
    </>
  );
});

PlayerCharacter.displayName = "PlayerCharacter";
