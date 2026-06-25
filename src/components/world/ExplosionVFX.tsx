import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const EXPLOSION_DURATION_MS = 450;
const MAX_SIMULTANEOUS = 4;

type Slot = {
  startedAt: number;
  radius: number;
  active: boolean;
};

const ExplosionVFX: React.FC = () => {
  const slots = React.useRef<Slot[]>(
    Array.from({ length: MAX_SIMULTANEOUS }, () => ({
      startedAt: 0,
      radius: 1,
      active: false,
    })),
  );
  const meshRefs = React.useRef<(THREE.Mesh | null)[]>(
    Array(MAX_SIMULTANEOUS).fill(null),
  );

  React.useEffect(() => {
    const handle = (e: unknown) => {
      const { x, y, z, radius } = (
        e as { detail: { x: number; y: number; z: number; radius: number } }
      ).detail;
      const now = Date.now();
      const i = slots.current.findIndex(
        (s) => !s.active || now - s.startedAt > EXPLOSION_DURATION_MS,
      );
      if (i === -1) return;
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      slots.current[i] = { startedAt: now, radius, active: true };
      mesh.position.set(x, y, z);
      mesh.visible = true;
    };
    window.addEventListener("weapon-explosion", handle);
    return () => window.removeEventListener("weapon-explosion", handle);
  }, []);

  useFrame(() => {
    const now = Date.now();
    for (let i = 0; i < MAX_SIMULTANEOUS; i++) {
      const slot = slots.current[i];
      const mesh = meshRefs.current[i];
      if (!mesh || !slot.active) continue;
      const elapsed = now - slot.startedAt;
      if (elapsed >= EXPLOSION_DURATION_MS) {
        mesh.visible = false;
        slot.active = false;
        continue;
      }
      const t = elapsed / EXPLOSION_DURATION_MS;
      const scale = slot.radius * (0.15 + t * 0.85);
      mesh.scale.set(scale, scale, scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
    }
  });

  return (
    <>
      {Array.from({ length: MAX_SIMULTANEOUS }).map((_, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            meshRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 10, 7]} />
          <meshBasicMaterial
            color="#ff5500"
            transparent
            opacity={0}
            wireframe
          />
        </mesh>
      ))}
    </>
  );
};

export default ExplosionVFX;
