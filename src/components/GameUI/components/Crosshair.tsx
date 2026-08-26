import * as React from "react";

interface Props {
  mousePos: { x: number; y: number };
  crosshairSpread: number;
  hitMarker: boolean;
  hitRingKey: number;
  isGallery: boolean;
  isMobile?: boolean;
}

const Crosshair: React.FC<Props> = ({
  mousePos,
  crosshairSpread,
  hitMarker,
  hitRingKey,
  isGallery,
  isMobile = false,
}) => {
  const hitColor = isGallery ? "#ffd700" : "rgba(255,60,60,1)";
  const barColor = hitMarker ? hitColor : "rgba(255,255,255,0.9)";
  // Larger crosshair on mobile for better visibility at arm's length
  const baseSize = isMobile ? 36 : 20;
  const baseArm = isMobile ? 11 : 6;
  const barThick = isMobile ? 3 : 2;
  const size = baseSize + crosshairSpread * 2;
  const armLen = baseArm + crosshairSpread;
  const halfThick = barThick / 2;

  // On mobile fire always aims from center; anchor crosshair there regardless of mousePos
  const cx = isMobile ? window.innerWidth / 2 : mousePos.x;
  const cy = isMobile ? window.innerHeight / 2 : mousePos.y;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate(${cx}px, ${cy}px) translate(-50%, -50%)`,
        pointerEvents: "none",
        zIndex: 997,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Left arm */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: `${armLen}px`,
          height: `${barThick}px`,
          marginTop: `-${halfThick}px`,
          backgroundColor: barColor,
          transition: "background-color 0.05s",
          borderRadius: `${barThick}px`,
        }}
      />
      {/* Right arm */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 0,
          width: `${armLen}px`,
          height: `${barThick}px`,
          marginTop: `-${halfThick}px`,
          backgroundColor: barColor,
          transition: "background-color 0.05s",
          borderRadius: `${barThick}px`,
        }}
      />
      {/* Top arm */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: `${barThick}px`,
          height: `${armLen}px`,
          marginLeft: `-${halfThick}px`,
          backgroundColor: barColor,
          transition: "background-color 0.05s",
          borderRadius: `${barThick}px`,
        }}
      />
      {/* Bottom arm */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: `${barThick}px`,
          height: `${armLen}px`,
          marginLeft: `-${halfThick}px`,
          backgroundColor: barColor,
          transition: "background-color 0.05s",
          borderRadius: `${barThick}px`,
        }}
      />
      {/* Center dot — mobile only for precision reference */}
      {isMobile && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "5px",
            height: "5px",
            marginTop: "-2.5px",
            marginLeft: "-2.5px",
            backgroundColor: barColor,
            borderRadius: "50%",
          }}
        />
      )}
      {/* Hit ring flash */}
      {hitRingKey > 0 && (
        <div
          key={hitRingKey}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            borderRadius: "50%",
            border: `2px solid ${hitColor}`,
            transform: "translate(-50%, -50%)",
            animation: "hitRingExpand 0.28s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export default Crosshair;
