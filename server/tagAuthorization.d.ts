export interface TagGameState {
  isActive?: boolean;
  mode?: string;
  itPlayerId?: string | null;
}

export interface TagClientRecord {
  lastTagTime?: number;
  lastTaggedById?: string;
}

export type TagAuthorizationDecision =
  { ok: true } | { ok: false; reason: string };

export const TAG_BACK_COOLDOWN_MS: number;
export const TAG_FREEZE_MS: number;

export function authorizeTag(params: {
  taggerId: string;
  taggedId: unknown;
  gameState: TagGameState | null | undefined;
  clients: Record<string, TagClientRecord> | null | undefined;
  now?: number;
}): TagAuthorizationDecision;

declare const _default: {
  authorizeTag: typeof authorizeTag;
  TAG_BACK_COOLDOWN_MS: typeof TAG_BACK_COOLDOWN_MS;
  TAG_FREEZE_MS: typeof TAG_FREEZE_MS;
};
export default _default;
