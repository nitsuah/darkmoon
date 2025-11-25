import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React, { useEffect } from "react";
import { useSoloGame } from "../lib/hooks/useSoloGame";

type HookReturn = ReturnType<typeof useSoloGame>;

// Minimal socket test-double: only the properties initializeForSocket uses
type MinimalSocket = { id?: string };

describe("useSoloGame", () => {
  it("initializes GameManager for socket", () => {
    const outRef: { current: HookReturn | null } = { current: null };

    const Harness: React.FC = () => {
      const hook = useSoloGame();
      useEffect(() => {
        outRef.current = hook;
      }, [hook]);
      return null;
    };

    render(<Harness />);

    const socketStub: MinimalSocket = { id: "fake" };

    const manager = outRef.current!.initializeForSocket(socketStub, {
      setGamePlayers: () => {},
      setGameState: () => {},
      setPlayerIsIt: () => {},
    });

    expect(manager).toBeDefined();
    expect(typeof manager.getPlayers).toBe("function");
  });
});
