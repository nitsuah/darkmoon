import * as React from "react";

interface PlayerJetpackProps {
  /** Whether jetpack flame should be visible */
  showJetpackFlame: boolean;
  /** Set jetpack flame visibility */
  setShowJetpackFlame: (show: boolean) => void;
  /** Jetpack active state ref */
  jetpackActiveRef: React.RefObject<boolean>;
  /** Jump hold time ref */
  jumpHoldTimeRef: React.RefObject<number>;
  /** Jetpack constants from physics */
  jetpackConstants: {
    JETPACK_MAX_HOLD_TIME: number;
    JETPACK_HOLD_FORCE: number;
    JETPACK_INITIAL_BOOST: number;
    GROUND_Y: number;
  };
  /** Trigger for player tagged events */
  setPlayerTaggedRef: React.RefObject<() => void>;
}

export const PlayerJetpack = React.memo((props: PlayerJetpackProps) => {
  const {
    showJetpackFlame,
    setShowJetpackFlame,
    jetpackActiveRef,
    jumpHoldTimeRef,
    jetpackConstants,
    setPlayerTaggedRef,
  } = props;

  // Track jetpack thrust time
  React.useEffect(() => {
    if (!jetpackActiveRef.current || !showJetpackFlame) return;

    const interval = setInterval(() => {
      if (
        !jetpackActiveRef.current ||
        jumpHoldTimeRef.current >= jetpackConstants.JETPACK_MAX_HOLD_TIME
      ) {
        clearInterval(interval);
        return;
      }

      // Decay thrust multiplier for visual effects
      const thrustMultiplier =
        1 -
        (jumpHoldTimeRef.current / jetpackConstants.JETPACK_MAX_HOLD_TIME) *
          0.3;

      // Throttle jetpack VFX based on thrust level
      const flameIntensity = thrustMultiplier;
      if (showJetpackFlame) {
        const newShowJetpackFlame = flameIntensity > 0.5;
        if (newShowJetpackFlame !== showJetpackFlame) {
          setShowJetpackFlame(newShowJetpackFlame);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    jetpackActiveRef,
    showJetpackFlame,
    jumpHoldTimeRef,
    jetpackConstants.JETPACK_MAX_HOLD_TIME,
    setShowJetpackFlame,
  ]);

  // Listen for player-tagged events to handle player behavior
  React.useEffect(() => {
    function handlePlayerTagged() {
      if (setPlayerTaggedRef?.current) {
        setPlayerTaggedRef.current();
      }
    }
    window.addEventListener("player-tagged-by-bot", handlePlayerTagged);
    return () =>
      window.removeEventListener("player-tagged-by-bot", handlePlayerTagged);
  }, [setPlayerTaggedRef, setShowJetpackFlame]);

  return null;
});

PlayerJetpack.displayName = "PlayerJetpack";
