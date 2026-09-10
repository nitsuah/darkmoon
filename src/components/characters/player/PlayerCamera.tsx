import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import * as gameInput from "../../../lib/gameInput";

const DEFAULT_DISTANCE = 3;
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 6;

interface PlayerCameraProps {
  meshRef: React.RefObject<THREE.Group | null>;
  mouseControls: {
    leftClick: boolean;
    rightClick: boolean;
    middleClick: boolean;
    mouseX: number;
    mouseY: number;
  };
  joystickCamera: { x: number; y: number };
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  size: { width: number; height: number };
  isPlayerFrozenRef: React.RefObject<boolean>;
  delta?: number;
  cameraRotationRef: React.RefObject<{ horizontal: number; vertical: number }>;
  skycamRef: React.RefObject<boolean>;
  previousMouseRef: React.RefObject<{ x: number; y: number }>;
  isFirstMouseRef: React.RefObject<boolean>;
  cameraOffsetRef: React.RefObject<THREE.Vector3>;
  idealCameraPositionRef: React.RefObject<THREE.Vector3>;
  skyTargetRef: React.RefObject<THREE.Vector3 | null>;
  playerFreezeEndTimeRef: React.RefObject<number>;
  cameraShakeRef: React.RefObject<THREE.Vector3>;
  isPaused: boolean;
}

export const PlayerCamera = React.memo(
  ({
    meshRef,
    mouseControls,
    joystickCamera,
    cameraRotationRef,
    skycamRef,
    previousMouseRef,
    isFirstMouseRef,
    cameraOffsetRef,
    idealCameraPositionRef,
    skyTargetRef,
  }: PlayerCameraProps) => {
    const cameraDistanceRef = React.useRef(DEFAULT_DISTANCE);
    const prevMiddleClickRef = React.useRef(false);

    useFrame((state, delta) => {
      if (!meshRef.current) return;

      // ── Pointer-lock path (primary, desktop game) ────────────────────────
      if (gameInput.pointerLocked) {
        const sensitivity = 0.0025;
        cameraRotationRef.current.horizontal -=
          gameInput.mouseMovement.dx * sensitivity;
        cameraRotationRef.current.vertical -=
          gameInput.mouseMovement.dy * sensitivity;
        gameInput.mouseMovement.dx = 0;
        gameInput.mouseMovement.dy = 0;
      } else if (
        // Fallback: abs-mouse path used when pointer lock unavailable (mobile / touch)
        mouseControls.leftClick ||
        mouseControls.rightClick ||
        mouseControls.middleClick
      ) {
        if (isFirstMouseRef.current) {
          previousMouseRef.current.x = mouseControls.mouseX;
          previousMouseRef.current.y = mouseControls.mouseY;
          isFirstMouseRef.current = false;
        }
        const sensitivity = 0.005;
        cameraRotationRef.current.horizontal -=
          (mouseControls.mouseX - previousMouseRef.current.x) * sensitivity;
        cameraRotationRef.current.vertical -=
          (mouseControls.mouseY - previousMouseRef.current.y) * sensitivity;
        previousMouseRef.current.x = mouseControls.mouseX;
        previousMouseRef.current.y = mouseControls.mouseY;
      } else {
        isFirstMouseRef.current = true;
        skycamRef.current = false;
      }

      // ── Joystick camera ──────────────────────────────────────────────────
      // joystickCamera.y follows the same screen-space (Y-down-positive)
      // convention as the mouse deltas above, so it must also be subtracted —
      // otherwise dragging the touch camera stick down pitches the camera the
      // opposite direction from an equivalent mouse-down movement.
      if (joystickCamera.x !== 0 || joystickCamera.y !== 0) {
        const speed = 1.5;
        const dt = Math.min(delta, 0.05);
        cameraRotationRef.current.horizontal -= joystickCamera.x * speed * dt;
        cameraRotationRef.current.vertical -= joystickCamera.y * speed * dt;
      }

      // ── Middle-click: reset camera behind player ─────────────────────────
      const midNow = mouseControls.middleClick;
      if (midNow && !prevMiddleClickRef.current) {
        cameraRotationRef.current.horizontal = 0;
        cameraRotationRef.current.vertical = 0.2;
      }
      prevMiddleClickRef.current = midNow;

      // ── Alt+scroll zoom ──────────────────────────────────────────────────
      if (gameInput.cameraZoom.delta !== 0) {
        cameraDistanceRef.current = Math.max(
          MIN_DISTANCE,
          Math.min(
            MAX_DISTANCE,
            cameraDistanceRef.current + gameInput.cameraZoom.delta,
          ),
        );
        gameInput.cameraZoom.delta = 0;
      }

      // ── Clamp vertical ───────────────────────────────────────────────────
      cameraRotationRef.current.vertical = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotationRef.current.vertical),
      );

      // ── Compute camera offset ────────────────────────────────────────────
      const dist = cameraDistanceRef.current;
      const h = cameraRotationRef.current.horizontal;
      const v = cameraRotationRef.current.vertical;
      cameraOffsetRef.current.set(
        Math.sin(h) * Math.cos(v) * dist,
        Math.sin(v) * dist + 3,
        Math.cos(h) * Math.cos(v) * dist,
      );

      idealCameraPositionRef.current.set(
        meshRef.current.position.x + cameraOffsetRef.current.x,
        meshRef.current.position.y + cameraOffsetRef.current.y,
        meshRef.current.position.z + cameraOffsetRef.current.z,
      );

      // ── Smooth follow ────────────────────────────────────────────────────
      if (skycamRef.current) {
        skyTargetRef.current!.copy(idealCameraPositionRef.current);
        skyTargetRef.current!.y += 12;
        state.camera.position.lerp(skyTargetRef.current!, 0.06);
      } else {
        state.camera.position.lerp(idealCameraPositionRef.current, 0.12);
      }

      state.camera.lookAt(
        meshRef.current.position.x,
        meshRef.current.position.y + 0.5,
        meshRef.current.position.z,
      );
    });

    return null;
  },
);

PlayerCamera.displayName = "PlayerCamera";
