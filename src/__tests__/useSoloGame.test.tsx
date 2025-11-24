import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React, { useEffect } from "react";
import { useSoloGame } from "../lib/hooks/useSoloGame";
import type { Socket } from "socket.io-client";

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

    const fakeSocket: MinimalSocket = { id: "fake" };
    // Minimal Socket stub matching the properties used by the hook
    // The hook only reads `id` so this lightweight typed stub is sufficient for the test
    const socketStub = fakeSocket as unknown as Socket;

    const manager = outRef.current!.initializeForSocket(socketStub, {
      setGamePlayers: () => {},
      setGameState: () => {},
      setPlayerIsIt: () => {},
    });

    expect(manager).toBeDefined();
    expect(typeof manager.getPlayers).toBe("function");
  });
});
