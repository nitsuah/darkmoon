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
      gameStartTime: Date.now(),
      gameEndTime: Date.now() + 90000,
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
      itPlayerId: null,
      gameStartTime: null,
      gameEndTime: null,
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

    fireEvent.click(screen.getByText("⏹️ Stop Debug"));
    expect(onToggleDebug).toHaveBeenCalled();
  });
});
