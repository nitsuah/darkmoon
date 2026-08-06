import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const BEAM_VISIBLE_MS = 220;
const BEAM_COLOR = new THREE.Color("#ff8833");
const GLOW_COLOR = new THREE.Color("#ff5500");
const MAX_PELLETS = 48; // max simultaneous pellet beams (8 shots × 6 pellets)

interface PelletSlot {
  group: THREE.Group;
  hideAt: number;
  active: boolean;
}

export const ShotgunVFX: React.FC = () => {
  const groupRef = React.useRef<THREE.Group>(null);
  const slotsRef = React.useRef<PelletSlot[]>([]);

  // Build a pool of reusable mesh groups on mount
  React.useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    for (let i = 0; i < MAX_PELLETS; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: BEAM_COLOR,
          transparent: true,
          opacity: 0,
        }),
      );
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({
          color: GLOW_COLOR,
          transparent: true,
          opacity: 0,
        }),
      );
      g.add(core, glow);
      g.visible = false;
      group.add(g);
      slotsRef.current.push({ group: g, hideAt: 0, active: false });
    }
  }, []);

  // Event listener for shotgun fire
  React.useEffect(() => {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const handler = (e: Event) => {
      const { origin, direction, range, spreadAngle, pelletCount } = (
        e as CustomEvent
      ).detail as {
        origin: THREE.Vector3;
        direction: THREE.Vector3;
        range: number;
        spreadAngle: number;
        pelletCount: number;
      };

      right.crossVectors(direction, up).normalize();
      const hideAt = Date.now() + BEAM_VISIBLE_MS;

      let slotIdx = 0;
      for (let i = 0; i < pelletCount; i++) {
        // Find a free slot
        while (
          slotIdx < slotsRef.current.length &&
          slotsRef.current[slotIdx].active
        ) {
          slotIdx++;
        }
        if (slotIdx >= slotsRef.current.length) break;

        const slot = slotsRef.current[slotIdx];
        slotIdx++;

        const yaw = (Math.random() - 0.5) * 2 * spreadAngle;
        const pitch = (Math.random() - 0.5) * 2 * spreadAngle * 0.5;
        const dir = direction
          .clone()
          .addScaledVector(right, Math.tan(yaw))
          .addScaledVector(up, Math.tan(pitch))
          .normalize();
        const len = range * (0.5 + Math.random() * 0.5);

        const mid = origin.clone().addScaledVector(dir, len / 2);
        slot.group.position.copy(mid);
        slot.group.rotation.y = Math.atan2(dir.x, dir.z);
        slot.group.scale.set(1, 1, 1);

        const core = slot.group.children[0] as THREE.Mesh;
        const glow = slot.group.children[1] as THREE.Mesh;
        core.scale.set(0.06, 0.06, len);
        glow.scale.set(0.14, 0.14, len);
        (core.material as THREE.MeshBasicMaterial).opacity = 0.9;
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.3;

        slot.group.visible = true;
        slot.hideAt = hideAt;
        slot.active = true;
      }
    };

    window.addEventListener("shotgun-pellets-fired", handler);
    return () => window.removeEventListener("shotgun-pellets-fired", handler);
  }, []);

   
  useFrame(() => {
    const now = Date.now();
    // Directly mutating Three.js objects is intentional here — this is an imperative R3F pattern.
     
    for (const slot of slotsRef.current) {
      if (!slot.active) continue;
      if (now >= slot.hideAt) {
        // eslint-disable-next-line react-hooks/immutability
        slot.group.visible = false;
         
        slot.active = false;
        continue;
      }
      const age = (now - (slot.hideAt - BEAM_VISIBLE_MS)) / BEAM_VISIBLE_MS;
      const opacity = Math.max(0, 1 - age);
      const core = slot.group.children[0] as THREE.Mesh;
      const glow = slot.group.children[1] as THREE.Mesh;
       
      (core.material as THREE.MeshBasicMaterial).opacity = opacity * 0.9;
       
      (glow.material as THREE.MeshBasicMaterial).opacity = opacity * 0.3;
    }
  });

  return <group ref={groupRef} />;
};
