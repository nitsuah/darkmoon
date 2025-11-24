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

    // Use native events with passive: false to allow preventDefault
    const touchStartHandler = (e: globalThis.TouchEvent) => {
      // Non-fatal debug log - helps during device testing without polluting production logs
      try {
        console.debug("MobileJoystick touchstart", {
          side,
          touches: e.touches.length,
        });
      } catch {
        /* ignore */
      }

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
        handleEnd();
      }
    };

    // Pointer events provide unified handling on many devices (including some Android and Windows touchscreens)
    const pointerDownHandler = (e: globalThis.PointerEvent) => {
      try {
        console.debug("MobileJoystick pointerdown", {
          side,
          pointerType: e.pointerType,
        });
      } catch {
        /* ignore */
      }

      // Only handle primary pointers
      if (e.isPrimary === false) return;
      e.preventDefault?.();
      e.stopPropagation?.();

      touchIdRef.current = e.pointerId;
      base.classList.add("active");
      activeRef.current = true;
      handleMove(e.clientX, e.clientY);
    };

    const pointerMoveHandler = (e: globalThis.PointerEvent) => {
      if (!activeRef.current) return;
      handleMove(e.clientX, e.clientY);
    };

    const pointerUpHandler = (e: globalThis.PointerEvent) => {
      const ended = touchIdRef.current === e.pointerId;
      if (ended) handleEnd();
    };

    base.addEventListener("touchstart", touchStartHandler, { passive: false });
    base.addEventListener("touchmove", touchMoveHandler, { passive: false });
    base.addEventListener("touchend", touchEndHandler, { passive: false });
    base.addEventListener("touchcancel", touchEndHandler, { passive: false });

    base.addEventListener("pointerdown", pointerDownHandler);
    base.addEventListener("pointermove", pointerMoveHandler);
    base.addEventListener("pointerup", pointerUpHandler);
    base.addEventListener("pointercancel", pointerUpHandler);

    // Cleanup on unmount
    return () => {
      base.removeEventListener("touchstart", touchStartHandler);
      base.removeEventListener("touchmove", touchMoveHandler);
      base.removeEventListener("touchend", touchEndHandler);
      base.removeEventListener("touchcancel", touchEndHandler);

      base.removeEventListener("pointerdown", pointerDownHandler);
      base.removeEventListener("pointermove", pointerMoveHandler);
      base.removeEventListener("pointerup", pointerUpHandler);
      base.removeEventListener("pointercancel", pointerUpHandler);
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
