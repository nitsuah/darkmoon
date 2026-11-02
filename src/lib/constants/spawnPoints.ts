/** Spread spawn points for deathmatch/CTF — avoids center, mid-field crates, and corner bunkers. */
export const SPAWN_POINTS: [number, number, number][] = [
  [-12, 0.5, 0],
  [12, 0.5, 0],
  [0, 0.5, -12],
  [0, 0.5, 12],
  [-10, 0.5, 10],
  [10, 0.5, 10],
  [-10, 0.5, -10],
  [10, 0.5, -10],
];

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

/**
 * Pick the spawn point farthest from all given enemy positions.
 * Falls back to a random point if no enemies are provided.
 */
export function pickSafeSpawn(
  enemyPositions: [number, number, number][],
): [number, number, number] {
  if (enemyPositions.length === 0) {
    return SPAWN_POINTS[Math.floor(secureRandom() * SPAWN_POINTS.length)];
  }
  let best = SPAWN_POINTS[0];
  let bestMinDist = -1;
  for (const pt of SPAWN_POINTS) {
    const minDist = Math.min(
      ...enemyPositions.map(([ex, , ez]) => Math.hypot(pt[0] - ex, pt[2] - ez)),
    );
    if (minDist > bestMinDist) {
      bestMinDist = minDist;
      best = pt;
    }
  }
  return best;
}
