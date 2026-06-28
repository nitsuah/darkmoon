import * as React from "react";
import { Button } from "./21st.dev/Button";
import "../styles/Button.css";

interface PauseMenuProps {
  isVisible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({
  isVisible,
  onResume,
  onRestart,
  onQuit,
}) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "12px",
          padding: "30px 40px",
          minWidth: "300px",
          textAlign: "center",
          color: "white",
          fontFamily: "monospace",
        }}
      >
        <h2
          style={{
            margin: "0 0 20px 0",
            fontSize: "28px",
            fontWeight: "bold",
            color: "#ffffff",
          }}
        >
          ⏸️ PAUSED
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <Button onClick={onResume} variant="primary" size="large">
            ▶️ Resume
          </Button>

          <Button onClick={onRestart} variant="warning" size="large">
            🔄 Restart
          </Button>

          <Button onClick={onQuit} variant="danger" size="large">
            🚪 Quit to Menu
          </Button>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#888",
          }}
        >
          Press ESC to resume
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
