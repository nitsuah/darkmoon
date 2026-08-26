import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const PROJECTILE_SPEED = 15;
const GRAVITY = 9.8;
const DEFAULT_LAUNCH_ANGLE = Math.PI / 6; // 30° base arc
const MAX_SIMULTANEOUS = 5;

type Slot = {
  startedAt: number;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  initialVelocity: number;
  launchAngle: number;
  active: boolean;
};

type Particle = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
};

const PARTICLE_COUNT = 12;

const GrenadeProjectiles: React.FC = () => {
  const slots = React.useRef<Slot[]>(
    Array.from({ length: MAX_SIMULTANEOUS }, () => ({
      startedAt: 0,
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      initialVelocity: 0,
      launchAngle: DEFAULT_LAUNCH_ANGLE,
      active: false,
    })),
  );
  const meshRefs = React.useRef<(THREE.Mesh | null)[]>(
    Array(MAX_SIMULTANEOUS).fill(null),
  );
  const particles = React.useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0,
      active: false,
    })),
  );
  const particleRefs = React.useRef<(THREE.Mesh | null)[]>(
    Array(PARTICLE_COUNT).fill(null),
  );

  React.useEffect(() => {
    const handle = (e: unknown) => {
      const { origin, direction, chargeProgress, launchAngle } = (
        e as {
          detail: {
            origin: THREE.Vector3;
            direction: THREE.Vector3;
            chargeProgress: number;
            launchAngle?: number;
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
        origin:
          origin instanceof THREE.Vector3
            ? origin.clone()
            : new THREE.Vector3(origin.x, origin.y, origin.z),
        direction:
          direction instanceof THREE.Vector3
            ? direction.clone()
            : new THREE.Vector3(direction.x, direction.y, direction.z),
        initialVelocity: PROJECTILE_SPEED * chargeProgress,
        launchAngle: launchAngle ?? DEFAULT_LAUNCH_ANGLE,
        active: true,
      };
      mesh.position.copy(slots.current[i].origin);
      mesh.visible = true;
    };
    window.addEventListener("grenade-throw", handle);
    return () => window.removeEventListener("grenade-throw", handle);
  }, []);

  const spawnExplosion = (pos: THREE.Vector3) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles.current[i];
      p.active = false; // reclaim all
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.7; // bias upward
      const speed = 4 + Math.random() * 7;
      p.pos.copy(pos);
      p.vel.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        (0.3 + Math.random() * 0.7) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
      );
      p.maxLife = 0.5 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.active = true;
      const mesh = particleRefs.current[i];
      if (mesh) {
        mesh.position.copy(pos);
        mesh.visible = true;
      }
    }
  };

  useFrame((_, delta) => {
    const now = Date.now();

    // Update grenade projectiles
    for (let i = 0; i < MAX_SIMULTANEOUS; i++) {
      const slot = slots.current[i];
      const mesh = meshRefs.current[i];
      if (!mesh || !slot.active) continue;

      const elapsed = (now - slot.startedAt) / 1000;
      const angle = slot.launchAngle;
      const v0x = slot.initialVelocity * Math.cos(angle);
      const v0y = slot.initialVelocity * Math.sin(angle);

      const dist = v0x * elapsed;
      const height = v0y * elapsed - 0.5 * GRAVITY * elapsed * elapsed;

      const pos = slot.origin
        .clone()
        .add(slot.direction.clone().multiplyScalar(dist));
      pos.y += height;
      mesh.position.copy(pos);

      if (pos.y <= 0.3 || elapsed > 5) {
        slot.active = false;
        mesh.visible = false;
        pos.y = Math.max(0.3, pos.y);

        spawnExplosion(pos);

        window.dispatchEvent(
          new window.CustomEvent("weapon-explosion", {
            detail: { x: pos.x, y: pos.y, z: pos.z, radius: 7 },
          }),
        );
      }
    }

    // Update explosion particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles.current[i];
      const mesh = particleRefs.current[i];
      if (!mesh || !p.active) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      p.vel.y -= GRAVITY * delta;
      p.pos.addScaledVector(p.vel, delta);
      mesh.position.copy(p.pos);

      const t = p.life / p.maxLife;
      mesh.scale.setScalar(0.08 + t * 0.12);
      (mesh.material as THREE.MeshBasicMaterial).color.setHSL(
        0.06 + t * 0.08, // orange → red
        1,
        0.5 + t * 0.2,
      );
    }
  });

  return (
    <>
      {Array.from({ length: MAX_SIMULTANEOUS }).map((_, i) => (
        <mesh
          key={`grenade-${i}`}
          ref={(el: THREE.Mesh | null) => {
            meshRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#44ff00" />
        </mesh>
      ))}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={`gp-${i}`}
          ref={(el: THREE.Mesh | null) => {
            particleRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.1, 4, 4]} />
          <meshBasicMaterial color="#ff6600" />
        </mesh>
      ))}
    </>
  );
};

export default GrenadeProjectiles;
