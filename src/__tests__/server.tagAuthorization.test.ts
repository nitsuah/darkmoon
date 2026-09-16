import { describe, it, expect } from "vitest";
import {
  authorizeTag,
  TAG_BACK_COOLDOWN_MS,
  TAG_FREEZE_MS,
} from "../../server/tagAuthorization.js";

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

  describe("tag-back cooldown and freeze window (server-side tag parity)", () => {
    // Mirrors TagMode.applyTag: a freshly-tagged IT player (p1, just tagged by
    // p2) cannot instantly tag p2 back for TAG_BACK_COOLDOWN_MS, scoped to
    // that specific pair.
    it("rejects a tag-back within TAG_BACK_COOLDOWN_MS", () => {
      const now = 10_000;
      const cooldownClients = {
        p1: { lastTagTime: now - 500, lastTaggedById: "p2" },
        p2: {},
        p3: {},
      };

      expect(
        authorizeTag({
          taggerId: "p1",
          taggedId: "p2",
          gameState: activeTagGame("p1"),
          clients: cooldownClients,
          now,
        }),
      ).toEqual({ ok: false, reason: "tag_back_cooldown" });
    });

    it("allows a tag-back once TAG_BACK_COOLDOWN_MS has elapsed", () => {
      const tagTime = 10_000;
      const now = tagTime + TAG_BACK_COOLDOWN_MS;
      const cooldownClients = {
        p1: { lastTagTime: tagTime, lastTaggedById: "p2" },
        p2: {},
        p3: {},
      };

      expect(
        authorizeTag({
          taggerId: "p1",
          taggedId: "p2",
          gameState: activeTagGame("p1"),
          clients: cooldownClients,
          now,
        }),
      ).toEqual({ ok: true });
    });

    it("does not block a freshly-tagged IT player from tagging a different player", () => {
      const now = 10_000;
      // p1 was just tagged by p2, but is now chasing p3, not p2.
      const cooldownClients = {
        p1: { lastTagTime: now - 500, lastTaggedById: "p2" },
        p2: {},
        p3: {},
      };

      expect(
        authorizeTag({
          taggerId: "p1",
          taggedId: "p3",
          gameState: activeTagGame("p1"),
          clients: cooldownClients,
          now,
        }),
      ).toEqual({ ok: true });
    });

    // Mirrors TagMode.applyTag: a just-tagged (now IT) player cannot be
    // re-tagged by *anyone* for TAG_FREEZE_MS, not just the player who tagged
    // them.
    it("rejects tagging a player who was tagged by someone else within TAG_FREEZE_MS", () => {
      const now = 10_000;
      const freezeClients = {
        p1: {},
        p2: { lastTagTime: now - 200, lastTaggedById: "p3" },
        p3: {},
      };

      expect(
        authorizeTag({
          taggerId: "p1",
          taggedId: "p2",
          gameState: activeTagGame("p1"),
          clients: freezeClients,
          now,
        }),
      ).toEqual({ ok: false, reason: "tag_freeze" });
    });

    it("allows tagging once TAG_FREEZE_MS has elapsed", () => {
      const tagTime = 10_000;
      const now = tagTime + TAG_FREEZE_MS;
      const freezeClients = {
        p1: {},
        p2: { lastTagTime: tagTime, lastTaggedById: "p3" },
        p3: {},
      };

      expect(
        authorizeTag({
          taggerId: "p1",
          taggedId: "p2",
          gameState: activeTagGame("p1"),
          clients: freezeClients,
          now,
        }),
      ).toEqual({ ok: true });
    });
  });
});
