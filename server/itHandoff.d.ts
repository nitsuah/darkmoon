export interface ItHandoffGameState {
  isActive?: boolean;
  mode?: string;
  itPlayerId?: string | null;
}

export type ItHandoffDecision =
  | { action: "none" }
  | { action: "end" }
  | { action: "reassign"; itPlayerId: string };

export function resolveItHandoff(params: {
  disconnectingId: string;
  gameState: ItHandoffGameState | null | undefined;
  remainingClients: Record<string, unknown> | null | undefined;
  random?: () => number;
}): ItHandoffDecision;

declare const _default: {
  resolveItHandoff: typeof resolveItHandoff;
};
export default _default;
