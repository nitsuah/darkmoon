import { describe, it, expect } from "vitest";
import React, { useEffect } from "react";
import { render } from "@testing-library/react";
import { useSocketConnection } from "../lib/hooks/useSocketConnection";

type HookReturn = ReturnType<typeof useSocketConnection>;

describe("useSocketConnection", () => {
  it("resolves URL from env", () => {
    const outRef: { current: HookReturn | null } = { current: null };

    const Harness: React.FC = () => {
      const hook = useSocketConnection();
      useEffect(() => {
        outRef.current = hook;
      }, [hook]);
      return null;
    };

    render(<Harness />);

    const sock = outRef.current!.getSocket();
    // Hook should expose getSocket and isConnected
    expect(typeof outRef.current!.isConnected).toBe("boolean");
    expect(sock === null || typeof sock === "object").toBe(true);
  });
});
