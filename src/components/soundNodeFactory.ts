export function createOscillatorWithGain(
  ctx: AudioContext,
  type: string,
  frequency?: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  // Helper to set oscillator.type without referencing the global OscillatorType or using `any`.
  const setOscType = (o: OscillatorNode, t: string) => {
    (o as unknown as { type: string }).type = t;
  };
  setOscType(osc, type);
  if (typeof frequency === "number") {
    try {
      osc.frequency.value = frequency;
    } catch {
      /* ignore in tests */
    }
  }

  // Do NOT auto-connect here. Caller decides whether to route through filters etc.
  return { osc, gain };
}
