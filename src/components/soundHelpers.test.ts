import { describe, it, expect } from 'vitest';
import { clamp01, applyVolumes } from './soundHelpers';

describe('clamp01', () => {
  it('returns 0 for input 0', () => {
    expect(clamp01(0)).toBe(0);
  });

  it('returns 1 for input 1', () => {
    expect(clamp01(1)).toBe(1);
  });

  it('returns value for in-range values', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(0.75)).toBe(0.75);
  });

  it('returns 0 for values below range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it('returns 1 for values above range', () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it('returns 0 for NaN', () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it('returns 0 for positive infinity', () => {
    expect(clamp01(Infinity)).toBe(0);
  });

  it('returns 0 for negative infinity', () => {
    expect(clamp01(-Infinity)).toBe(0);
  });
});

describe('applyVolumes', () => {
  const createMockGain = () => ({ gain: { value: 0 } });

  it('multiplies each clamped channel volume by master volume', () => {
    const musicGain = createMockGain();
    const sfxGain = createMockGain();

    applyVolumes(musicGain, sfxGain, 0.5, 0.8, 0.5, false);

    expect(musicGain.gain.value).toBe(0.25); // 0.5 * 0.5
    expect(sfxGain.gain.value).toBe(0.4); // 0.8 * 0.5
  });

  it('clamps channel volumes before multiplying', () => {
    const musicGain = createMockGain();
    const sfxGain = createMockGain();

    applyVolumes(musicGain, sfxGain, 1.5, -0.5, 1, false);

    expect(musicGain.gain.value).toBe(1); // clamp(1.5)=1 * 1
    expect(sfxGain.gain.value).toBe(0); // clamp(-0.5)=0 * 1
  });

  it('clamps master volume before multiplying', () => {
    const musicGain = createMockGain();
    const sfxGain = createMockGain();

    applyVolumes(musicGain, sfxGain, 0.5, 0.5, 2, false);

    expect(musicGain.gain.value).toBe(0.5); // 0.5 * clamp(2)=1
    expect(sfxGain.gain.value).toBe(0.5);
  });

  it('writes zero to both gain nodes when muted', () => {
    const musicGain = createMockGain();
    const sfxGain = createMockGain();

    applyVolumes(musicGain, sfxGain, 1, 1, 1, true);

    expect(musicGain.gain.value).toBe(0);
    expect(sfxGain.gain.value).toBe(0);
  });

  it('ignores null music gain node', () => {
    const sfxGain = createMockGain();

    applyVolumes(null, sfxGain, 0.5, 0.5, 1, false);

    expect(sfxGain.gain.value).toBe(0.5);
  });

  it('ignores null sfx gain node', () => {
    const musicGain = createMockGain();

    applyVolumes(musicGain, null, 0.5, 0.5, 1, false);

    expect(musicGain.gain.value).toBe(0.5);
  });

  it('ignores both null gain nodes', () => {
    applyVolumes(null, null, 0.5, 0.5, 1, false);
    // Should not throw
  });

  it('handles muted with null music gain', () => {
    const sfxGain = createMockGain();

    applyVolumes(null, sfxGain, 1, 1, 1, true);

    expect(sfxGain.gain.value).toBe(0);
  });

  it('handles muted with null sfx gain', () => {
    const musicGain = createMockGain();

    applyVolumes(musicGain, null, 1, 1, 1, true);

    expect(musicGain.gain.value).toBe(0);
  });
});
