import { useState, useEffect, useRef } from "react";
import {
  W,
  A,
  S,
  D,
  Q,
  E,
  SHIFT,
  SPACE,
  KEY_1,
  KEY_2,
} from "../../components/utils";

export type KeyMap = { [key: string]: boolean };

/**
 * Hook for managing keyboard input state
 * Handles keydown/keyup events and prevents input when chat is active
 */
export const useKeyboardControls = (
  chatVisible: boolean,
  isPaused: boolean,
) => {
  const [keysPressed, setKeysPressed] = useState<KeyMap>({
    [W]: false,
    [A]: false,
    [S]: false,
    [D]: false,
    [Q]: false,
    [E]: false,
    [SHIFT]: false,
    [SPACE]: false,
    [KEY_1]: false,
    [KEY_2]: false,
  });

  const keysPressedRef = useRef(keysPressed);

  // Keep ref in sync with state
  useEffect(() => {
    keysPressedRef.current = keysPressed;
  }, [keysPressed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't process keys if chat is open or game is paused
      if (chatVisible || isPaused) return;

      const key = e.key.toLowerCase();
      if (key in keysPressed) {
        setKeysPressed((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keysPressed) {
        setKeysPressed((prev) => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [chatVisible, isPaused, keysPressed]);

  return { keysPressed, keysPressedRef };
};
