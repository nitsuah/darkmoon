import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameUI from "../GameUI";
import type { GameState, Player } from "../GameManager";

const mkPlayers = () => {
  const players = new Map<string, Player>();
  players.set("p1", {
    id: "p1",
    name: "Player One",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    isIt: false,
    timeAsIt: 0,
  });
  players.set("p2", {
    id: "p2",
    name: "Player Two",
    position: [1, 0, 0],
    rotation: [0, 0, 0],
    isIt: true,
    timeAsIt: 10,
  });
  return players;
};

describe("GameUI", () => {
  it("renders active game state and can end game", () => {
    const onEndGame = vi.fn();
    const onToggleDebug = vi.fn();

    const gameState: GameState = {
      mode: "tag",
      isActive: true,
      timeRemaining: 90,
      itPlayerId: "p2",
      roundStartTime: Date.now(),
      scores: {},
    };

    render(
      <GameUI
        gameState={gameState}
        players={mkPlayers()}
        currentPlayerId="p1"
        onStartGame={vi.fn()}
        onEndGame={onEndGame}
        botDebugMode={false}
        onToggleDebug={onToggleDebug}
      />,
    );

    expect(screen.getByText(/01:30/)).toBeInTheDocument();
    expect(screen.getByText(/Player Two is IT/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("End Game"));
    expect(onEndGame).toHaveBeenCalled();

    fireEvent.click(screen.getByText("🔧 Debug Mode"));
    expect(onToggleDebug).toHaveBeenCalled();
  });

  it("renders lobby state and starts game", () => {
    const onStartGame = vi.fn();
    const onToggleDebug = vi.fn();

    const gameState: GameState = {
      mode: "tag",
      isActive: false,
      timeRemaining: 0,
      scores: {},
    };

    render(
      <GameUI
        gameState={gameState}
        players={mkPlayers()}
        currentPlayerId="p1"
        onStartGame={onStartGame}
        onEndGame={vi.fn()}
        botDebugMode={true}
        onToggleDebug={onToggleDebug}
      />,
    );

    fireEvent.click(screen.getByText("Start Tag"));
    expect(onStartGame).toHaveBeenCalledWith("tag");

    fireEvent.click(screen.getByText("Start Deathmatch"));
    expect(onStartGame).toHaveBeenCalledWith("deathmatch");

    fireEvent.click(screen.getByText("⏹️ Stop Debug"));
    expect(onToggleDebug).toHaveBeenCalled();
  });

  it("renders health and a kill scoreboard during an active deathmatch", () => {
    const players = mkPlayers();
    players.get("p1")!.health = 70;
    players.get("p1")!.maxHealth = 100;
    players.get("p2")!.health = 100;
    players.get("p2")!.maxHealth = 100;

    const gameState: GameState = {
      mode: "deathmatch",
      isActive: true,
      timeRemaining: 90,
      scores: { p1: 2, p2: 5 },
      killLimit: 10,
      roundStartTime: Date.now(),
    };

    render(
      <GameUI
        gameState={gameState}
        players={players}
        currentPlayerId="p1"
        onStartGame={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );

    expect(screen.getByText(/DEATHMATCH GAME/)).toBeInTheDocument();
    expect(screen.getByText("❤️ 70 / 100")).toBeInTheDocument();
    expect(screen.getByText("💀 Player Two: 5 / 10")).toBeInTheDocument();
    expect(screen.getByText("💀 Player One: 2 / 10")).toBeInTheDocument();
  });
});
