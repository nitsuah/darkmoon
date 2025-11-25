import { createOscillatorWithGain } from "./soundNodeFactory";

export function playWalkSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(
      ctx,
      "sine",
      80 + Math.random() * 20
    );

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Silently fail for sound effects
  }
}

export function playJumpSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "square", 200);
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore
  }
}

export function playLandSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "sine", 150);
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.6, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}

export function playTagSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 440);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.7, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

export function playTaggedSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "square", 440);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.6, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

export function playJetpackActivateSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 100);
    const filter = ctx.createBiquadFilter();

    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
    filter.Q.value = 5;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

export function playJetpackThrustSoundImpl(
  ctx: AudioContext,
  sfxGain: GainNode,
  sfxVolume: number
) {
  try {
    const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 80);
    const filter = ctx.createBiquadFilter();

    osc.frequency.value = 80;

    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 2;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(sfxVolume * 0.3, ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    osc.start(ctx.currentTime);

    return { osc, gain };
  } catch {
    return null;
  }
}

export function stopJetpackThrustSoundImpl(
  thrustSound: { osc: OscillatorNode; gain: GainNode } | null,
  ctx: AudioContext | null
) {
  if (!thrustSound || !ctx) return;
  try {
    thrustSound.gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    setTimeout(() => {
      try {
        thrustSound.osc.stop();
      } catch {
        // ignore
      }
    }, 100);
  } catch {
    // ignore
  }
}
