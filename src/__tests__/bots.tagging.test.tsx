/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GameManager from "../components/GameManager";
import Bots from "../pages/Solo/components/Bots";
import type CollisionSystem from "../components/CollisionSystem";

vi.mock("../components/characters/BotCharacter", () => ({
  BotCharacter: ({ onTagTarget, config }: { onTagTarget: () => void; config: { label?: string } }) => (
    <button onClick={onTagTarget} data-testid={`tag-${config.label || "bot"}`}>
      trigger-tag
    </button>
  ),
}));

describe("Bots tagging behavior", () => {
  it("allows bot-1 to tag the player in solo mode", () => {
    const manager = new GameManager();
    manager.addPlayer({
      id: "player-1",
      name: "Player",
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      isIt: false,
    });
    manager.addPlayer({
      id: "bot-1",
      name: "Bot",
      position: [0.5, 0.5, 0],
      rotation: [0, 0, 0],
      isIt: true,
    });

    manager.startTagGame();
    manager.updatePlayer("bot-1", { isIt: true });
    manager.updatePlayer("player-1", { isIt: false });

    const fakeCollisionRef = { current: null as unknown as CollisionSystem };

    render(
      <Bots
        botDebugMode={false}
        currentPlayerId="player-1"
        playerIsIt={false}
        playerPosition={[0, 0.5, 0]}
        bot1Position={[0.5, 0.5, 0]}
        bot2Position={[8, 0.5, -8]}
        isPaused={false}
        handleBot1PositionUpdate={() => {}}
        handleBot2PositionUpdate={() => {}}
        collisionSystemRef={fakeCollisionRef}
        bot1GotTagged={0}
        bot2GotTagged={0}
        BOT1_CONFIG={{ label: "Bot1" }}
        BOT2_CONFIG={{ label: "Bot2" }}
        gameManager={manager}
        gameState={manager.getGameState()}
        setBot1GotTagged={() => {}}
        setBot2GotTagged={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId("tag-Bot1"));

    expect(manager.getPlayers().get("player-1")?.isIt).toBe(true);
    expect(manager.getPlayers().get("bot-1")?.isIt).toBe(false);
  });
});
