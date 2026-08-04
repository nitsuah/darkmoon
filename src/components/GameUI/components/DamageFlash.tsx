import * as React from "react";

interface Props {
  active: boolean;
}

const DamageFlash: React.FC<Props> = ({ active }) => {
  if (!active) return null;
  return (
    <>
      <style>{`
        @keyframes darkmoon-damage-flash {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(200,0,0,0.7) 100%)",
          animation: "darkmoon-damage-flash 0.5s ease-out forwards",
          zIndex: 998,
        }}
      />
    </>
  );
};

export default DamageFlash;
