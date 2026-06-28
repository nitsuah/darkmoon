import React, { useRef, useCallback, useEffect } from "react";
import { Button } from "./Button";
import "../../styles/MobileActionButton.css";

interface MobileActionButtonProps {
  label: string;
  icon?: string;
  onPress: () => void;
  onRelease: () => void;
  onDoubleTap?: () => void;
  position?: "bottom-center" | "bottom-right";
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  label,
  icon,
  onPress,
  onRelease,
  onDoubleTap,
  position = "bottom-center",
}) => {
  const pressedRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const DOUBLE_TAP_WINDOW = 300;

  const handlePress = useCallback(() => {
    if (!pressedRef.current) {
      pressedRef.current = true;

      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;

      if (
        onDoubleTap &&
        timeSinceLastTap < DOUBLE_TAP_WINDOW &&
        timeSinceLastTap > 0
      ) {
        onDoubleTap();
      }

      lastTapTimeRef.current = currentTime;
      onPress();
    }
  }, [onPress, onDoubleTap]);

  const handleRelease = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      onRelease();
    }
  }, [onRelease]);

  useEffect(() => {
    const buttonElement = document.getElementById(
      `mobile-action-button-${label}`,
    );
    if (!buttonElement) return;

    const touchStartHandler = (e: TouchEvent) => {
      e.preventDefault();
      buttonElement.classList.add("pressed");
      handlePress();
    };

    const touchEndHandler = (e: TouchEvent) => {
      e.preventDefault();
      buttonElement.classList.remove("pressed");
      handleRelease();
    };

    buttonElement.addEventListener("touchstart", touchStartHandler, {
      passive: false,
    });
    buttonElement.addEventListener("touchend", touchEndHandler, {
      passive: false,
    });
    buttonElement.addEventListener("touchcancel", touchEndHandler, {
      passive: false,
    });

    return () => {
      buttonElement.removeEventListener("touchstart", touchStartHandler);
      buttonElement.removeEventListener("touchend", touchEndHandler);
      buttonElement.removeEventListener("touchcancel", touchEndHandler);
      if (pressedRef.current) {
        handleRelease();
      }
    };
  }, [handlePress, handleRelease, label]);

  const children = (
    <>
      {icon && <span className="mobile-button-icon">{icon}</span>}
      <span className="mobile-button-label">{label}</span>
    </>
  );

  return (
    <Button
      id={`mobile-action-button-${label}`}
      onClick={() => {
        onPress();
        // Mimic touch-end logic with a small delay
        setTimeout(onRelease, 150);
      }}
      className={`mobile-action-button ${position}`}
      variant="primary"
      size="large"
      disabled={false}
    >
      {children}
    </Button>
  );
};
