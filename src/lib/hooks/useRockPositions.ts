import { useState } from "react";

/**
 * Secure random utility for game mechanics (non-cryptographic).
 * Uses crypto.getRandomValues() to avoid CodeQL insecure-randomness alerts.
 * These are for gameplay randomness only, not security-sensitive operations.
 */
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0x100000000;
}

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
      x: (secureRandom() - 0.5) * 80,
      z: (secureRandom() - 0.5) * 80,
      size: 0.5 + secureRandom() * 1.5,
      height: 0.3 + secureRandom() * 0.7,
    })),
  );

  return positions;
};
