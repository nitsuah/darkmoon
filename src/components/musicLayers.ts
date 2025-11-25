/**
 * Small helper to create the background music layers used by SoundManager.
 * Returns the master gain and the array of created oscillators so the caller
 * can start/stop them or perform fades.
 */
export function createBackgroundMusic(
  ctx: AudioContext,
  destinationGain: GainNode
): { masterGain: GainNode; oscillators: OscillatorNode[] } {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(destinationGain);

  // Deep space drone (very low frequencies)
  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone1.type = "sine";
  drone1.frequency.value = 55;
  drone2.type = "sine";
  drone2.frequency.value = 82.5;
  droneGain.gain.value = 0.4;
  drone1.connect(droneGain);
  drone2.connect(droneGain);
  droneGain.connect(masterGain);

  // Mid-range ethereal pad
  const pad1 = ctx.createOscillator();
  const pad2 = ctx.createOscillator();
  const pad3 = ctx.createOscillator();
  const padGain = ctx.createGain();
  const padFilter = ctx.createBiquadFilter();

  pad1.type = "triangle";
  pad1.frequency.value = 220;
  pad2.type = "triangle";
  pad2.frequency.value = 329.63;
  pad3.type = "triangle";
  pad3.frequency.value = 277.18;

  padFilter.type = "lowpass";
  padFilter.frequency.value = 1200;
  padFilter.Q.value = 0.5;
  padGain.gain.value = 0.25;

  pad1.connect(padFilter);
  pad2.connect(padFilter);
  pad3.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(masterGain);

  // Subtle shimmer (high frequencies)
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  const shimmerFilter = ctx.createBiquadFilter();
  shimmer.type = "sine";
  shimmer.frequency.value = 880;
  shimmerFilter.type = "highpass";
  shimmerFilter.frequency.value = 800;
  shimmerGain.gain.value = 0.08;
  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(masterGain);

  // LFO for slow filter sweep
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.1;
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(padFilter.frequency);

  // LFO for shimmer tremolo
  const shimmerLfo = ctx.createOscillator();
  const shimmerLfoGain = ctx.createGain();
  shimmerLfo.type = "sine";
  shimmerLfo.frequency.value = 0.3;
  shimmerLfoGain.gain.value = 0.03;
  shimmerLfo.connect(shimmerLfoGain);
  shimmerLfoGain.connect(shimmerGain.gain);

  const oscillators: OscillatorNode[] = [
    drone1,
    drone2,
    pad1,
    pad2,
    pad3,
    shimmer,
    lfo,
    shimmerLfo,
  ];

  return { masterGain, oscillators };
}
