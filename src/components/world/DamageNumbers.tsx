import * as React from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const DURATION_MS = 1100;
const MAX_SLOTS = 8;

type Slot = {
  active: boolean;
  startedAt: number;
  x: number;
  y: number;
  z: number;
  damage: number;
};

const makeSlot = (): Slot => ({
  active: false,
  startedAt: 0,
  x: 0,
  y: 0,
  z: 0,
  damage: 0,
});

const DamageNumbers: React.FC = () => {
  const [pool, setPool] = React.useState<Slot[]>(() =>
    Array.from({ length: MAX_SLOTS }, makeSlot),
  );
  const poolRef = React.useRef<Slot[]>(pool);
  const groupRefs = React.useRef<(THREE.Group | null)[]>(
    Array(MAX_SLOTS).fill(null),
  );

  React.useEffect(() => {
    const handle = (e: unknown) => {
      const { x, y, z, damage } = (
        e as { detail: { x: number; y: number; z: number; damage: number } }
      ).detail;
      const now = Date.now();
      const i = poolRef.current.findIndex(
        (s) => !s.active || now - s.startedAt > DURATION_MS,
      );
      if (i === -1) return;
      const next = [...poolRef.current];
      next[i] = { active: true, startedAt: now, x, y, z, damage };
      poolRef.current = next;
      setPool(next);
    };
    window.addEventListener("damage-number", handle);
    return () => window.removeEventListener("damage-number", handle);
  }, []);

  useFrame(() => {
    const now = Date.now();
    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = poolRef.current[i];
      const g = groupRefs.current[i];
      if (!g) continue;
      if (!slot.active) {
        g.visible = false;
        continue;
      }
      const elapsed = now - slot.startedAt;
      if (elapsed >= DURATION_MS) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      const t = elapsed / DURATION_MS;
      g.position.set(slot.x, slot.y + 0.5 + t * 2.2, slot.z);
    }
  });

  return (
    <>
      {pool.map((slot, i) => (
        <group
          key={i}
          ref={(el: THREE.Group | null) => {
            groupRefs.current[i] = el;
          }}
          // eslint-disable-next-line react/no-unknown-property
          visible={false}
        >
          {slot.active && (
            <Billboard>
              <Text
                fontSize={0.45}
                color="#ff4444"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.04}
                outlineColor="#000000"
              >
                {`-${slot.damage}`}
              </Text>
            </Billboard>
          )}
        </group>
      ))}
    </>
  );
};

export default DamageNumbers;
