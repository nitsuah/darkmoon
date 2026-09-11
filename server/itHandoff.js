/**
 * Pure decision for reassigning (or clearing) the IT player when a client
 * disconnects mid-match.
 *
 * Split out from `server/index.js` for the same reason as `tagAuthorization.js`:
 * index.js calls `app.listen` at import time, so it cannot be imported in a
 * test. This mirrors `TagMode.onPlayerRemoved`'s zero-players branch
 * (`src/components/gameModes/TagMode.ts`) so a disconnecting IT player leaves
 * a server-authoritative match in the same state a client-authoritative one
 * would: either a new IT player is picked, or the round ends because no one
 * is left to tag.
 */

/**
 * @param {object} params
 * @param {string} params.disconnectingId - The client that just disconnected.
 * @param {{ isActive?: boolean, mode?: string, itPlayerId?: string | null } | null | undefined} params.gameState
 * @param {Record<string, unknown> | null | undefined} params.remainingClients - The
 *   tracked client map *after* `disconnectingId` has already been removed.
 * @param {() => number} [params.random] - RNG hook returning [0, 1),
 *   injectable for deterministic tests. Defaults to `Math.random`.
 * @returns {
 *   { action: "none" } |
 *   { action: "end" } |
 *   { action: "reassign", itPlayerId: string }
 * } "none" when the disconnecting player was not IT (or no tag game is
 *   active) and nothing needs to change; "end" when the IT player disconnected
 *   and no players remain to hand IT to; "reassign" with the newly-IT player's
 *   id otherwise.
 */
export const resolveItHandoff = ({
  disconnectingId,
  gameState,
  remainingClients,
  random = Math.random,
}) => {
  const wasIt =
    gameState?.isActive === true &&
    gameState?.mode === "tag" &&
    gameState?.itPlayerId === disconnectingId;

  if (!wasIt) return { action: "none" };

  const remainingIds =
    remainingClients && typeof remainingClients === "object"
      ? Object.keys(remainingClients)
      : [];

  if (remainingIds.length === 0) return { action: "end" };

  const itPlayerId = remainingIds[Math.floor(random() * remainingIds.length)];
  return { action: "reassign", itPlayerId };
};

export default { resolveItHandoff };
