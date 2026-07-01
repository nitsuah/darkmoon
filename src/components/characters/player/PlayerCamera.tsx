import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePlayerCamera } from "../../../lib/hooks/usePlayerCamera";
import { A, D } from "../../utils";

interface PlayerCameraProps {
  /** Camera ref from R3F */
  camera: THREE.Camera;
  /** Player mesh ref */
  meshRef: React.RefObject<THREE.Group>;
  /** Mouse controls state */
  mouseControls: {
    leftClick: boolean;
    rightClick: boolean;
    middleClick: boolean;
    mouseX: number;
    mouseY: number;
  };
  /** Joystick camera input */
  joystickCamera: { x: number; y: number };
  /** Key press state */
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  /** Viewport size */
  size: { width: number; height: number };
  /** Whether player is frozen */
  isPlayerFrozenRef: React.RefObject<boolean>;
  /** Delta time */
  delta?: number;
}

export const PlayerCamera = React.memo(
  ({
    camera,
    meshRef,
    mouseControls,
    joystickCamera,
    keysPressedRef,
    size,
    isPlayerFrozenRef,
  }: PlayerCameraProps) => {
    const cameraState = usePlayerCamera();

    const {
      cameraOffsetRef,
      cameraRotationRef,
      skycamRef,
      previousMouseRef,
      isFirstMouseRef,
      idealCameraPositionRef,
      skyTargetRef,
    } = cameraState;

    useFrame((state, delta) => {
      if (!meshRef.current) return;

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

        const sensitivity = 0.005;
        cameraRotationRef.current.horizontal -= deltaX * sensitivity;
        cameraRotationRef.current.vertical -= deltaY * sensitivity;

        // Clamp vertical rotation
        cameraRotationRef.current.vertical = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, cameraRotationRef.current.vertical),
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
      }
      if (keysPressedRef.current[D]) {
        cameraRotationRef.current.horizontal -= 2 * delta; // Rotate right
      }

      // Always clamp vertical rotation
      cameraRotationRef.current.vertical = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotationRef.current.vertical),
      );

      // Calculate camera offset based on rotation
      const distance = 5;
      const offsetX =
        Math.sin(cameraRotationRef.current.horizontal) *
        Math.cos(cameraRotationRef.current.vertical) *
        distance;
      const offsetY =
        Math.sin(cameraRotationRef.current.vertical) * distance + 3;
      const offsetZ =
        Math.cos(cameraRotationRef.current.horizontal) *
        Math.cos(cameraRotationRef.current.vertical) *
        distance;

      cameraOffsetRef.current.set(offsetX, offsetY, offsetZ);

      // Smooth third-person camera follow rotation
      idealCameraPositionRef.current.set(
        meshRef.current.position.x + cameraOffsetRef.current.x,
        meshRef.current.position.y + cameraOffsetRef.current.y,
        meshRef.current.position.z + cameraOffsetRef.current.z,
      );

      // Lerp camera position smooth
      if (skycamRef.current) {
        skyTargetRef.current.copy(idealCameraPositionRef.current);
        skyTargetRef.current.y += 12; // raise camera when in skycam
        state.camera.position.lerp(skyTargetRef.current, 0.06);
      } else {
        state.camera.position.lerp(idealCameraPositionRef.current, 0.1);
      }

      // Make camera look at character
      state.camera.lookAt(
        meshRef.current.position.x,
        meshRef.current.position.y + 0.5,
        meshRef.current.position.z,
      );
    });

    return null; // This component only provides useFrame logic
  },
);

PlayerCamera.displayName = "PlayerCamera";
