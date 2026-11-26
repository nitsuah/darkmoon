import { describe, it, expect, vi } from "vitest";
import { createOscillatorWithGain } from "../components/soundNodeFactory";

function makeContext() {
  const osc = {
    type: "",
    frequency: { value: 0 },
    connect: vi.fn(),
  };
  const gain = { gain: { value: 1 }, connect: vi.fn() };
  const ctx = {
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
  };
  return { ctx: ctx as unknown as AudioContext, rawCtx: ctx, osc, gain };
}

describe("createOscillatorWithGain", () => {
  it("returns the nodes the context created, calling each factory once", () => {
    const { ctx, rawCtx, osc, gain } = makeContext();
    const result = createOscillatorWithGain(ctx, "sine", 440);
    expect(result.osc).toBe(osc);
    expect(result.gain).toBe(gain);
    expect(rawCtx.createOscillator).toHaveBeenCalledTimes(1);
    expect(rawCtx.createGain).toHaveBeenCalledTimes(1);
  });

  it("sets the oscillator type", () => {
    const { ctx, osc } = makeContext();
    createOscillatorWithGain(ctx, "sawtooth");
    expect(osc.type).toBe("sawtooth");
  });

  it("sets frequency.value for numeric values, including 0", () => {
    const first = makeContext();
    createOscillatorWithGain(first.ctx, "sine", 880);
    expect(first.osc.frequency.value).toBe(880);

    const zero = makeContext();
    zero.osc.frequency.value = 123;
    createOscillatorWithGain(zero.ctx, "sine", 0);
    expect(zero.osc.frequency.value).toBe(0);
  });

  it("leaves the frequency untouched when none is given", () => {
    const { ctx, osc } = makeContext();
    osc.frequency.value = 55;
    createOscillatorWithGain(ctx, "sine");
    expect(osc.frequency.value).toBe(55);
  });

  it("does not throw when assigning frequency.value throws", () => {
    const { ctx, osc } = makeContext();
    Object.defineProperty(osc.frequency, "value", {
      configurable: true,
      get: () => 0,
      set: () => {
        throw new Error("read-only");
      },
    });
    expect(() => createOscillatorWithGain(ctx, "sine", 440)).not.toThrow();
  });

  it("does not connect either node", () => {
    const { ctx, osc, gain } = makeContext();
    createOscillatorWithGain(ctx, "sine", 440);
    expect(osc.connect).not.toHaveBeenCalled();
    expect(gain.connect).not.toHaveBeenCalled();
  });
});
