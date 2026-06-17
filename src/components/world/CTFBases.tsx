import * as React from "react";
import { TEAM_A_BASE, TEAM_B_BASE } from "../gameModes/CTFMode";

const BASE_RADIUS = 2.5;

function Base({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      {/* Glowing floor disc */}
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BASE_RADIUS, 32]} />
        <meshBasicMaterial color={color} opacity={0.35} transparent />
      </mesh>
      {/* Thin rim ring */}
      <mesh position={[0, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BASE_RADIUS - 0.1, BASE_RADIUS, 32]} />
        <meshBasicMaterial color={color} opacity={0.85} transparent />
      </mesh>
      {/* Vertical pole */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Flag panel on pole */}
      <mesh position={[0.25, 1.3, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

const CTFBases: React.FC = () => (
  <>
    <Base position={TEAM_A_BASE} color="#3388ff" />
    <Base position={TEAM_B_BASE} color="#ff3333" />
  </>
);

export default CTFBases;
