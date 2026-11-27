import * as React from "react";
import { GameState } from "../../GameManager";

const VISIBLE_MS = 5000;

function objective(gameState: GameState): string | null {
  switch (gameState.mode) {
    case "deathmatch":
      return `Goal: first to ${gameState.killLimit ?? 10} kills wins`;
    case "ctf":
      return "Goal: take the enemy flag back to your base";
    case "tag":
      return "Goal: fire your laser to pass IT on";
    case "shooting_gallery":
      return "Goal: look around for targets and hit them before time runs out";
    default:
      return null;
  }
}

/** The round's goal, shown for a few seconds when it starts. */
const ObjectiveBanner: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const id = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, []);
  const text = objective(gameState);
  if (!visible || !text) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "90vw",
        padding: "8px 14px",
        background: "rgba(0,0,0,0.75)",
        borderRadius: "6px",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: "14px",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 997,
      }}
    >
      {text}
    </div>
  );
};

export default ObjectiveBanner;
