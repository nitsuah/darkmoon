/**
 * Pure authorization decision for the `player-tagged` socket event.
 *
 * Split out from `server/index.js` so the impersonation/self-tag/unknown-player
 * rules are unit-testable without booting a real Socket.io server (index.js
 * calls `app.listen` at import time, so it cannot be imported in a test).
 *
 * The caller is responsible for binding `taggerId` to the sending socket's
 * `client.id` — this function never trusts a client-supplied tagger identity.
 */

/**
 * @param {object} params
 * @param {string} params.taggerId - Authenticated actor (`client.id`), never
 *   a client-supplied value.
 * @param {unknown} params.taggedId - Client-supplied target player id.
 * @param {{ isActive?: boolean, mode?: string, itPlayerId?: string | null } | null | undefined} params.gameState
 * @param {Record<string, unknown> | null | undefined} params.clients - Tracked
 *   client map, used for own-property-safe existence checks so an id like
 *   `"__proto__"` cannot resolve truthy against `Object.prototype`.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export const authorizeTag = ({ taggerId, taggedId, gameState, clients }) => {
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

  return { ok: true };
};

export default { authorizeTag };
