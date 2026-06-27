import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const PROJECTILE_SPEED = 15;
const GRAVITY = 9.8;
const MAX_SIMULTANEOUS = 5;

type Slot = {
  startedAt: number;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  initialVelocity: number;
  active: boolean;
};

const GrenadeProjectiles: React.FC = () => {
  const slots = React.useRef<Slot[]>(
    Array.from({ length: MAX_SIMULTANEOUS }, () => ({
      startedAt: 0,
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      initialVelocity: 0,
      active: false,
    })),
  );
  const meshRefs = React.useRef<(THREE.Mesh | null)[]>(
    Array(MAX_SIMULTANEOUS).fill(null),
  );

  React.useEffect(() => {
    const handle = (e: unknown) => {
      const { origin, direction, chargeProgress } = (
        e as {
          detail: {
            origin: THREE.Vector3;
            direction: THREE.Vector3;
            chargeProgress: number;
          };
        }
      ).detail;
      const now = Date.now();
      const i = slots.current.findIndex((s) => !s.active);
      if (i === -1) return;

      const mesh = meshRefs.current[i];
      if (!mesh) return;

      slots.current[i] = {
        startedAt: now,
        origin: origin.clone(),
        direction: direction.clone(),
        initialVelocity: PROJECTILE_SPEED * chargeProgress,
        active: true,
      };
      mesh.position.copy(origin);
      mesh.visible = true;
    };
    window.addEventListener("grenade-throw", handle);
    return () => window.removeEventListener("grenade-throw", handle);
  }, []);

  useFrame(() => {
    const now = Date.now();
    for (let i = 0; i < MAX_SIMULTANEOUS; i++) {
      const slot = slots.current[i];
      const mesh = meshRefs.current[i];
      if (!mesh || !slot.active) continue;

      const elapsed = (now - slot.startedAt) / 1000;

      // Parabolic motion: x = v*t, y = v*t - 0.5*g*t^2
      const x = slot.initialVelocity * elapsed;
      const y =
        slot.initialVelocity * Math.sin(Math.PI / 4) * elapsed -
        0.5 * GRAVITY * elapsed * elapsed;

      const pos = slot.origin
        .clone()
        .add(slot.direction.clone().multiplyScalar(x));
      pos.y += y;

      mesh.position.copy(pos);

      if (pos.y < -1) {
        slot.active = false;
        mesh.visible = false;
        window.dispatchEvent(
          new window.CustomEvent("weapon-explosion", {
            detail: {
              x: pos.x,
              y: 0, // Impact ground
              z: pos.z,
              radius: 7, // Should be weapon config
            },
          }),
        );
      }
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
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#44ff00" />
        </mesh>
      ))}
    </>
  );
};

export default GrenadeProjectiles;
