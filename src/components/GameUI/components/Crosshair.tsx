import * as React from "react";

interface Props {
  mousePos: { x: number; y: number };
  crosshairSpread: number;
  hitMarker: boolean;
  hitRingKey: number;
  isGallery: boolean;
}

const Crosshair: React.FC<Props> = ({
  mousePos,
  crosshairSpread,
  hitMarker,
  hitRingKey,
  isGallery,
}) => {
  const hitColor = isGallery ? "#ffd700" : "rgba(255,60,60,1)";
  const barColor = hitMarker ? hitColor : "rgba(255,255,255,0.85)";
  const size = 20 + crosshairSpread * 2;
  const armLen = 6 + crosshairSpread;

  return (
    <div
      style={{
        position: "fixed",
        top: mousePos.y,
        left: mousePos.x,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 997,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: `${armLen}px`,
          height: "2px",
          marginTop: "-1px",
          backgroundColor: barColor,
          transition: "background-color 0.05s",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 0,
          width: `${armLen}px`,
          height: "2px",
          marginTop: "-1px",
          backgroundColor: barColor,
          transition: "background-color 0.05s",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: "2px",
          height: `${armLen}px`,
          marginLeft: "-1px",
          backgroundColor: barColor,
          transition: "background-color 0.05s",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: "2px",
          height: `${armLen}px`,
          marginLeft: "-1px",
          backgroundColor: barColor,
          transition: "background-color 0.05s",
        }}
      />
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
