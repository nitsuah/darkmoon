import * as React from "react";
import { KillEvent } from "../../GameManager";
import { WEAPONS } from "../../combat/WeaponManager";

interface Props {
  kills: KillEvent[];
}

const KillFeed: React.FC<Props> = ({ kills }) => {
  if (kills.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "60px",
        left: "10px",
        fontFamily: "monospace",
        fontSize: "11px",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {kills.map((k) => (
        <div
          key={`${k.killerId}-${k.timestamp}`}
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "3px",
            padding: "2px 6px",
            marginBottom: "2px",
            color: "#ffdd88",
          }}
        >
          {k.weaponId === "tag" ? (
            <>
              🏃 {k.killerName} <span style={{ color: "#aaaaaa" }}>tagged</span>{" "}
              {k.targetName}
            </>
          ) : (
            <>
              💀 {k.killerName}{" "}
              <span style={{ color: "#aaaaaa" }}>
                [{WEAPONS[k.weaponId]?.name ?? k.weaponId}]
              </span>{" "}
              → {k.targetName}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default KillFeed;
