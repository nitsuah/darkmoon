import * as React from "react";

interface Props {
  announcement: string | null;
}

const KillAnnouncement: React.FC<Props> = ({ announcement }) => {
  if (!announcement) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "28%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 1002,
        textAlign: "center",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#ffdd00",
          letterSpacing: "2px",
          marginBottom: "2px",
        }}
      >
        YOU KILLED
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: "bold",
          color: "#fff",
          textShadow: "0 0 12px #ff8800, 0 0 4px #ffcc00",
        }}
      >
        {announcement}
      </div>
    </div>
  );
};

export default KillAnnouncement;
