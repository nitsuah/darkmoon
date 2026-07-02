import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameManager } from "../../../components/GameManager";
import type { WeaponManager } from "../../../components/combat/WeaponManager";
import { KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_R } from "../../utils";
import { processFiring } from "../../../lib/hooks/usePlayerWeapon";

interface PlayerWeaponProps {
  /** Player mesh ref */
  meshRef: React.RefObject<THREE.Group>;
  /** Camera horizontal rotation (yaw) */
  cameraHorizontal: number;
  /** Mouse controls state */
  mouseControls: {
    leftClick: boolean;
    rightClick: boolean;
    middleClick: boolean;
    mouseX: number;
    mouseY: number;
  };
  /** Key press state */
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  /** Socket client for network updates */
  socketClient: {
    emit: (event: string, data: unknown) => void;
    id?: string;
  } | null;
  /** Current player ID */
  currentPlayerId: string;
  /** Game manager for player state */
  gameManager: GameManager | null;
  /** Viewport size */
  size: { width: number; height: number };
  /** Whether game is paused */
  isPaused: boolean;
  /** Weapon manager ref */
  weaponManagerRef: React.RefObject<WeaponManager>;
  /** Laser beam ref for visual effect */
  laserBeamRef: React.RefObject<THREE.Group>;
  /** Laser beam hide timestamp ref */
  laserBeamHideAtRef: React.RefObject<number>;
  /** Beam mesh ref */
  beamMeshRef: React.RefObject<THREE.Mesh>;
  /** Beam glow ref */
  beamGlowRef: React.RefObject<THREE.Mesh>;
  /** Muzzle flash ref */
  muzzleFlashRef: React.RefObject<THREE.PointLight | null>;
  /** Muzzle flash hide timestamp ref */
  muzzleFlashHideAtRef: React.RefObject<number>;
  /** Camera shake ref */
  cameraShakeRef: React.RefObject<THREE.Vector3>;
  /** Previous key state refs */
  prevKey1Ref: React.RefObject<boolean>;
  prevKey2Ref: React.RefObject<boolean>;
  prevKey3Ref: React.RefObject<boolean>;
  prevKey4Ref: React.RefObject<boolean>;
  prevKey5Ref: React.RefObject<boolean>;
  prevKeyRRef: React.RefObject<boolean>;
  /** Whether player can act (not respawning, not frozen) */
  canAct: boolean;
  /** Collision system ref for hit detection */
  collisionSystemRef: React.RefObject<{
    checkProjectileHit: (
      origin: THREE.Vector3,
      direction: THREE.Vector3,
      range: number,
    ) => { hit: boolean; point: THREE.Vector3; distance: number } | null;
  }>;
  /** Player frozen ref */
  isPlayerFrozenRef: React.RefObject<boolean>;
}

const LASER_BEAM_VISIBLE_MS = 160;

export const PlayerWeapon = React.memo(
  ({
    meshRef,
    cameraHorizontal,
    mouseControls,
    keysPressedRef,
    socketClient,
    currentPlayerId,
    gameManager,
    isPaused,
    weaponManagerRef,
    laserBeamRef,
    laserBeamHideAtRef,
    beamMeshRef,
    beamGlowRef,
    muzzleFlashRef,
    muzzleFlashHideAtRef,
    cameraShakeRef,
    prevKey1Ref,
    prevKey2Ref,
    prevKey3Ref,
    prevKey4Ref,
    prevKey5Ref,
    prevKeyRRef,
    canAct,
    collisionSystemRef,
    isPlayerFrozenRef,
  }: PlayerWeaponProps) => {
    const myId = socketClient?.id || currentPlayerId;

    useFrame((state) => {
      const now = Date.now();

      if (isPaused || !meshRef.current || !gameManager) return;

      // Recompute canAct from live refs in case React.memo skipped prop update
      const mePlayer = gameManager.getPlayers().get(myId);
      const canActNow =
        canAct &&
        mePlayer?.respawnAt === undefined &&
        !isPlayerFrozenRef.current;

      // Weapon switching: rising-edge detection
      const key1 = keysPressedRef.current[KEY_1] ?? false;
      const key2 = keysPressedRef.current[KEY_2] ?? false;
      const key3 = keysPressedRef.current[KEY_3] ?? false;
      const key4 = keysPressedRef.current[KEY_4] ?? false;
      const key5 = keysPressedRef.current[KEY_5] ?? false;
      const keyR = keysPressedRef.current[KEY_R] ?? false;

      if (key1 && !prevKey1Ref.current) {
        weaponManagerRef.current.equip("laser");
        gameManager?.updatePlayer(myId, {
          equippedWeaponId: "laser",
          currentAmmo: weaponManagerRef.current.getAmmo("laser"),
        });
      }
      if (key2 && !prevKey2Ref.current) {
        weaponManagerRef.current.equip("shotgun");
        gameManager?.updatePlayer(myId, {
          equippedWeaponId: "shotgun",
          currentAmmo: weaponManagerRef.current.getAmmo("shotgun"),
        });
      }
      if (key3 && !prevKey3Ref.current) {
        weaponManagerRef.current.equip("rocket");
        gameManager?.updatePlayer(myId, {
          equippedWeaponId: "rocket",
          currentAmmo: weaponManagerRef.current.getAmmo("rocket"),
        });
      }
      if (key4 && !prevKey4Ref.current) {
        weaponManagerRef.current.equip("grenade");
        gameManager?.updatePlayer(myId, {
          equippedWeaponId: "grenade",
          currentAmmo: weaponManagerRef.current.getAmmo("grenade"),
        });
      }
      if (key5 && !prevKey5Ref.current) {
        weaponManagerRef.current.equip("smg");
        gameManager?.updatePlayer(myId, {
          equippedWeaponId: "smg",
          currentAmmo: weaponManagerRef.current.getAmmo("smg"),
        });
      }
      // R key: reload
      if (keyR && !prevKeyRRef.current) {
        const equipped = weaponManagerRef.current.getEquipped();
        if (equipped) {
          weaponManagerRef.current.startReload(equipped.id);
        }
      }
      prevKey1Ref.current = key1;
      prevKey2Ref.current = key2;
      prevKey3Ref.current = key3;
      prevKey4Ref.current = key4;
      prevKey5Ref.current = key5;
      prevKeyRRef.current = keyR;

      // Fire the equipped weapon while left-click is held
      if (mouseControls.leftClick && canActNow) {
        const fireOrigin = meshRef.current.position
          .clone()
          .add(new THREE.Vector3(0, 1, 0));

        // Use R3F state size to avoid division-by-zero from hardcoded size prop
        const w = state.size.width || 1;
        const h = state.size.height || 1;
        const ndcX = (mouseControls.mouseX / w) * 2 - 1;
        const ndcY = -(mouseControls.mouseY / h) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const aimTarget = new THREE.Vector3();
        const hasAimTarget =
          raycaster.ray.intersectPlane(groundPlane, aimTarget) !== null;
        const fireDirection = hasAimTarget
          ? aimTarget.clone().sub(fireOrigin).normalize()
          : new THREE.Vector3(
              -Math.sin(cameraHorizontal),
              0,
              -Math.cos(cameraHorizontal),
            );

        const fireResult = processFiring({
          origin: fireOrigin,
          direction: fireDirection,
          shooterId: myId,
          gameManager,
          weaponManager: weaponManagerRef.current,
          collisionSystem: collisionSystemRef.current,
          now,
        });

        if (fireResult && typeof window !== "undefined") {
          window.dispatchEvent(
            new window.CustomEvent("weapon-fired", {
              detail: { weaponId: fireResult.weapon.id },
            }),
          );
        }

        if (fireResult && laserBeamRef.current) {
          const beamLength =
            fireResult.hit?.distance ?? fireResult.weapon.range;
          const wid = fireResult.weapon.id;
          const beamHalfWidth =
            wid === "rocket" || wid === "grenade"
              ? 0.2
              : wid === "shotgun"
                ? 0.1
                : wid === "smg"
                  ? 0.04
                  : 0.04;
          const beamColor =
            wid === "rocket"
              ? "#ff1100"
              : wid === "grenade"
                ? "#44ff00"
                : wid === "shotgun"
                  ? "#ff7700"
                  : wid === "smg"
                    ? "#ff44cc"
                    : "#33ffe6";
          laserBeamRef.current.visible = true;
          laserBeamRef.current.position
            .copy(fireOrigin)
            .add(fireDirection.clone().multiplyScalar(beamLength / 2));
          laserBeamRef.current.rotation.y = Math.atan2(
            fireDirection.x,
            fireDirection.z,
          );
          laserBeamRef.current.scale.set(
            beamHalfWidth / 0.04,
            beamHalfWidth / 0.04,
            beamLength,
          );
          laserBeamHideAtRef.current = now + LASER_BEAM_VISIBLE_MS;
          if (beamMeshRef.current) {
            (beamMeshRef.current.material as THREE.MeshBasicMaterial).color.set(
              beamColor,
            );
          }
          if (beamGlowRef.current) {
            (beamGlowRef.current.material as THREE.MeshBasicMaterial).color.set(
              beamColor,
            );
          }
          // Camera shake per weapon
          const shakeAmt =
            wid === "shotgun"
              ? 0.11
              : wid === "rocket"
                ? 0.09
                : wid === "grenade"
                  ? 0.07
                  : wid === "smg"
                    ? 0.03
                    : 0.04;
          cameraShakeRef.current.set(
            (Math.random() - 0.5) * shakeAmt,
            (0.3 + Math.random() * 0.5) * shakeAmt,
            (Math.random() - 0.5) * shakeAmt * 0.3,
          );
          // Muzzle flash
          if (muzzleFlashRef.current) {
            muzzleFlashRef.current.position.copy(fireOrigin);
            muzzleFlashRef.current.visible = true;
            muzzleFlashHideAtRef.current = now + 55;
          }
          // Sync ammo + reload progress to HUD
          const remainingAmmo = weaponManagerRef.current.getAmmo(wid);
          const reloadProgress =
            weaponManagerRef.current.getReloadProgress(wid);
          gameManager?.updatePlayer(myId, {
            currentAmmo: remainingAmmo,
            reloadProgress,
          });
        }
        if (fireResult && fireResult.hit && typeof window !== "undefined") {
          window.dispatchEvent(new window.Event("player-hit-landed"));
          const hitPos = fireOrigin
            .clone()
            .add(fireDirection.clone().multiplyScalar(fireResult.hit.distance));
          window.dispatchEvent(
            new window.CustomEvent("damage-number", {
              detail: {
                x: hitPos.x,
                y: hitPos.y + 1.0,
                z: hitPos.z,
                damage: fireResult.weapon.damage,
              },
            }),
          );
          // Explosion VFX for splash weapons
          if (fireResult.weapon.splashRadius) {
            window.dispatchEvent(
              new window.CustomEvent("weapon-explosion", {
                detail: {
                  x: hitPos.x,
                  y: hitPos.y,
                  z: hitPos.z,
                  radius: fireResult.weapon.splashRadius,
                },
              }),
            );
          }
        }
      }

      // Hide laser beam after visible time
      if (laserBeamRef.current && now >= laserBeamHideAtRef.current) {
        laserBeamRef.current.visible = false;
      }
      // Hide muzzle flash
      if (
        muzzleFlashRef.current &&
        muzzleFlashHideAtRef.current > 0 &&
        now >= muzzleFlashHideAtRef.current
      ) {
        muzzleFlashRef.current.visible = false;
      }

      // Continuously sync reload progress
      const equipped = weaponManagerRef.current.getEquipped();
      if (equipped) {
        const rp = weaponManagerRef.current.getReloadProgress(equipped.id);
        const ammo = weaponManagerRef.current.getAmmo(equipped.id);
        gameManager?.updatePlayer(myId, {
          currentAmmo: ammo,
          reloadProgress: rp,
        });
      }
    });

    return null;
  },
);

PlayerWeapon.displayName = "PlayerWeapon";
