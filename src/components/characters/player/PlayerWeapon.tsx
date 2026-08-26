import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameManager } from "../../../components/GameManager";
import type { WeaponManager } from "../../../components/combat/WeaponManager";
import { CollisionSystem } from "../../../components/CollisionSystem";
import { KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_R, KEY_TAB } from "../../utils";
import { processFiring } from "../../../lib/hooks/usePlayerWeapon";
import * as gameInput from "../../../lib/gameInput";

// Shared read-only ground plane — never mutated, safe to reuse across instances.

interface PlayerWeaponProps {
  /** Player mesh ref */
  meshRef: React.RefObject<THREE.Group | null>;
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
  prevKeyTabRef: React.RefObject<boolean>;
  /** Whether player can act (not respawning, not frozen) */
  canAct: boolean;
  /** Collision system ref for hit detection */
  collisionSystemRef: React.RefObject<CollisionSystem>;
  /** Player frozen ref */
  isPlayerFrozenRef: React.RefObject<boolean>;
}

const LASER_BEAM_VISIBLE_MS = 250;
const WEAPON_CYCLE_ORDER = [
  "laser",
  "shotgun",
  "smg",
  "rocket",
  "grenade",
] as const;

export const PlayerWeapon = React.memo(
  ({
    meshRef,
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
    prevKeyTabRef,
    canAct,
    collisionSystemRef,
    isPlayerFrozenRef,
  }: PlayerWeaponProps) => {
    const myId = socketClient?.id || currentPlayerId;

    // Per-instance scratch objects reused per frame to avoid GC churn
    const _fireOrigin = React.useRef<THREE.Vector3>(new THREE.Vector3());
    const _raycaster = React.useRef<THREE.Raycaster>(new THREE.Raycaster());
    const _ndc = React.useRef<THREE.Vector2>(new THREE.Vector2());
    const _fireDir = React.useRef<THREE.Vector3>(new THREE.Vector3());
    const _tempVec = React.useRef<THREE.Vector3>(new THREE.Vector3());
    const _tempVec2 = React.useRef<THREE.Vector3>(new THREE.Vector3());

    // Listen for perfect-reload event dispatched by ReloadMeter
    React.useEffect(() => {
      const handler = () => {
        const equipped = weaponManagerRef.current?.getEquipped();
        if (equipped) weaponManagerRef.current.completeReloadNow(equipped.id);
      };
      window.addEventListener("weapon-reload-perfect", handler);
      return () => window.removeEventListener("weapon-reload-perfect", handler);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useFrame((state) => {
      const now = Date.now();

      if (isPaused || !meshRef.current || !gameManager) return;

      // Recompute canAct from live refs in case React.memo skipped prop update
      const mePlayer = gameManager.getPlayers().get(myId);
      const canActNow =
        canAct &&
        mePlayer?.respawnAt === undefined &&
        !isPlayerFrozenRef.current;

      // Weapon switching: rising-edge detection, gated by canActNow
      const key1 = keysPressedRef.current[KEY_1] ?? false;
      const key2 = keysPressedRef.current[KEY_2] ?? false;
      const key3 = keysPressedRef.current[KEY_3] ?? false;
      const key4 = keysPressedRef.current[KEY_4] ?? false;
      const key5 = keysPressedRef.current[KEY_5] ?? false;
      const keyR = keysPressedRef.current[KEY_R] ?? false;
      const keyTab = keysPressedRef.current[KEY_TAB] ?? false;

      // Consume scroll input on every frame so stale input never carries over
      const scrollDir = gameInput.weaponScrollInput.direction;
      gameInput.weaponScrollInput.direction = 0;

      if (canActNow) {
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
        // R key: reload or precision snap
        if (keyR && !prevKeyRRef.current) {
          const equipped = weaponManagerRef.current.getEquipped();
          if (equipped) {
            if (weaponManagerRef.current.isReloading(equipped.id)) {
              // Precision reload: snap attempt dispatched; ReloadMeter handles perfect check
              window.dispatchEvent(new CustomEvent("weapon-reload-snap"));
            } else {
              weaponManagerRef.current.startReload(equipped.id);
            }
          }
        }
        // Tab key: cycle to next weapon
        if (keyTab && !prevKeyTabRef.current) {
          const currentId = weaponManagerRef.current.getEquipped()?.id;
          const idx = currentId
            ? WEAPON_CYCLE_ORDER.indexOf(
                currentId as (typeof WEAPON_CYCLE_ORDER)[number],
              )
            : -1;
          const nextId =
            WEAPON_CYCLE_ORDER[(idx + 1) % WEAPON_CYCLE_ORDER.length];
          weaponManagerRef.current.equip(nextId);
          gameManager?.updatePlayer(myId, {
            equippedWeaponId: nextId,
            currentAmmo: weaponManagerRef.current.getAmmo(nextId),
          });
        }
        // Scroll wheel: cycle weapons
        if (scrollDir !== 0) {
          const currentId = weaponManagerRef.current.getEquipped()?.id;
          const idx = currentId
            ? WEAPON_CYCLE_ORDER.indexOf(
                currentId as (typeof WEAPON_CYCLE_ORDER)[number],
              )
            : -1;
          const len = WEAPON_CYCLE_ORDER.length;
          const nextIdx =
            scrollDir > 0 ? (idx + 1) % len : (idx - 1 + len) % len;
          const nextId = WEAPON_CYCLE_ORDER[nextIdx];
          weaponManagerRef.current.equip(nextId);
          gameManager?.updatePlayer(myId, {
            equippedWeaponId: nextId,
            currentAmmo: weaponManagerRef.current.getAmmo(nextId),
          });
        }
      }
      prevKey1Ref.current = key1;
      prevKey2Ref.current = key2;
      prevKey3Ref.current = key3;
      prevKey4Ref.current = key4;
      prevKey5Ref.current = key5;
      prevKeyRRef.current = keyR;
      prevKeyTabRef.current = keyTab;

      // Fire the equipped weapon while left-click is held
      if (mouseControls.leftClick && canActNow) {
        // Reuse scratch objects to avoid per-frame GC churn
        _fireOrigin.current.copy(meshRef.current.position);
        _fireOrigin.current.y += 1;

        // Always fire from crosshair center (NDC 0,0) for accurate aiming
        _raycaster.current.setFromCamera(_ndc.current.set(0, 0), state.camera);
        _fireDir.current.copy(_raycaster.current.ray.direction);

        // Mobile aim assist: snap toward the nearest enemy within a 20° cone
        if (gameInput.isMobile && gameManager) {
          const AIM_CONE = Math.cos(Math.PI / 9); // cos(20°)
          let bestDistance = Infinity;
          let bestDir: THREE.Vector3 | null = null;
          gameManager.getPlayers().forEach((p, id) => {
            if (id === myId || !p.position || p.respawnAt !== undefined) return;
            const toTarget = _tempVec2.current
              .set(p.position[0], p.position[1] + 1, p.position[2])
              .sub(_fireOrigin.current);
            const dist = toTarget.length();
            toTarget.normalize();
            const dot = toTarget.dot(_fireDir.current);
            if (dot >= AIM_CONE && dist < bestDistance) {
              bestDistance = dist;
              bestDir = toTarget.clone();
            }
          });
          if (bestDir) _fireDir.current.copy(bestDir);
        }

        const equippedId = weaponManagerRef.current.getEquipped()?.id;

        // Grenade: dispatch projectile event instead of instant raycast
        if (equippedId === "grenade") {
          const firedWeapon = weaponManagerRef.current.fire(myId, now);
          if (firedWeapon) {
            const flatDir = _tempVec.current
              .set(_fireDir.current.x, 0, _fireDir.current.z)
              .normalize();
            const pitchLen = Math.sqrt(
              _fireDir.current.x * _fireDir.current.x +
                _fireDir.current.z * _fireDir.current.z,
            );
            const launchAngle = Math.max(
              0.1,
              Math.atan2(_fireDir.current.y, pitchLen),
            );
            const chargeProgress =
              weaponManagerRef.current.getChargeProgress("grenade") || 0.5;
            window.dispatchEvent(
              new window.CustomEvent("grenade-throw", {
                detail: {
                  origin: _fireOrigin.current.clone(),
                  direction: flatDir.clone(),
                  launchAngle,
                  chargeProgress: Math.max(0.35, chargeProgress),
                },
              }),
            );
            window.dispatchEvent(
              new window.CustomEvent("weapon-fired", {
                detail: { weaponId: "grenade" },
              }),
            );
          }
          // Skip standard fire path for grenade
        } else {
          const fireResult = processFiring({
            origin: _fireOrigin.current,
            direction: _fireDir.current,
            shooterId: myId,
            gameManager,
            weaponManager: weaponManagerRef.current,
            collisionSystem: collisionSystemRef.current,
            now,
          });

          // Gallery mode: dispatch hit event for shooting gallery targets
          if (
            gameManager.getGameState().mode === "shooting_gallery" &&
            fireResult
          ) {
            window.dispatchEvent(
              new window.CustomEvent("gallery-fire", {
                detail: {
                  originX: state.camera.position.x,
                  originY: state.camera.position.y,
                  originZ: state.camera.position.z,
                  dirX: _fireDir.current.x,
                  dirY: _fireDir.current.y,
                  dirZ: _fireDir.current.z,
                  range: 80,
                },
              }),
            );
          }

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

            // Shotgun: dispatch cone event, skip single beam
            if (wid === "shotgun") {
              window.dispatchEvent(
                new window.CustomEvent("shotgun-pellets-fired", {
                  detail: {
                    origin: _fireOrigin.current.clone(),
                    direction: _fireDir.current.clone(),
                    range: fireResult.weapon.range,
                    spreadAngle: fireResult.weapon.spreadAngle ?? 0.28,
                    pelletCount: fireResult.weapon.pelletCount ?? 6,
                  },
                }),
              );
            }

            if (wid === "shotgun") {
              // Suppress single-beam for shotgun (cone VFX handles visuals)
            } else {
              const beamHalfWidth =
                wid === "rocket" || wid === "grenade"
                  ? 0.2
                  : wid === "smg"
                    ? 0.04
                    : 0.04;
              const beamColor =
                wid === "rocket"
                  ? "#ff1100"
                  : wid === "grenade"
                    ? "#44ff00"
                    : wid === "smg"
                      ? "#ff44cc"
                      : "#33ffe6";
              laserBeamRef.current.visible = true;
              laserBeamRef.current.position
                .copy(_fireOrigin.current)
                .add(
                  _tempVec.current
                    .copy(_fireDir.current)
                    .multiplyScalar(beamLength / 2),
                );
              laserBeamRef.current.rotation.y = Math.atan2(
                _fireDir.current.x,
                _fireDir.current.z,
              );
              laserBeamRef.current.scale.set(
                beamHalfWidth / 0.04,
                beamHalfWidth / 0.04,
                beamLength,
              );
              laserBeamHideAtRef.current = now + LASER_BEAM_VISIBLE_MS;
              if (beamMeshRef.current) {
                (
                  beamMeshRef.current.material as THREE.MeshBasicMaterial
                ).color.set(beamColor);
              }
              if (beamGlowRef.current) {
                (
                  beamGlowRef.current.material as THREE.MeshBasicMaterial
                ).color.set(beamColor);
              }
            } // end else (non-shotgun beam)

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
              muzzleFlashRef.current.position.copy(_fireOrigin.current);
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
            const hitPos = _tempVec.current
              .copy(_fireOrigin.current)
              .add(
                _tempVec2.current
                  .copy(_fireDir.current)
                  .multiplyScalar(fireResult.hit.distance),
              );
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
        } // end else (non-grenade weapons)
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

      // Continuously sync reload progress + reserve ammo
      const equipped = weaponManagerRef.current.getEquipped();
      if (equipped) {
        const rp = weaponManagerRef.current.getReloadProgress(equipped.id);
        const ammo = weaponManagerRef.current.getAmmo(equipped.id);
        const reserve = weaponManagerRef.current.getReserveAmmo(equipped.id);
        gameManager?.updatePlayer(myId, {
          currentAmmo: ammo,
          reloadProgress: rp,
          reserveAmmo: reserve,
        });
      }
    });

    return null;
  },
);

PlayerWeapon.displayName = "PlayerWeapon";
