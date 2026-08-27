export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export type OriginRejectionHook = (event: { origin: string }) => void;

export interface CorsOptions {
  origin: (origin: string | undefined, callback: CorsOriginCallback) => void;
  methods: string[];
  credentials: boolean;
}

export const DEFAULT_ALLOWED_ORIGINS: string[];
export const CORS_ERROR_CODE: string;
export function createCorsError(): Error & {
  code: string;
  statusCode: number;
};
export function parseAllowedOrigins(
  envValue: string | undefined | null,
): string[];
export function matchesOrigin(origin: string, allowedOrigin: string): boolean;
export function isOriginAllowed(
  origin: string | undefined | null,
  allowedOrigins: string[],
): boolean;
export function createOriginCallback(
  allowedOrigins: string[],
  onRejected?: OriginRejectionHook,
): (origin: string | undefined, callback: CorsOriginCallback) => void;
export function createCorsOptions(
  allowedOrigins: string[],
  onRejected?: OriginRejectionHook,
): CorsOptions;

declare const _default: {
  DEFAULT_ALLOWED_ORIGINS: typeof DEFAULT_ALLOWED_ORIGINS;
  CORS_ERROR_CODE: typeof CORS_ERROR_CODE;
  parseAllowedOrigins: typeof parseAllowedOrigins;
  matchesOrigin: typeof matchesOrigin;
  isOriginAllowed: typeof isOriginAllowed;
  createCorsError: typeof createCorsError;
  createOriginCallback: typeof createOriginCallback;
  createCorsOptions: typeof createCorsOptions;
};
export default _default;
