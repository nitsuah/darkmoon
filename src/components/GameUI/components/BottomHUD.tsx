import * as React from "react";
import { GameMode, Player } from "../../GameManager";
import { WEAPONS } from "../../combat/WeaponManager";

interface Props {
  currentPlayer: Player;
  mode: GameMode;
}

const WEAPON_COLORS: Record<string, string> = {
  rocket: "#ff4422",
  grenade: "#44ff00",
  shotgun: "#ff9933",
  smg: "#ff44cc",
};

const BottomHUD: React.FC<Props> = ({ currentPlayer, mode }) => {
  const hp = currentPlayer.health ?? currentPlayer.maxHealth ?? 100;
  const maxHp = currentPlayer.maxHealth ?? 100;
  const frac = Math.max(0, Math.min(1, hp / maxHp));
  const barColor = frac > 0.5 ? "#44ff44" : frac > 0.25 ? "#ffaa00" : "#ff3333";

  const wId = currentPlayer.equippedWeaponId;
  const wDef = wId ? WEAPONS[wId] : undefined;
  const ammo = currentPlayer.currentAmmo;
  const maxAmmo = wDef?.maxAmmo;
  const reloadPct = currentPlayer.reloadProgress;
  const isReloading =
    reloadPct !== null && reloadPct !== undefined && reloadPct < 1;
  const wColor = (wId && WEAPON_COLORS[wId]) || "#33ffe6";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "14px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontFamily: "monospace",
        fontSize: "11px",
        pointerEvents: "none",
        zIndex: 997,
        backgroundColor: "rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "5px",
        padding: "4px 12px",
      }}
    >
      {mode !== "tag" && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                color: barColor,
                fontWeight: "bold",
                lineHeight: 1,
              }}
            >
              HP {hp}/{maxHp}
            </div>
            <div
              style={{
                width: "80px",
                height: "7px",
                background: "#1a1a1a",
                borderRadius: "2px",
                overflow: "hidden",
                border: "1px solid #333",
              }}
            >
              <div
                style={{
                  width: `${frac * 100}%`,
                  height: "100%",
                  background: barColor,
                  transition: "width 0.15s, background 0.3s",
                }}
              />
            </div>
          </div>
          <span style={{ color: "#444" }}>|</span>
        </>
      )}

      {wId && wDef && (
        <>
          <span style={{ color: wColor }}>{wDef.name}</span>
          {isReloading ? (
            <span style={{ color: "#ffcc00", letterSpacing: "1px" }}>
              {" RELOADING "}
              <span
                style={{
                  color: "#555",
                  display: "inline-block",
                  width: "40px",
                  background: "#222",
                  borderRadius: "2px",
                  verticalAlign: "middle",
                  height: "6px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${((reloadPct ?? 0) * 100).toFixed(0)}%`,
                    background: "#ffcc00",
                    height: "100%",
                  }}
                />
              </span>
            </span>
          ) : (
            <span style={{ color: "#aaaaaa", letterSpacing: "1px" }}>
              {ammo === null || ammo === undefined
                ? "∞"
                : maxAmmo && maxAmmo <= 10
                  ? Array.from({ length: maxAmmo }, (_, i) => (
                      <span
                        key={i}
                        style={{ color: i < ammo ? wColor : "#444" }}
                      >
                        ●
                      </span>
                    ))
                  : `${ammo}`}
            </span>
          )}
          <span style={{ color: "#555", fontSize: "10px" }}>
            {isReloading ? "" : " [R]=reload"}
          </span>
          <span style={{ color: "#555", fontSize: "10px" }}>[1-5]</span>
        </>
      )}
    </div>
  );
};

export default BottomHUD;
