import * as React from "react";

interface Props {
  hitAngle: number | null;
}

const HitDirectionIndicator: React.FC<Props> = ({ hitAngle }) => {
  if (hitAngle === null) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 997,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "220px",
          height: "220px",
          position: "relative",
          transform: `rotate(${hitAngle}rad)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "36px",
            height: "36px",
            background:
              "radial-gradient(ellipse at center top, rgba(255,40,40,0.95) 0%, rgba(255,40,40,0) 70%)",
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            filter: "drop-shadow(0 0 6px #ff2222)",
          }}
        />
      </div>
    </div>
  );
};

export default HitDirectionIndicator;
