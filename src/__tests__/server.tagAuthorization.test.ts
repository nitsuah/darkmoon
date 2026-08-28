import { describe, it, expect } from "vitest";
import { authorizeTag } from "../../server/tagAuthorization.js";

const activeTagGame = (itPlayerId: string) => ({
  isActive: true,
  mode: "tag",
  itPlayerId,
});

const clients = { p1: {}, p2: {}, p3: {} };

describe("authorizeTag", () => {
  it("allows the current IT player to tag a known, different player", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "p2",
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a client impersonating the IT player via a spoofed taggerId", () => {
    // The caller always binds taggerId to client.id, so this exercises the
    // case where the sending socket ("p2") is not actually IT ("p1" is) —
    // the regression this function exists to prevent.
    const decision = authorizeTag({
      taggerId: "p2",
      taggedId: "p1",
      gameState: activeTagGame("p1"),
      clients,
    });

    expect(decision).toEqual({ ok: false, reason: "tagger_not_it" });
  });

  it("rejects a self-tag", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "p1",
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: false, reason: "self_tag" });
  });

  it("rejects an unknown tagged player", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "ghost",
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: false, reason: "unknown_player" });
  });

  it("rejects a taggedId that only resolves via the prototype chain", () => {
    // Object.prototype.hasOwnProperty guards against "__proto__" /
    // "constructor" / "toString" resolving truthy against a plain object.
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "__proto__",
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: false, reason: "unknown_player" });

    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "constructor",
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: false, reason: "unknown_player" });
  });

  it("rejects when no tag game is active", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "p2",
        gameState: { isActive: false, mode: "none", itPlayerId: null },
        clients,
      }),
    ).toEqual({ ok: false, reason: "no_active_tag_game" });
  });

  it("rejects when the active game is a different mode", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: "p2",
        gameState: { isActive: true, mode: "collectible", itPlayerId: "p1" },
        clients,
      }),
    ).toEqual({ ok: false, reason: "no_active_tag_game" });
  });

  it("rejects when taggedId is missing", () => {
    expect(
      authorizeTag({
        taggerId: "p1",
        taggedId: undefined,
        gameState: activeTagGame("p1"),
        clients,
      }),
    ).toEqual({ ok: false, reason: "unknown_player" });
  });
});
