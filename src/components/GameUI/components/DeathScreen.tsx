import * as React from "react";
import { KillEvent } from "../../GameManager";

interface Props {
  respawnSecondsLeft: number | null;
  isMinimal: boolean;
  killFeed: KillEvent[] | undefined;
  currentPlayerId: string;
  mode: string;
}

const DeathScreen: React.FC<Props> = ({
  respawnSecondsLeft,
  isMinimal,
  killFeed,
  currentPlayerId,
  mode,
}) => {
  if (
    respawnSecondsLeft === null ||
    (mode !== "deathmatch" && mode !== "ctf")
  ) {
    return null;
  }

  const lastDeath = [...(killFeed ?? [])]
    .reverse()
    .find((k) => k.targetId === currentPlayerId);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 998,
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "22px" : "38px",
          fontWeight: "bold",
          color: "#ff4444",
          textShadow: "0 0 16px #ff0000",
          letterSpacing: "2px",
        }}
      >
        DOWNED
      </div>
      {lastDeath && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: isMinimal ? "10px" : "14px",
            color: "#ffaaaa",
            marginTop: "4px",
            letterSpacing: "1px",
          }}
        >
          KILLED BY {lastDeath.killerName.toUpperCase()}
        </div>
      )}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: isMinimal ? "14px" : "22px",
          color: "#ffaaaa",
          marginTop: "6px",
        }}
      >
        {respawnSecondsLeft > 0
          ? `RESPAWNING IN ${respawnSecondsLeft}s`
          : "RESPAWNING..."}
      </div>
    </div>
  );
};

export default DeathScreen;
