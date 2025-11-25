import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBackgroundMusic } from "../musicLayers";

class MockGain {
  gain = { value: 1 };
  setValueAtTime(_v: number, _t: number) {
    void _v;
    void _t;
  }
  linearRampToValueAtTime(_v: number, _t: number) {
    void _v;
    void _t;
  }
  connect() {}
}

class MockOscillator {
  started = false;
  stopped = false;
  type = "sine";
  frequency = {
    value: 440,
    setValueAtTime: (_v: number, _t: number) => {
      void _v;
      void _t;
    },
    exponentialRampToValueAtTime: (_v: number, _t: number) => {
      void _v;
      void _t;
    },
  };
  start = vi.fn(() => {
    this.started = true;
  });
  stop = vi.fn(() => {
    this.stopped = true;
  });
  connect() {}
}

class MockBiquad {
  type = "lowpass";
  frequency = { value: 1000 };
  Q = { value: 1 };
  connect() {}
}

class MockAudioContext {
  destination = {};
  currentTime = 0;
  createGain() {
    return new MockGain();
  }
  createOscillator() {
    return new MockOscillator();
  }
  createBiquadFilter() {
    return new MockBiquad();
  }
}

let originalAudioContext: unknown;

beforeEach(() => {
  originalAudioContext = (globalThis as unknown as Record<string, unknown>)
    .AudioContext;
  (globalThis as unknown as Record<string, unknown>).AudioContext =
    MockAudioContext;
});

afterEach(() => {
  (globalThis as unknown as Record<string, unknown>).AudioContext =
    originalAudioContext;
  vi.resetAllMocks();
});

describe("musicLayers.createBackgroundMusic", () => {
  it("returns a master gain and an array of oscillators", () => {
    const ctx = new (
      globalThis as unknown as { AudioContext: new () => MockAudioContext }
    ).AudioContext();
    const destGain = ctx.createGain();

    const { masterGain, oscillators } = createBackgroundMusic(
      ctx as unknown as AudioContext,
      destGain as unknown as GainNode
    );

    expect(masterGain).toBeTruthy();
    expect(Array.isArray(oscillators)).toBe(true);
    expect(oscillators.length).toBeGreaterThan(0);

    // Start them and ensure start method exists
    oscillators.forEach((o) => {
      expect(typeof o.start).toBe("function");
    });
  });
});
