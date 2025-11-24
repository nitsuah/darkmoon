import { describe, it, expect } from "vitest";
import { clamp01, applyVolumes } from "../soundHelpers";

describe("soundHelpers", () => {
  it("clamps values to 0..1", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
  });

  it("applies volumes and respects mute", () => {
    const musicGain = { gain: { value: 0 } };
    const sfxGain = { gain: { value: 0 } };

    applyVolumes(musicGain, sfxGain, 0.5, 0.2, 0.5, false);
    expect(musicGain.gain.value).toBeCloseTo(0.25);
    expect(sfxGain.gain.value).toBeCloseTo(0.1);

    applyVolumes(musicGain, sfxGain, 0.5, 0.2, 0.5, true);
    expect(musicGain.gain.value).toBe(0);
    expect(sfxGain.gain.value).toBe(0);
  });
});
