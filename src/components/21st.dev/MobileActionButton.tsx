import React, { useRef, useCallback, useEffect } from "react";
import { Button } from "./Button";
import "../../styles/MobileActionButton.css"; // Specific styles for this component

interface MobileActionButtonProps {
  label: string;
  icon?: string;
  onPress: () => void;
  onRelease: () => void;
  onDoubleTap?: () => void; // Optional double-tap handler
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
  const DOUBLE_TAP_WINDOW = 300; // ms - must match desktop double-jump window

  const handlePress = useCallback(() => {
    if (!pressedRef.current) {
      pressedRef.current = true;

      // Check for double-tap
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;

      if (
        onDoubleTap &&
        timeSinceLastTap < DOUBLE_TAP_WINDOW &&
        timeSinceLastTap > 0
      ) {
        // Double-tap detected!
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

  // Use useEffect to manage touch/pointer event listeners
  // This setup is crucial for responsive and robust mobile interaction
  useEffect(() => {
    const buttonElement = document.getElementById(`mobile-action-button-${label}`);
    if (!buttonElement) return;

    // Use native events with passive: false to allow e.preventDefault()
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

    buttonElement.addEventListener("touchstart", touchStartHandler, { passive: false });
    buttonElement.addEventListener("touchend", touchEndHandler, { passive: false });
    buttonElement.addEventListener("touchcancel", touchEndHandler, { passive: false });

    return () => {
      buttonElement.removeEventListener("touchstart", touchStartHandler);
      buttonElement.removeEventListener("touchend", touchEndHandler);
      buttonElement.removeEventListener("touchcancel", touchEndHandler);
      if (pressedRef.current) {
        handleRelease();
      }
    };
  }, [handlePress, handleRelease, label]);

  // Combine label and icon for the button children
  const children = (
    <>
      {icon && <span className="mobile-button-icon">{icon}</span>}
      <span className="mobile-button-label">{label}</span>
    </>
  );

  return (
    <Button
      id={`mobile-action-button-${label}`}
      onClick={() => {}} // onClick is required by Button, but we'll use touch events
      className={`mobile-action-button ${position}`}
      variant="mobile-action" // Custom variant for mobile action buttons
      size="custom" // Custom size handled by specific mobile styles
      disabled={false} // Mobile action buttons are typically not disabled
    >
      {children}
    </Button>
  );
};