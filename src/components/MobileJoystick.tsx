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
  const pointerIdRef = useRef<number | null>(null);

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
    pointerIdRef.current = null;
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    pointerIdRef.current = null;
    // Prevent browser gestures (scroll/zoom) interfering with joystick
    try {
      base.style.touchAction = "none";
    } catch (err) {
      void err;
    }
    const touchStartHandler = (e: globalThis.TouchEvent) => {
      // Fallback for older devices without pointer events
      e.preventDefault();
      e.stopPropagation();

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
        pointerIdRef.current = touch.identifier;
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
        (t) => t.identifier === pointerIdRef.current
      );
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const touchEndHandler = (e: globalThis.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const stillActive = Array.from(e.touches).some(
        (t) => t.identifier === pointerIdRef.current
      );
      if (!stillActive) {
        pointerIdRef.current = null;
        handleEnd();
      }
    };

    // Pointer events provide unified handling on many devices (including some Android and Windows touchscreens)
    const pointerDownHandler = (e: globalThis.PointerEvent) => {
      // Prefer pointer events for unified handling (mouse, touch, pen)
      if (!base) return;
      if (e.isPrimary === false) return;
      try {
        base.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore if pointer capture not supported
      }

      e.preventDefault();
      e.stopPropagation();

      pointerIdRef.current = e.pointerId;
      base.classList.add("active");
      activeRef.current = true;
      handleMove(e.clientX, e.clientY);
    };

    const pointerMoveHandler = (e: globalThis.PointerEvent) => {
      if (!activeRef.current) return;
      handleMove(e.clientX, e.clientY);
    };

    const pointerUpHandler = (e: globalThis.PointerEvent) => {
      if (pointerIdRef.current === e.pointerId) {
        try {
          base.releasePointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
        pointerIdRef.current = null;
        handleEnd();
      }
    };

    // Prefer pointer events where supported
    // Use strongly typed listeners where possible
    const touchOptions: globalThis.AddEventListenerOptions = { passive: false };

    if (window.PointerEvent) {
      base.addEventListener(
        "pointerdown",
        pointerDownHandler as globalThis.EventListener
      );

      // pointermove/pointerup normally delivered to element when pointer capture is used.
      // Some devices/browsers don't support pointer capture; add window-level fallbacks.
      base.addEventListener(
        "pointermove",
        pointerMoveHandler as globalThis.EventListener
      );
      base.addEventListener(
        "pointerup",
        pointerUpHandler as globalThis.EventListener
      );
      base.addEventListener(
        "pointercancel",
        pointerUpHandler as globalThis.EventListener
      );

      // Fallbacks on window so movement/ups are tracked even when pointer leaves base
      window.addEventListener(
        "pointermove",
        pointerMoveHandler as globalThis.EventListener
      );
      window.addEventListener(
        "pointerup",
        pointerUpHandler as globalThis.EventListener
      );
      window.addEventListener(
        "pointercancel",
        pointerUpHandler as globalThis.EventListener
      );
    }

    // Touch fallback for older browsers (iOS Safari, older Android)
    base.addEventListener(
      "touchstart",
      touchStartHandler as globalThis.EventListener,
      touchOptions
    );
    // Track touch moves/ends on window to ensure we receive events when finger moves off the base
    window.addEventListener(
      "touchmove",
      touchMoveHandler as globalThis.EventListener,
      touchOptions
    );
    window.addEventListener(
      "touchend",
      touchEndHandler as globalThis.EventListener,
      touchOptions
    );
    window.addEventListener(
      "touchcancel",
      touchEndHandler as globalThis.EventListener,
      touchOptions
    );

    // Cleanup on unmount
    return () => {
      if (window.PointerEvent) {
        base.removeEventListener(
          "pointerdown",
          pointerDownHandler as globalThis.EventListener
        );
        base.removeEventListener(
          "pointermove",
          pointerMoveHandler as globalThis.EventListener
        );
        base.removeEventListener(
          "pointerup",
          pointerUpHandler as globalThis.EventListener
        );
        base.removeEventListener(
          "pointercancel",
          pointerUpHandler as globalThis.EventListener
        );

        window.removeEventListener(
          "pointermove",
          pointerMoveHandler as globalThis.EventListener
        );
        window.removeEventListener(
          "pointerup",
          pointerUpHandler as globalThis.EventListener
        );
        window.removeEventListener(
          "pointercancel",
          pointerUpHandler as globalThis.EventListener
        );
      }

      base.removeEventListener(
        "touchstart",
        touchStartHandler as globalThis.EventListener
      );
      window.removeEventListener(
        "touchmove",
        touchMoveHandler as globalThis.EventListener
      );
      window.removeEventListener(
        "touchend",
        touchEndHandler as globalThis.EventListener
      );
      window.removeEventListener(
        "touchcancel",
        touchEndHandler as globalThis.EventListener
      );
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
