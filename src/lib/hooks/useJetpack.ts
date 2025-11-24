/**
 * Small pure helper utilities for jetpack behavior.
 * This keeps calculations testable and lets PlayerCharacter migrate logic
 * incrementally without changing large files immediately.
 */
export interface JetpackConstants {
  JETPACK_MAX_HOLD_TIME: number;
  JETPACK_HOLD_FORCE: number;
}

/**
 * Compute the thrust delta to apply during a jetpack hold tick.
 * Mirrors the in-game formula used in PlayerCharacter: a decaying thrust multiplier
 * that reduces thrust by up to 30% over the hold duration.
 */
export function computeJetpackThrust(
  holdTime: number,
  delta: number,
  constants: JetpackConstants
): number {
  if (holdTime >= constants.JETPACK_MAX_HOLD_TIME) return 0;
  const thrustMultiplier =
    1 - (holdTime / constants.JETPACK_MAX_HOLD_TIME) * 0.3;
  return constants.JETPACK_HOLD_FORCE * delta * thrustMultiplier;
}

/**
 * Simple predicate to decide whether a mobile double-tap triggered jetpack
 * activation. Kept tiny so it can be tested and replaced with more complex
 * throttling logic later.
 */
export function shouldActivateJetpackFromMobile(
  mobileDoubleTap: boolean
): boolean {
  return !!mobileDoubleTap;
}

export default function useJetpack() {
  return { computeJetpackThrust, shouldActivateJetpackFromMobile };
}
