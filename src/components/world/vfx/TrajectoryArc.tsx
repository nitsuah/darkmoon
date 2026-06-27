import * as React from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";

interface TrajectoryArcProps {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  chargeProgress: number; // 0 to 1
  isVisible: boolean;
}

/**
 * Renders a parabolic trajectory arc for grenade throwing.
 */
export const TrajectoryArc: React.FC<TrajectoryArcProps> = ({
  origin,
  direction,
  chargeProgress,
  isVisible,
}) => {
  if (!isVisible) return null;

  // Simple parabolic projection
  const points = React.useMemo(() => {
    // ... same logic ...
  }, [origin, direction, chargeProgress]);

  // Color from green to red based on charge
  const color = new THREE.Color().lerpColors(
    new THREE.Color("#44ff00"),
    new THREE.Color("#ff0000"),
    chargeProgress,
  );

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      dashed
      dashSize={0.2}
      gapSize={0.2}
    />
  );
};
