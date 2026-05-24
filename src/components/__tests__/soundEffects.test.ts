import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  playJumpSoundImpl,
  playJetpackActivateSoundImpl,
  playJetpackThrustSoundImpl,
  playLandSoundImpl,
  playTagSoundImpl,
  playTaggedSoundImpl,
  playWalkSoundImpl,
  stopJetpackThrustSoundImpl,
} from "../soundEffects";

type MockParam = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};

const makeParam = (): MockParam => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

const makeContext = () => {
  const osc = {
    type: "sine",
    frequency: makeParam(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const gain = {
    gain: makeParam(),
    connect: vi.fn(),
  };

  const filter = {
    type: "lowpass",
    frequency: makeParam(),
    Q: { value: 0 },
    connect: vi.fn(),
  };

  const ctx = {
    currentTime: 10,
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
    createBiquadFilter: vi.fn(() => filter),
  };

  const sfxGain = { connect: vi.fn() };

  return { ctx, osc, gain, filter, sfxGain };
};

describe("soundEffects", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("plays one-shot effects without throwing", () => {
    const { ctx, osc, gain, sfxGain } = makeContext();

    playWalkSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.7,
    );
    playJumpSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.7,
    );
    playLandSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.7,
    );
    playTagSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.7,
    );
    playTaggedSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.7,
    );

    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
    expect(gain.connect).toHaveBeenCalledWith(sfxGain);
  });

  it("creates filter-based jetpack sounds and returns thrust handle", () => {
    const { ctx, osc, gain, filter, sfxGain } = makeContext();

    playJetpackActivateSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.5,
    );
    const thrustSound = playJetpackThrustSoundImpl(
      ctx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.5,
    );

    expect(ctx.createBiquadFilter).toHaveBeenCalled();
    expect(filter.connect).toHaveBeenCalledWith(gain);
    expect(thrustSound).toBeTruthy();
    expect(thrustSound?.osc).toBe(osc);
    expect(thrustSound?.gain).toBe(gain);
  });

  it("stops jetpack thrust with fade and handles null input", () => {
    const { ctx, osc, gain } = makeContext();

    stopJetpackThrustSoundImpl(
      {
        osc: osc as unknown as OscillatorNode,
        gain: gain as unknown as GainNode,
      },
      ctx as unknown as AudioContext,
    );

    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(osc.stop).toHaveBeenCalled();

    // null-safe guard branch
    stopJetpackThrustSoundImpl(null, null);
  });

  it("fails safely when audio context creation throws", () => {
    const badCtx = {
      createOscillator: vi.fn(() => {
        throw new Error("no-audio");
      }),
      createGain: vi.fn(),
      createBiquadFilter: vi.fn(() => {
        throw new Error("no-filter");
      }),
      currentTime: 0,
    };

    const sfxGain = { connect: vi.fn() };

    expect(() =>
      playWalkSoundImpl(
        badCtx as unknown as AudioContext,
        sfxGain as unknown as GainNode,
        0.5,
      ),
    ).not.toThrow();

    const thrust = playJetpackThrustSoundImpl(
      badCtx as unknown as AudioContext,
      sfxGain as unknown as GainNode,
      0.5,
    );
    expect(thrust).toBeNull();
  });
});
