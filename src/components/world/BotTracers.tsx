import * as React from "react";
import * as THREE from "three";

interface Tracer {
  id: number;
  mid: [number, number, number];
  len: number;
  angle: number;
  color: string;
}

let nextId = 0;

const WEAPON_COLORS: Record<string, string> = {
  laser: "#33ffe6",
  smg: "#ff44cc",
  shotgun: "#ff9900",
  rocket: "#ff2200",
  grenade: "#66ff00",
};

/** Renders brief colored tracer beams when bots fire. Listens for the
 *  "bot-shot-fired" CustomEvent dispatched by Bots.tsx fireBotWeapon. */
const BotTracers: React.FC = () => {
  const [tracers, setTracers] = React.useState<Tracer[]>([]);

  React.useEffect(() => {
    const onShot = (e: Event) => {
      const d = (
        e as CustomEvent<{
          fromX: number;
          fromY: number;
          fromZ: number;
          toX: number;
          toY: number;
          toZ: number;
          weaponId: string;
        }>
      ).detail;

      const from = new THREE.Vector3(d.fromX, d.fromY, d.fromZ);
      const to = new THREE.Vector3(d.toX, d.toY, d.toZ);
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      if (len < 0.1) return;

      const mid: [number, number, number] = [
        (from.x + to.x) / 2,
        (from.y + to.y) / 2,
        (from.z + to.z) / 2,
      ];
      const angle = Math.atan2(dir.x, dir.z);
      const color = WEAPON_COLORS[d.weaponId] ?? "#ffffff";
      const id = nextId++;

      setTracers((prev) => [
        ...prev.slice(-29),
        { id, mid, len, angle, color },
      ]);
      setTimeout(() => {
        setTracers((prev) => prev.filter((t) => t.id !== id));
      }, 220); // extended from 100ms — makes enemy shots clearly visible
    };

    window.addEventListener("bot-shot-fired", onShot);
    return () => window.removeEventListener("bot-shot-fired", onShot);
  }, []);

  return (
    <>
      {tracers.map((t) => (
        <group key={t.id} position={t.mid} rotation={[0, t.angle, 0]}>
          {/* Core tracer beam */}
          <mesh>
            <boxGeometry args={[0.07, 0.07, t.len]} />
            <meshBasicMaterial color={t.color} />
          </mesh>
          {/* Outer glow layer (slightly larger, transparent white) */}
          <mesh>
            <boxGeometry args={[0.16, 0.16, t.len * 1.02]} />
            <meshBasicMaterial color={t.color} transparent opacity={0.18} />
          </mesh>
        </group>
      ))}
    </>
  );
};

export default BotTracers;
