import * as React from "react";
import { GameState, Player } from "../../GameManager";

const MAP_PX = 90;
const ARENA = 50;
const CRATE_POSITIONS: [number, number][] = [
  [0, -8],
  [0, 8],
  [8, 0],
  [-8, 0],
];

function toMapCoord(worldVal: number): number {
  return ((worldVal + ARENA) / (ARENA * 2)) * MAP_PX;
}

interface Props {
  gameState: GameState;
  players: Map<string, Player>;
  currentPlayerId: string;
}

const MinimapRadar: React.FC<Props> = ({
  gameState,
  players,
  currentPlayerId,
}) => {
  const allPlayers = Array.from(players.values());

  return (
    <div
      style={{
        position: "fixed",
        top: "52px",
        right: "10px",
        width: MAP_PX,
        height: MAP_PX,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "4px",
        zIndex: 998,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {CRATE_POSITIONS.map(([wx, wz], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: toMapCoord(wx) - 3,
            top: toMapCoord(wz) - 3,
            width: 6,
            height: 6,
            background: "rgba(100,120,130,0.5)",
            borderRadius: "1px",
          }}
        />
      ))}

      {gameState.mode === "ctf" &&
        (gameState.flags ?? []).map((flag) => {
          if (flag.carrierId) return null;
          const pos = flag.position;
          if (!pos) return null;
          const fx = toMapCoord(pos[0]);
          const fz = toMapCoord(pos[2]);
          const flagColor = flag.team === "a" ? "#4488ff" : "#ff5533";
          return (
            <div
              key={`flag-${flag.team}`}
              style={{
                position: "absolute",
                left: fx - 4,
                top: fz - 4,
                width: 8,
                height: 8,
                background: flagColor,
                clipPath: "polygon(0 0, 100% 25%, 0 50%, 0 100%)",
                opacity: 0.9,
              }}
            />
          );
        })}

      {allPlayers.map((p) => {
        const isMe = p.id === currentPlayerId;
        const isDowned = p.respawnAt !== undefined;
        const isIt = p.isIt;
        const px = toMapCoord(p.position[0]);
        const pz = toMapCoord(p.position[2]);
        const size = isMe ? 6 : 4;
        const color = isDowned
          ? "#555"
          : isIt
            ? "#ff3333"
            : isMe
              ? "#ffffff"
              : p.team === "a"
                ? "#44aaff"
                : p.team === "b"
                  ? "#ff8844"
                  : "#88ff88";
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: px - size / 2,
              top: pz - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: color,
              boxShadow: isMe ? `0 0 4px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

export default MinimapRadar;
