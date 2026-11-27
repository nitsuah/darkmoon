import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GameStatusPanel from "../GameStatusPanel";
import type { GameState, Player } from "../../../GameManager";

describe("GameStatusPanel", () => {
  it("renders Tag mode with current player as IT and shows input-neutral firing hint", () => {
    const players = new Map<string, Player>();
    players.set("p1", {
      id: "p1",
      name: "Player One",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      isIt: true,
      timeAsIt: 10,
      health: 100,
      maxHealth: 100,
    });
    players.set("p2", {
      id: "p2",
      name: "Player Two",
      position: [1, 0, 0],
      rotation: [0, 0, 0],
      isIt: false,
      timeAsIt: 0,
      health: 100,
      maxHealth: 100,
    });

    const gameState: GameState = {
      mode: "tag",
      isActive: true,
      timeRemaining: 90,
      itPlayerId: "p1",
      roundStartTime: Date.now(),
      scores: { p1: 5, p2: 2 },
    };

    render(
      <GameStatusPanel
        gameState={gameState}
        players={players}
        currentPlayer={players.get("p1")!}
        itPlayer={players.get("p1")!}
        currentPlayerId="p1"
        isMinimal={false}
        isMobile={false}
        onEndGame={() => {}}
        onMainMenu={() => {}}
        botDebugMode={false}
        galleryDebugMode={false}
        galleryHighScore={0}
        galleryCombo={0}
        galleryMultiplier={1}
      />,
    );

    expect(screen.getByText(/🏃 TAG/)).toBeInTheDocument();
    expect(screen.getByText("🏃 YOU ARE IT!")).toBeInTheDocument();
    expect(screen.getByText("Click to fire your laser!")).toBeInTheDocument();
  });

  it("renders Tag mode with another player as IT and shows who is IT", () => {
    const players = new Map<string, Player>();
    players.set("p1", {
      id: "p1",
      name: "Player One",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      isIt: false,
      timeAsIt: 0,
      health: 100,
      maxHealth: 100,
    });
    players.set("p2", {
      id: "p2",
      name: "Player Two",
      position: [1, 0, 0],
      rotation: [0, 0, 0],
      isIt: true,
      timeAsIt: 10,
      health: 100,
      maxHealth: 100,
    });

    const gameState: GameState = {
      mode: "tag",
      isActive: true,
      timeRemaining: 90,
      itPlayerId: "p2",
      roundStartTime: Date.now(),
      scores: { p1: 2, p2: 5 },
    };

    render(
      <GameStatusPanel
        gameState={gameState}
        players={players}
        currentPlayer={players.get("p1")!}
        itPlayer={players.get("p2")!}
        currentPlayerId="p1"
        isMinimal={false}
        isMobile={false}
        onEndGame={() => {}}
        onMainMenu={() => {}}
        botDebugMode={false}
        galleryDebugMode={false}
        galleryHighScore={0}
        galleryCombo={0}
        galleryMultiplier={1}
      />,
    );

    expect(screen.getByText(/Player Two is IT/)).toBeInTheDocument();
    expect(screen.queryByText("Click to fire your laser!")).not.toBeInTheDocument();
  });
});