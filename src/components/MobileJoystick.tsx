import React, { useRef, useCallback, useEffect } from "react";
import "../styles/MobileJoystick.css";

interface JoystickProps {
  side: "left" | "right";
  label: string;
  onMove: (x: number, y: number) => void;
}

export const MobileJoystick: React.FC<JoystickProps> = ({
  side,
  label,
  onMove,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);

  const maxDistance = 50; // Max distance knob can move from center

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current || !knobRef.current) return;

      const baseRect = baseRef.current.getBoundingClientRect();
      const baseCenterX = baseRect.left + baseRect.width / 2;
      const baseCenterY = baseRect.top + baseRect.height / 2;

      let deltaX = clientX - baseCenterX;
      let deltaY = clientY - baseCenterY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        deltaX = Math.cos(angle) * maxDistance;
        deltaY = Math.sin(angle) * maxDistance;
      }

      knobRef.current.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

      const normalizedX = deltaX / maxDistance;
      const normalizedY = deltaY / maxDistance;
      onMove(normalizedX, normalizedY);
    },
    [maxDistance, onMove]
  );

  const handleEnd = useCallback(() => {
    if (!knobRef.current || !baseRef.current) return;

    knobRef.current.style.transform = "translate(-50%, -50%)";
    baseRef.current.classList.remove("active");
    activeRef.current = false;
    touchIdRef.current = null;
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    // Debug positioning on mount (development only)
    if (import.meta.env.DEV) {
      const rect = base.getBoundingClientRect();
      const computed = window.getComputedStyle(base.parentElement!);
      console.log(`[JOYSTICK ${side}] Mounted at:`, {
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
        },
        computed: {
          position: computed.position,
          top: computed.top,
          bottom: computed.bottom,
          left: computed.left,
          right: computed.right,
        },
      });
    }

    // Use native events with passive: false to allow preventDefault
    const touchStartHandler = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Find first touch that's within this joystick's bounds
      const rect = base.getBoundingClientRect();
      const touch = Array.from(e.touches).find((t) => {
        return (
          t.clientX >= rect.left &&
          t.clientX <= rect.right &&
          t.clientY >= rect.top &&
          t.clientY <= rect.bottom
        );
      });

      if (touch) {
        console.log(`[JOYSTICK ${side}] Touch start detected`);
        touchIdRef.current = touch.identifier;
        base.classList.add("active");
        activeRef.current = true;
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const touchMoveHandler = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeRef.current) return;

      const touch = Array.from(e.touches).find(
        (t) => t.identifier === touchIdRef.current
      );
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const touchEndHandler = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touchEnded = !Array.from(e.touches).some(
        (t) => t.identifier === touchIdRef.current
      );
      if (touchEnded) {
        console.log(`[JOYSTICK ${side}] Touch end detected`);
        handleEnd();
      }
    };

    base.addEventListener("touchstart", touchStartHandler, { passive: false });
    base.addEventListener("touchmove", touchMoveHandler, { passive: false });
    base.addEventListener("touchend", touchEndHandler, { passive: false });
    base.addEventListener("touchcancel", touchEndHandler, { passive: false });

    // Cleanup on unmount
    return () => {
      base.removeEventListener("touchstart", touchStartHandler);
      base.removeEventListener("touchmove", touchMoveHandler);
      base.removeEventListener("touchend", touchEndHandler);
      base.removeEventListener("touchcancel", touchEndHandler);
      if (activeRef.current) {
        handleEnd();
      }
    };
  }, [handleEnd, handleMove, side]);

  return (
    <div className={`joystick-container ${side}`}>
      <div className="joystick-label">{label}</div>
      <div ref={baseRef} className="joystick-base">
        <div ref={knobRef} className="joystick-knob" />
      </div>
    </div>
  );
};
