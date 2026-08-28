export interface TagGameState {
  isActive?: boolean;
  mode?: string;
  itPlayerId?: string | null;
}

export type TagAuthorizationDecision =
  { ok: true } | { ok: false; reason: string };

export function authorizeTag(params: {
  taggerId: string;
  taggedId: unknown;
  gameState: TagGameState | null | undefined;
  clients: Record<string, unknown> | null | undefined;
}): TagAuthorizationDecision;

declare const _default: {
  authorizeTag: typeof authorizeTag;
};
export default _default;
