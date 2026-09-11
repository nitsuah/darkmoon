import { describe, it, expect } from "vitest";
import { resolveItHandoff } from "../../server/itHandoff.js";

const activeTagGame = (itPlayerId: string) => ({
  isActive: true,
  mode: "tag",
  itPlayerId,
});

describe("resolveItHandoff", () => {
  it("does nothing when the disconnecting player was not IT", () => {
    expect(
      resolveItHandoff({
        disconnectingId: "p2",
        gameState: activeTagGame("p1"),
        remainingClients: { p1: {}, p3: {} },
      }),
    ).toEqual({ action: "none" });
  });

  it("does nothing when no tag game is active, even if the id matches itPlayerId", () => {
    expect(
      resolveItHandoff({
        disconnectingId: "p1",
        gameState: { isActive: false, mode: "none", itPlayerId: "p1" },
        remainingClients: { p2: {}, p3: {} },
      }),
    ).toEqual({ action: "none" });
  });

  it("does nothing when the active game is a different mode", () => {
    expect(
      resolveItHandoff({
        disconnectingId: "p1",
        gameState: { isActive: true, mode: "collectible", itPlayerId: "p1" },
        remainingClients: { p2: {}, p3: {} },
      }),
    ).toEqual({ action: "none" });
  });

  it("reassigns IT to a remaining player when the IT player disconnects", () => {
    const decision = resolveItHandoff({
      disconnectingId: "p1",
      gameState: activeTagGame("p1"),
      remainingClients: { p2: {}, p3: {} },
      random: () => 0, // deterministic: picks the first remaining id
    });

    expect(decision).toEqual({ action: "reassign", itPlayerId: "p2" });
  });

  it("can reassign to any remaining player depending on the RNG draw", () => {
    const decision = resolveItHandoff({
      disconnectingId: "p1",
      gameState: activeTagGame("p1"),
      remainingClients: { p2: {}, p3: {} },
      random: () => 0.999, // deterministic: picks the last remaining id
    });

    expect(decision).toEqual({ action: "reassign", itPlayerId: "p3" });
  });

  it("ends the round when the IT player disconnects and no players remain", () => {
    const decision = resolveItHandoff({
      disconnectingId: "p1",
      gameState: activeTagGame("p1"),
      remainingClients: {},
    });

    expect(decision).toEqual({ action: "end" });
  });

  it("treats a missing/null remainingClients map as no players remaining", () => {
    expect(
      resolveItHandoff({
        disconnectingId: "p1",
        gameState: activeTagGame("p1"),
        remainingClients: null,
      }),
    ).toEqual({ action: "end" });
  });
});
