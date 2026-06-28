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
      setValueAtTime: (_v: number, _t: number) => {
        void _v;
        void _t;
      },
      linearRampToValueAtTime: (_v: number, _t: number) => {
        void _v;
        void _t;
      },
      exponentialRampToValueAtTime: (_v: number, _t: number) => {
        void _v;
        void _t;
      },
    };
  }
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
  state: "closed" | "running" | "suspended" = "suspended";

  createGain() {
    return new MockGain();
  }

  createOscillator() {
    return new MockOscillator();
  }

  createBiquadFilter() {
    return new MockBiquad();
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

type GlobalWithAudioContext = Record<string, unknown> & {
  window?: Record<string, unknown>;
};

let originalAudioContext: unknown;

beforeEach(() => {
  const globalWithAudioContext =
    globalThis as unknown as GlobalWithAudioContext;
  originalAudioContext = globalWithAudioContext.AudioContext;
  globalWithAudioContext.AudioContext = MockAudioContext;
  // Patch window for SoundManager browser checks
  if (!globalWithAudioContext.window) {
    globalWithAudioContext.window = {};
  }
  globalWithAudioContext.window.AudioContext = MockAudioContext;
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  const globalWithAudioContext =
    globalThis as unknown as GlobalWithAudioContext;
  globalWithAudioContext.AudioContext = originalAudioContext;
  if (globalWithAudioContext.window) {
    delete globalWithAudioContext.window.AudioContext;
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
      true,
    );
    expect(
      (sm as unknown as Record<string, unknown>).backgroundMusic,
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
      false,
    );
  });
});
