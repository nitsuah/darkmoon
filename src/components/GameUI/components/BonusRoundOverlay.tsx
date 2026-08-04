import * as React from "react";

interface Props {
  visible: boolean;
  isMinimal: boolean;
}

const BonusRoundOverlay: React.FC<Props> = ({ visible, isMinimal }) => {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "28%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 996,
        textAlign: "center",
        animation: "bonusRoundPop 0.35s cubic-bezier(0.17, 0.89, 0.32, 1.28)",
      }}
    >
      <style>{`@keyframes bonusRoundPop { from { transform: translateX(-50%) scale(0.4); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }`}</style>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "18px" : "30px",
          fontWeight: "bold",
          color: "#ff44ff",
          textShadow: "0 0 20px #ff00ff, 0 0 40px #aa00aa",
          letterSpacing: "3px",
        }}
      >
        ⚡ BONUS ROUND! ⚡
      </div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "11px" : "16px",
          color: "#ffaaff",
          marginTop: "4px",
          textShadow: "0 0 8px #cc00cc",
        }}
      >
        x2 POINTS — GO GO GO!
      </div>
    </div>
  );
};

export default BonusRoundOverlay;
