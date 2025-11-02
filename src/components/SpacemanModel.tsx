import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SpacemanModelProps {
  color?: string;
  isIt?: boolean;
  velocity?: [number, number, number]; // Current velocity for animation
  cameraRotation?: number; // Camera yaw rotation for head tracking
  isSprinting?: boolean; // Sprint state for faster arm movement
}

/**
 * Dynamic geometric spaceman character made from primitives
 * Features:
 * - Animated arms that swing when walking/running
 * - Head rotation that follows camera direction
 * - Defined jetpack on back
 * - Body: cylinder, Head: sphere, Arms/Legs: cylinders, Helmet: glass sphere
 */
const SpacemanModel: React.FC<SpacemanModelProps> = ({
  color = "#4a90e2",
  isIt = false,
  velocity = [0, 0, 0],
  cameraRotation = 0,
  isSprinting = false,
}) => {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const animationTime = useRef(0);

  // Refs for materials to update colors dynamically
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const leftArmMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const rightArmMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const leftLegMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const rightLegMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Update all materials when color changes
  useFrame(() => {
    // Update all body part colors every frame (minimal cost, ensures sync)
    if (
      bodyMaterialRef.current &&
      bodyMaterialRef.current.color.getHexString() !== color.replace("#", "")
    ) {
      bodyMaterialRef.current.color.set(color);
    }
    if (
      leftArmMaterialRef.current &&
      leftArmMaterialRef.current.color.getHexString() !== color.replace("#", "")
    ) {
      leftArmMaterialRef.current.color.set(color);
    }
    if (
      rightArmMaterialRef.current &&
      rightArmMaterialRef.current.color.getHexString() !==
        color.replace("#", "")
    ) {
      rightArmMaterialRef.current.color.set(color);
    }
    if (
      leftLegMaterialRef.current &&
      leftLegMaterialRef.current.color.getHexString() !== color.replace("#", "")
    ) {
      leftLegMaterialRef.current.color.set(color);
    }
    if (
      rightLegMaterialRef.current &&
      rightLegMaterialRef.current.color.getHexString() !==
        color.replace("#", "")
    ) {
      rightLegMaterialRef.current.color.set(color);
    }
  });

  useFrame((state, delta) => {
    if (!leftArmRef.current || !rightArmRef.current) return;

    // Calculate movement speed for animation
    const speed = Math.sqrt(velocity[0] ** 2 + velocity[2] ** 2);
    const isMoving = speed > 0.1;

    if (isMoving) {
      // Animate arms with sinusoidal swing
      const armSwingSpeed = isSprinting ? 8 : 5; // Faster swing when sprinting
      const armSwingAmount = isSprinting ? 0.6 : 0.4; // Larger swing when sprinting

      animationTime.current += delta * armSwingSpeed;

      // Swing arms in opposite directions (walking motion)
      const leftArmSwing = Math.sin(animationTime.current) * armSwingAmount;
      const rightArmSwing = -Math.sin(animationTime.current) * armSwingAmount;

      // Apply rotation on X axis (forward/backward swing)
      leftArmRef.current.rotation.x = leftArmSwing;
      rightArmRef.current.rotation.x = rightArmSwing;
    } else {
      // Reset to neutral position when not moving
      leftArmRef.current.rotation.x *= 0.9; // Smooth decay
      rightArmRef.current.rotation.x *= 0.9;
    }

    // Head rotation to follow camera direction
    if (headGroupRef.current) {
      // Smoothly interpolate head rotation toward camera rotation
      const targetRotation = -cameraRotation; // Negative because we want head to face camera direction
      const currentRotation = headGroupRef.current.rotation.y;
      const rotationDiff = targetRotation - currentRotation;

      // Smooth lerp with constraints
      const lerpSpeed = 5 * delta;
      const newRotation = currentRotation + rotationDiff * lerpSpeed;

      // Constrain head rotation to realistic limits (-60° to +60°)
      const maxHeadRotation = Math.PI / 3;
      headGroupRef.current.rotation.y = THREE.MathUtils.clamp(
        newRotation,
        -maxHeadRotation,
        maxHeadRotation
      );
    }
  });

  return (
    <group scale={0.5}>
      {/* Body - cylinder */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.8, 16]} />
        <meshStandardMaterial
          ref={bodyMaterialRef}
          color={color}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Head group - rotates to follow camera */}
      <group ref={headGroupRef} position={[0, 1.25, 0]}>
        {/* Head - sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color="#f5f5dc"
            metalness={0.1}
            roughness={0.9}
          />
        </mesh>

        {/* Helmet visor - transparent sphere */}
        <mesh>
          <sphereGeometry args={[0.27, 16, 16]} />
          <meshStandardMaterial
            color="#88ccff"
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Antenna on helmet */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
          <meshStandardMaterial
            color="#ffaa00"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Antenna tip - glowing sphere */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={isIt ? "#ff0000" : "#00ff00"} />
        </mesh>
      </group>

      {/* Left arm - group for rotation pivot at shoulder */}
      <group ref={leftArmRef} position={[-0.4, 0.7, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 8]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
          <meshStandardMaterial
            ref={leftArmMaterialRef}
            color={color}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      </group>

      {/* Right arm - group for rotation pivot at shoulder */}
      <group ref={rightArmRef} position={[0.4, 0.7, 0]}>
        <mesh castShadow rotation={[0, 0, -Math.PI / 8]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
          <meshStandardMaterial
            ref={rightArmMaterialRef}
            color={color}
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      </group>

      {/* Left leg */}
      <mesh castShadow position={[-0.15, 0.0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial
          ref={leftLegMaterialRef}
          color={color}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Right leg */}
      <mesh castShadow position={[0.15, 0.0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial
          ref={rightLegMaterialRef}
          color={color}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* JETPACK - Defined model on back */}
      <group position={[0, 0.7, -0.25]}>
        {/* Main jetpack body */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.5, 0.2]} />
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* Fuel tanks (two cylinders) */}
        <mesh castShadow position={[-0.1, 0, -0.05]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 12]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <mesh castShadow position={[0.1, 0, -0.05]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 12]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Thruster nozzles */}
        <mesh position={[-0.1, -0.25, -0.05]}>
          <cylinderGeometry args={[0.05, 0.07, 0.1, 8]} />
          <meshStandardMaterial
            color="#222222"
            metalness={0.9}
            roughness={0.1}
            // eslint-disable-next-line react/no-unknown-property
            emissive="#ff6600"
            // eslint-disable-next-line react/no-unknown-property
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0.1, -0.25, -0.05]}>
          <cylinderGeometry args={[0.05, 0.07, 0.1, 8]} />
          <meshStandardMaterial
            color="#222222"
            metalness={0.9}
            roughness={0.1}
            // eslint-disable-next-line react/no-unknown-property
            emissive="#ff6600"
            // eslint-disable-next-line react/no-unknown-property
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* Control panel detail */}
        <mesh position={[0, 0.15, 0.11]}>
          <boxGeometry args={[0.15, 0.12, 0.02]} />
          <meshStandardMaterial
            color="#00ff00"
            metalness={0.5}
            roughness={0.5}
            // eslint-disable-next-line react/no-unknown-property
            emissive="#00ff00"
            // eslint-disable-next-line react/no-unknown-property
            emissiveIntensity={isIt ? 0.5 : 0.2}
          />
        </mesh>
      </group>

      {/* Glow effect for 'it' player */}
      {isIt && (
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color="#ff6666" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
};

export default SpacemanModel;
