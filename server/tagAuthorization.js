/**
 * Pure authorization decision for the `player-tagged` socket event.
 *
 * Split out from `server/index.js` so the impersonation/self-tag/unknown-player
 * rules are unit-testable without booting a real Socket.io server (index.js
 * calls `app.listen` at import time, so it cannot be imported in a test).
 *
 * The caller is responsible for binding `taggerId` to the sending socket's
 * `client.id` — this function never trusts a client-supplied tagger identity.
 *
 * The cooldown/freeze thresholds and pairing rules below mirror
 * `TagMode.applyTag` (`src/components/gameModes/TagMode.ts`) exactly, so a
 * server-authoritative match enforces the same rules a solo/local match does.
 */

/** Mirrors `TagMode.TAG_BACK_COOLDOWN_MS`. */
export const TAG_BACK_COOLDOWN_MS = 2000;
/** Mirrors `TagMode.TAG_FREEZE_MS`. */
export const TAG_FREEZE_MS = 1500;

/**
 * @param {object} params
 * @param {string} params.taggerId - Authenticated actor (`client.id`), never
 *   a client-supplied value.
 * @param {unknown} params.taggedId - Client-supplied target player id.
 * @param {{ isActive?: boolean, mode?: string, itPlayerId?: string | null } | null | undefined} params.gameState
 * @param {Record<string, { lastTagTime?: number, lastTaggedById?: string }> | null | undefined} params.clients - Tracked
 *   client map, used for own-property-safe existence checks so an id like
 *   `"__proto__"` cannot resolve truthy against `Object.prototype`, and as the
 *   source of each player's `lastTagTime`/`lastTaggedById` for the
 *   cooldown/freeze checks below.
 * @param {number} [params.now] - Current time (ms epoch), injectable for tests.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export const authorizeTag = ({
  taggerId,
  taggedId,
  gameState,
  clients,
  now = Date.now(),
}) => {
  if (!gameState?.isActive || gameState?.mode !== "tag") {
    return { ok: false, reason: "no_active_tag_game" };
  }

  if (taggerId !== gameState.itPlayerId) {
    return { ok: false, reason: "tagger_not_it" };
  }

  // Self-tagging would hand IT back to the tagger and award a point on every
  // emit — an unbounded score farm.
  if (taggedId === taggerId) {
    return { ok: false, reason: "self_tag" };
  }

  const isKnownPlayer = (id) =>
    typeof id === "string" &&
    clients != null &&
    typeof clients === "object" &&
    Object.prototype.hasOwnProperty.call(clients, id);

  if (!isKnownPlayer(taggerId) || !isKnownPlayer(taggedId)) {
    return { ok: false, reason: "unknown_player" };
  }

  const tagger = clients[taggerId];
  const tagged = clients[taggedId];

  // Tag-back cooldown: a freshly-tagged IT player cannot instantly tag back
  // whoever tagged them. Scoped to that specific pair (via lastTaggedById) so
  // they can still chase down a *different* player immediately.
  if (
    tagger?.lastTaggedById === taggedId &&
    typeof tagger?.lastTagTime === "number" &&
    now - tagger.lastTagTime < TAG_BACK_COOLDOWN_MS
  ) {
    return { ok: false, reason: "tag_back_cooldown" };
  }

  // Freeze window: a just-tagged (now IT) player cannot be re-tagged by
  // *anyone* — not just the player who tagged them — for TAG_FREEZE_MS.
  if (
    typeof tagged?.lastTagTime === "number" &&
    now - tagged.lastTagTime < TAG_FREEZE_MS
  ) {
    return { ok: false, reason: "tag_freeze" };
  }

  return { ok: true };
};

export default { authorizeTag, TAG_BACK_COOLDOWN_MS, TAG_FREEZE_MS };
