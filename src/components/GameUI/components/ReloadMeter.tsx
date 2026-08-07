import * as React from "react";

const PERFECT_MIN = 0.38;
const PERFECT_MAX = 0.62;
// Time for needle to sweep one full traversal (0→1 or 1→0), in ms
const NEEDLE_HALF_PERIOD_MS = 700;

interface ReloadMeterProps {
  isReloading: boolean;
  reloadPct: number;
}

export const ReloadMeter: React.FC<ReloadMeterProps> = ({
  isReloading,
  reloadPct,
}) => {
  const needleRef = React.useRef(0);
  const dirRef = React.useRef(1);
  const lastTimeRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const snapFiredRef = React.useRef(false);
  const [displayNeedle, setDisplayNeedle] = React.useState(0);
  const [flashPerfect, setFlashPerfect] = React.useState(false);
  const [flashMiss, setFlashMiss] = React.useState(false);

  React.useEffect(() => {
    if (!isReloading) {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      needleRef.current = 0;
      dirRef.current = 1;
      lastTimeRef.current = null;
      setDisplayNeedle(0);
      setFlashPerfect(false);
      setFlashMiss(false);
      return;
    }

    const step = (ts: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      const speed = (1 / NEEDLE_HALF_PERIOD_MS) * dt;
      needleRef.current += dirRef.current * speed;
      if (needleRef.current >= 1) {
        needleRef.current = 1;
        dirRef.current = -1;
      } else if (needleRef.current <= 0) {
        needleRef.current = 0;
        dirRef.current = 1;
      }
      setDisplayNeedle(needleRef.current);
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [isReloading]);

  React.useEffect(() => {
    snapFiredRef.current = false;
  }, [isReloading]);

  React.useEffect(() => {
    const handler = () => {
      if (!isReloading || snapFiredRef.current) return;
      const n = needleRef.current;
      if (n >= PERFECT_MIN && n <= PERFECT_MAX) {
        snapFiredRef.current = true;
        window.dispatchEvent(new CustomEvent("weapon-reload-perfect"));
        setFlashPerfect(true);
        setTimeout(() => setFlashPerfect(false), 700);
      } else {
        setFlashMiss(true);
        setTimeout(() => setFlashMiss(false), 400);
      }
    };
    window.addEventListener("weapon-reload-snap", handler);
    return () => window.removeEventListener("weapon-reload-snap", handler);
  }, [isReloading]);

  if (!isReloading) return null;

  const labelColor = flashPerfect
    ? "#44ff88"
    : flashMiss
      ? "#ff4444"
      : "#ffcc00";
  const labelText = flashPerfect
    ? "⚡ PERFECT!"
    : flashMiss
      ? "× MISS"
      : "RELOADING — press R";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "88px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "5px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        style={{
          color: labelColor,
          fontSize: "11px",
          letterSpacing: "2px",
          fontFamily: "monospace",
          textTransform: "uppercase",
          transition: "color 0.1s",
        }}
      >
        {labelText}
      </span>

      {/* Needle bar */}
      <div
        style={{
          width: "200px",
          height: "20px",
          background: "#0d0d0d",
          borderRadius: "3px",
          border: `1px solid ${flashPerfect ? "#44ff88" : "#333"}`,
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}
      >
        {/* Perfect zone */}
        <div
          style={{
            position: "absolute",
            left: `${PERFECT_MIN * 100}%`,
            width: `${(PERFECT_MAX - PERFECT_MIN) * 100}%`,
            height: "100%",
            background: flashPerfect
              ? "rgba(68, 255, 136, 0.4)"
              : "rgba(255, 204, 0, 0.18)",
            borderLeft: "1px solid rgba(255, 204, 0, 0.45)",
            borderRight: "1px solid rgba(255, 204, 0, 0.45)",
            transition: "background 0.1s",
          }}
        />
        {/* Needle */}
        <div
          style={{
            position: "absolute",
            left: `calc(${displayNeedle * 100}% - 2px)`,
            width: "4px",
            height: "100%",
            background: flashPerfect ? "#44ff88" : "#ffffff",
            borderRadius: "1px",
            boxShadow: flashPerfect
              ? "0 0 8px #44ff88"
              : "0 0 4px rgba(255,255,255,0.7)",
            transition: "background 0.1s",
          }}
        />
      </div>

      {/* Reload progress bar below */}
      <div
        style={{
          width: "200px",
          height: "3px",
          background: "#1a1a1a",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(1, reloadPct) * 100}%`,
            height: "100%",
            background: "#555",
            transition: "width 0.05s linear",
          }}
        />
      </div>
    </div>
  );
};

export default ReloadMeter;
