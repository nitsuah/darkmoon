export interface GameStateSnapshot {
  isActive?: boolean;
  mode?: string;
  startTime?: number | null;
  itPlayerId?: string | null;
}

export interface HealthReport {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  activePlayers: number;
  activeGames: number;
  maxPlayers: number;
  game: {
    isActive: boolean;
    mode: string;
    startedAt: string | null;
  };
  version: string | null;
}

export const STATUS_OK: string;
export const STATUS_DEGRADED: string;
export const DEFAULT_MAX_PLAYERS: number;

export function countActiveGames(
  gameState: GameStateSnapshot | null | undefined,
): number;
export function countActivePlayers(snapshot?: {
  connections?: number;
  clients?: Record<string, unknown>;
}): number;
export function buildHealthReport(snapshot?: {
  connections?: number;
  clients?: Record<string, unknown>;
  gameState?: GameStateSnapshot;
  startedAt?: number;
  now?: number;
  maxPlayers?: number;
  version?: string;
}): HealthReport;
export function healthStatusCode(report: { status?: string }): number;

declare const _default: {
  STATUS_OK: typeof STATUS_OK;
  STATUS_DEGRADED: typeof STATUS_DEGRADED;
  DEFAULT_MAX_PLAYERS: typeof DEFAULT_MAX_PLAYERS;
  countActiveGames: typeof countActiveGames;
  countActivePlayers: typeof countActivePlayers;
  buildHealthReport: typeof buildHealthReport;
  healthStatusCode: typeof healthStatusCode;
};
export default _default;
