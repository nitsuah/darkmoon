import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create a minimal mock AudioContext and related nodes to observe start/stop and gain ramps

class MockOscillator {
  started = false;
  stopped = false;
  type: string = "sine";
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
  start = vi.fn((t?: number) => {
    void t;
    this.started = true;
  });
  stop = vi.fn((t?: number) => {
    void t;
    this.stopped = true;
  });
  connect() {}
}

class MockGain {
  gain: {
    value: number;
    setValueAtTime: (v: number, t: number) => void;
    linearRampToValueAtTime: (v: number, t: number) => void;
    exponentialRampToValueAtTime: (v: number, t: number) => void;
  };
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: (_v: number, _t: number) => {},
      linearRampToValueAtTime: (_v: number, _t: number) => {},
      exponentialRampToValueAtTime: (_v: number, _t: number) => {},
    };
  }
  connect() {}
}
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

let originalAudioContext: unknown;


beforeEach(() => {
  originalAudioContext = (globalThis as any).AudioContext;
  (globalThis as any).AudioContext = MockAudioContext;
  // Patch window for SoundManager browser checks
  if (!(globalThis as any).window) {
    (globalThis as any).window = {};
  }
  (globalThis as any).window.AudioContext = MockAudioContext;
  vi.useFakeTimers();
  vi.resetModules();
});


afterEach(() => {
  (globalThis as any).AudioContext = originalAudioContext;
  if ((globalThis as any).window) {
    delete (globalThis as any).window.AudioContext;
  }
  vi.useRealTimers();
});

describe("SoundManager background music lifecycle", () => {
  it("starts and stops background music with expected oscillator lifecycle", async () => {
    const mod = await import("../../components/SoundManager");
    const SoundManager = mod.default;

    const sm = new SoundManager();

    // start music
    sm.startBackgroundMusic();

    // internal flags should be set
    expect((sm as unknown as Record<string, unknown>).isMusicPlaying).toBe(
      true
    );
    expect(
      (sm as unknown as Record<string, unknown>).backgroundMusic
    ).not.toBeNull();

    // the created oscillators should have been started (we created many; check that at least one started)
    const osc = (sm as unknown as Record<string, unknown>).backgroundMusic as
      | MockOscillator
      | undefined;
    expect(osc).toBeDefined();
    expect(osc!.started).toBe(true);

    // call stop and advance fake timers to simulate fade-out completion
    sm.stopBackgroundMusic();

    // fadeOutTime is 4s in implementation; advance timers
    vi.advanceTimersByTime(4500);

    // After timers, stop should have been invoked on the stored oscillator
    expect(osc!.stop).toHaveBeenCalled();
    expect((sm as unknown as Record<string, unknown>).isMusicPlaying).toBe(
      false
    );
  });
});
