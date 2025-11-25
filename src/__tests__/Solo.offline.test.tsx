import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoloGame } from "../lib/hooks/useSoloGame";
import type { Player, GameState } from "../components/GameManager";
import type { Dispatch, SetStateAction } from "react";

describe("Solo offline initialization", () => {
  it("initializeForSocket creates GameManager and can start tag game", () => {
    const { result } = renderHook(() => useSoloGame());

    const setGamePlayers: Dispatch<SetStateAction<Map<string, Player>>> = () =>
      /* noop */ undefined;
    const setGameState: Dispatch<SetStateAction<GameState>> = () =>
      /* noop */ undefined;
    const setPlayerIsIt: Dispatch<SetStateAction<boolean>> = () =>
      /* noop */ undefined;

    // use a socket-like object without real socket methods
    const socketLike = { id: "offline-player" };

    let manager = null;
    act(() => {
      manager = result.current.initializeForSocket(socketLike, {
        setGamePlayers,
        setGameState,
        setPlayerIsIt,
      });
    });

    expect(manager).not.toBeNull();
    // manager should have at least two players (solo + bot)
    expect(manager!.getPlayers().size).toBeGreaterThanOrEqual(2);

    // starting a tag game should succeed with two players
    const started = manager!.startTagGame(10);
    expect(started).toBe(true);

    // game state should now be tag and active
    expect(manager!.getGameState().mode).toBe("tag");
    expect(manager!.getGameState().isActive).toBe(true);
  });
});
