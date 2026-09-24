import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreBoard from "../ScoreBoard";
import type { GameState, Player } from "../../../GameManager";

const player = (id: string, extra: Partial<Player> = {}): Player => ({
  id,
  name: id.toUpperCase(),
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  ...extra,
});

const players = (...list: Player[]) => new Map(list.map((p) => [p.id, p]));

const state = (
  mode: GameState["mode"],
  scores: Record<string, number>,
): GameState =>
  ({ mode, isActive: true, timeRemaining: 60, scores }) as GameState;

describe("ScoreBoard", () => {
  it("ranks players by score with medals and highlights health tiers", () => {
    render(
      <ScoreBoard
        gameState={state("deathmatch", { a: 1, b: 5, c: 3, d: 0 })}
        players={players(
          player("a", { health: 20, maxHealth: 100 }),
          player("b", { health: 90, maxHealth: 100 }),
          player("c", { health: 40, maxHealth: 100 }),
          player("d", { health: 0, maxHealth: 100, respawnAt: 123 }),
        )}
        currentPlayerId="c"
      />,
    );
    expect(screen.getByText("DEATHMATCH — SCORES")).toBeInTheDocument();
    const names = screen.getAllByText(/^[ABCD]$/).map((n) => n.textContent);
    expect(names).toEqual(["B", "C", "A", "D"]);
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
    expect(screen.getByText("4.")).toBeInTheDocument();
    expect(screen.getByText("90hp")).toHaveStyle({ color: "#44ff44" });
    expect(screen.getByText("40hp")).toHaveStyle({ color: "#ffaa00" });
    expect(screen.getByText("20hp")).toHaveStyle({ color: "#ff4444" });
    expect(screen.getByText("💀")).toBeInTheDocument();
    expect(screen.getByText("5 kills")).toBeInTheDocument();
    expect(screen.getByText("HOLD TAB")).toBeInTheDocument();
  });

  it("uses 'caps' for CTF", () => {
    render(
      <ScoreBoard
        gameState={state("ctf", { a: 2 })}
        players={players(player("a"))}
        currentPlayerId="a"
      />,
    );
    expect(screen.getByText("2 caps")).toBeInTheDocument();
  });

  it("uses 'pts', shows the IT tag and hides health in tag mode", () => {
    render(
      <ScoreBoard
        gameState={state("tag", {})}
        players={players(
          player("a", { isIt: true, health: 50, maxHealth: 100 }),
          player("b"),
        )}
        currentPlayerId="b"
      />,
    );
    expect(screen.getAllByText("0 pts")).toHaveLength(2);
    expect(screen.getByText("IT")).toBeInTheDocument();
    expect(screen.queryByText("50hp")).not.toBeInTheDocument();
  });

  it("uses 'pts' for the shooting gallery", () => {
    render(
      <ScoreBoard
        gameState={state("shooting_gallery", { a: 120 })}
        players={players(player("a"))}
        currentPlayerId="a"
      />,
    );
    expect(screen.getByText("120 pts")).toBeInTheDocument();
  });
});
