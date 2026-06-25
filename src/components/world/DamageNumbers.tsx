import * as React from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const DURATION_MS = 1100;
const MAX_SLOTS = 12;

type Slot = {
  active: boolean;
  startedAt: number;
  x: number;
  y: number;
  z: number;
  damage: number;
  color: string;
  positive: boolean;
};

const makeSlot = (): Slot => ({
  active: false,
  startedAt: 0,
  x: 0,
  y: 0,
  z: 0,
  damage: 0,
  color: "#ff4444",
  positive: false,
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
      const d = (
        e as {
          detail: {
            x: number;
            y: number;
            z: number;
            damage: number;
            color?: string;
            positive?: boolean;
          };
        }
      ).detail;
      const now = Date.now();
      const i = poolRef.current.findIndex(
        (s) => !s.active || now - s.startedAt > DURATION_MS,
      );
      if (i === -1) return;
      const next = [...poolRef.current];
      next[i] = {
        active: true,
        startedAt: now,
        x: d.x,
        y: d.y,
        z: d.z,
        damage: d.damage,
        color: d.color ?? "#ff4444",
        positive: d.positive ?? false,
      };
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
      // Float upward; shrink slightly at the end for a "pop" exit.
      g.position.set(slot.x, slot.y + 0.5 + t * 2.5, slot.z);
      const shrink = t > 0.75 ? 1 - (t - 0.75) * 2.5 : 1;
      g.scale.setScalar(Math.max(0.05, shrink));
    }
  });

  return (
    <>
      {pool.map((slot, i) => {
        const size =
          slot.damage >= 100
            ? 0.65
            : slot.damage >= 50
              ? 0.52
              : slot.damage >= 25
                ? 0.44
                : 0.38;
        return (
          <group
            key={i}
            ref={(el: THREE.Group | null) => {
              groupRefs.current[i] = el;
            }}
            visible={false}
          >
            {slot.active && (
              <Billboard>
                <Text
                  fontSize={size}
                  color={slot.color}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.05}
                  outlineColor="#000000"
                >
                  {slot.positive ? `+${slot.damage}` : `-${slot.damage}`}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </>
  );
};

export default DamageNumbers;
