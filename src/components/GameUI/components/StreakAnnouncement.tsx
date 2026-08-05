import * as React from "react";
import { STREAK_LABELS } from "../../gameModes/DeathmatchMode";
import { TAG_STREAK_LABELS } from "../../gameModes/TagMode";
import type { GameMode } from "../../GameManager";

interface Props {
  visibleStreak: { killerName: string; count: number } | null;
  mode: GameMode;
  isMinimal: boolean;
}

const StreakAnnouncement: React.FC<Props> = ({
  visibleStreak,
  mode,
  isMinimal,
}) => {
  if (
    visibleStreak === null ||
    (mode !== "deathmatch" && mode !== "ctf" && mode !== "tag")
  ) {
    return null;
  }

  const label =
    mode === "tag"
      ? (TAG_STREAK_LABELS[visibleStreak.count] ??
        `${visibleStreak.count}x CHAIN`)
      : (STREAK_LABELS[visibleStreak.count] ??
        `${visibleStreak.count}x STREAK`);

  const color = mode === "tag" ? "#00ffff" : "#ffcc00";
  const shadow =
    mode === "tag"
      ? "0 0 18px #0088ff, 0 0 6px #00ffff"
      : "0 0 18px #ff8800, 0 0 6px #ffcc00";

  return (
    <div
      style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 995,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "14px" : "26px",
          fontWeight: "bold",
          color,
          textShadow: shadow,
          letterSpacing: "3px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "10px" : "14px",
          color: "#ffeeaa",
          marginTop: "4px",
        }}
      >
        {visibleStreak.killerName}
      </div>
    </div>
  );
};

export default StreakAnnouncement;
