import { useState } from "react";

export interface RockPosition {
  x: number;
  z: number;
  size: number;
  height: number;
}

/**
 * Hook for generating stable rock positions
 * Generates once on mount to prevent respawning every frame
 */
export const useRockPositions = (count: number = 25): RockPosition[] => {
  // Use useState with initializer function to generate positions only once
  // This satisfies React purity rules since initializer runs outside render
  const [positions] = useState(() =>
    [...Array(count)].map(() => ({
      x: (Math.random() - 0.5) * 80,
      z: (Math.random() - 0.5) * 80,
      size: 0.5 + Math.random() * 1.5,
      height: 0.3 + Math.random() * 0.7,
    }))
  );

  return positions;
};
