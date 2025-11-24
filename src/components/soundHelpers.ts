export function clamp01(v: number) {
  if (Number.isNaN(v) || !isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function applyVolumes(
  musicGain: { gain: { value: number } } | null,
  sfxGain: { gain: { value: number } } | null,
  musicVolume: number,
  sfxVolume: number,
  masterVolume: number,
  isMuted: boolean
) {
  if (musicGain) {
    musicGain.gain.value = isMuted
      ? 0
      : clamp01(musicVolume) * clamp01(masterVolume);
  }
  if (sfxGain) {
    sfxGain.gain.value = isMuted
      ? 0
      : clamp01(sfxVolume) * clamp01(masterVolume);
  }
}
