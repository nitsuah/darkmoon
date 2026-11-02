import { vi } from "vitest";

/**
 * Deterministically stub the Web Crypto RNG used by gameplay helpers.
 * The production callers pass Uint32Array views; return the original view so
 * the mock retains the Web Crypto callback's ArrayBufferView type.
 */
export function mockCryptoRandom(value: number = 0): void {
  vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation((array) => {
    new Uint32Array(
      array.buffer,
      array.byteOffset,
      array.byteLength / Uint32Array.BYTES_PER_ELEMENT,
    )[0] = value;
    return array;
  });
}
