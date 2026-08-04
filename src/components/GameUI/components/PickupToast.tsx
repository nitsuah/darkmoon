import * as React from "react";

interface Props {
  toast: string | null;
}

const PickupToast: React.FC<Props> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 1002,
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: "13px",
        fontWeight: "bold",
        color: "#00ffcc",
        textShadow: "0 0 8px #00ffcc88",
        backgroundColor: "rgba(0,0,0,0.6)",
        border: "1px solid rgba(0,255,200,0.4)",
        borderRadius: "4px",
        padding: "3px 10px",
      }}
    >
      {toast}
    </div>
  );
};

export default PickupToast;
