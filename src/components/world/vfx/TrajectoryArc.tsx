import * as React from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";

interface TrajectoryArcProps {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  chargeProgress: number; // 0 to 1
  isVisible: boolean;
  /** Camera vertical angle (radians) — used to set launch angle */
  cameraVertical?: number;
}

/**
 * Renders a parabolic trajectory arc for grenade throwing.
 */
export const TrajectoryArc: React.FC<TrajectoryArcProps> = ({
  origin,
  direction,
  chargeProgress,
  isVisible,
  cameraVertical = 0,
}) => {
  const points = React.useMemo(() => {
    if (!isVisible || chargeProgress <= 0) return [];

    const pts: THREE.Vector3[] = [];
    const gravity = 9.8;
    const initialVelocity = 15 * chargeProgress;
    // Launch angle: base 30° + camera vertical (clamped so it stays reasonable)
    const angle = Math.max(0.1, Math.PI / 6 + cameraVertical * 0.5);
    const maxTime = (2 * initialVelocity * Math.sin(angle)) / gravity + 0.5;

    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * maxTime;
      const x = initialVelocity * Math.cos(angle) * t;
      const y = initialVelocity * Math.sin(angle) * t - 0.5 * gravity * t * t;
      if (origin.y + y < 0) break;

      const vec = direction.clone().multiplyScalar(x);
      pts.push(
        new THREE.Vector3(origin.x + vec.x, origin.y + y, origin.z + vec.z),
      );
    }
    return pts;
  }, [origin, direction, chargeProgress, isVisible, cameraVertical]);

  if (points.length === 0) return null;

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
