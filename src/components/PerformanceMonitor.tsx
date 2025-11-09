import React, { useState, useEffect, useRef } from "react";

interface PerformanceMonitorProps {
  onPerformanceChange?: (fps: number) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onPerformanceChange,
}) => {
  const [fps, setFps] = useState<number>(60);
  const [textMode, setTextMode] = useState<boolean>(true); // Toggle between text and icon mode
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(60);
  const lastUpdateTimeRef = useRef<number>(0);
  const onPerformanceChangeRef = useRef(onPerformanceChange);

  // Keep callback ref up to date
  useEffect(() => {
    onPerformanceChangeRef.current = onPerformanceChange;
  }, [onPerformanceChange]);

  useEffect(() => {
    lastFrameTimeRef.current = window.performance.now();
    lastUpdateTimeRef.current = window.performance.now();

    const measureFrame = () => {
      const now = window.performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Store frame times (keep last 60 frames)
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS every 30 frames
      if (frameTimesRef.current.length >= 30) {
        const avgDelta =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        currentFpsRef.current = Math.round(1000 / avgDelta);
      }

      rafIdRef.current = window.requestAnimationFrame(measureFrame);
    };

    // Update state only once per second to avoid re-render spam
    const updateInterval = setInterval(() => {
      setFps(currentFpsRef.current);
      if (onPerformanceChangeRef.current) {
        onPerformanceChangeRef.current(currentFpsRef.current);
      }
    }, 1000);

    rafIdRef.current = window.requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(updateInterval);
    };
  }, []); // Empty dependency array - use ref for callback

  const getFPSColor = () => {
    if (fps >= 50) return "#00ff00"; // Green
    if (fps >= 30) return "#ffaa00"; // Orange
    return "#ff0000"; // Red
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setTextMode(!textMode)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setTextMode(!textMode);
        }
      }}
      style={{
        position: "fixed",
        bottom: "10px", // Lower left corner
        left: "10px", // Changed from right to left
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: getFPSColor(),
        padding: "8px 12px",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontSize: "14px",
        zIndex: 9999,
        userSelect: "none",
        cursor: "pointer",
      }}
      title={
        textMode
          ? "Click to switch to icon mode"
          : "Click to switch to text mode"
      }
    >
      {textMode ? `FPS: ${fps}` : `📊 ${fps}`}
    </div>
  );
};

export default PerformanceMonitor;
