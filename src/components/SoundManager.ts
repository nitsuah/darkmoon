/**
 * SoundManager - Handles all game audio
 * Uses Web Audio API for sound effects and background music
 */

/* eslint-disable no-undef */
import SoundEngine from "./SoundEngine";
import { applyVolumes } from "./soundHelpers";
import { createOscillatorWithGain } from "./soundNodeFactory";
import { createBackgroundMusic } from "./musicLayers";
class SoundManager {
  private audioContext: AudioContext | null = null;
  private backgroundMusic: OscillatorNode | null = null;
  private backgroundOscillators: OscillatorNode[] | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engine: SoundEngine | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private masterVolume: number = 0.3;
  private musicVolume: number = 0.15;
  private sfxVolume: number = 0.2;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== "undefined") {
      this.initAudioContext();
      this.engine = new SoundEngine();
      this.engine.init();
    }
  }

  // Prefer engine-managed audio objects when available (engine.init creates them)
  private getAudioContext(): AudioContext | null {
    return this.engine?.audioContext ?? this.audioContext;
  }

  private getMusicGain(): GainNode | null {
    return this.engine?.musicGain ?? this.musicGain;
  }

  private getSfxGain(): GainNode | null {
    return this.engine?.sfxGain ?? this.sfxGain;
  }

  private initAudioContext() {
    try {
      // Check if AudioContext is available (won't be in test environment)
      if (
        typeof window === "undefined" ||
        (!window.AudioContext &&
          !(window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
      ) {
        return;
      }

      const WindowWithAudio = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      this.audioContext = new (window.AudioContext ||
        WindowWithAudio.webkitAudioContext!)();

      // Create gain nodes for volume control
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.audioContext.destination);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }

  /**
   * Ensure audio context is running (required after user interaction on some browsers)
   */
  public async resumeAudioContext() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  }

  /**
   * Start background music (ambient space-themed procedural music)
   */
  public startBackgroundMusic() {
    const ctx = this.getAudioContext();
    const musicGain = this.getMusicGain();
    if (!ctx || !musicGain || this.isMusicPlaying || this.isMuted) return;

    try {
      this.resumeAudioContext();

      // Use helper to build music layers and get oscillators
      const { masterGain, oscillators } = createBackgroundMusic(
        ctx,
        musicGain!
      );

      // Start oscillators
      oscillators.forEach((osc) => osc.start());

      // Fade in music
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 5.0);

      // Store reference to first oscillator and the oscillator list
      this.backgroundMusic = oscillators[0] ?? null;
      this.backgroundOscillators = oscillators;
      this.isMusicPlaying = true;
    } catch (error) {
      console.error("Failed to start background music:", error);
    }
  }

  /**
   * Stop background music (with fade out)
   */
  public stopBackgroundMusic() {
    const ctx = this.getAudioContext();
    const musicGain = this.getMusicGain();
    if (this.backgroundOscillators && ctx && musicGain) {
      try {
        // Fade out over 4 seconds - increased from 2s for smoother end
        const fadeOutTime = 4.0;
        musicGain.gain.linearRampToValueAtTime(
          0,
          ctx.currentTime + fadeOutTime
        );

        // Stop after fade completes
        setTimeout(() => {
          // Stop all created oscillators
          if (this.backgroundOscillators) {
            this.backgroundOscillators.forEach((osc) => {
              try {
                osc.stop();
              } catch {
                // ignore
              }
            });
            this.backgroundOscillators = null;
          }
          this.backgroundMusic = null;
          this.isMusicPlaying = false;

          // Restore music gain for next time
          if (this.musicGain && !this.isMuted) {
            this.musicGain.gain.value = this.musicVolume;
          }
        }, fadeOutTime * 1000);
      } catch (error) {
        console.error("Error stopping music:", error);
      }
    }
  }

  /**
   * Play walking sound effect
   */
  public playWalkSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(
        ctx,
        "sine",
        80 + Math.random() * 20
      );

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.3,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Silently fail for sound effects
    }
  }

  /**
   * Play jump sound effect
   */
  public playJumpSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "square", 200);
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.5,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play landing sound effect
   */
  public playLandSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "sine", 150);
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play tag sound (when player tags another) - SUCCESS VERSION
   */
  public playTagSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 440);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.7,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play tagged sound (when player gets tagged) - FAILURE VERSION
   */
  public playTaggedSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "square", 440);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play jetpack activation sound (double-jump trigger)
   */
  public playJetpackActivateSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 100);
      const filter = ctx.createBiquadFilter();

      // Whoosh-like sound with filter sweep
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        2000,
        ctx.currentTime + 0.2
      );
      filter.Q.value = 5;

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.5,
        ctx.currentTime + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play jetpack thrust sound (sustained while holding space)
   * Returns the oscillator and gain node so they can be stopped
   */
  public playJetpackThrustSound(): {
    osc: OscillatorNode;
    gain: GainNode;
  } | null {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return null;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "sawtooth", 80);
      const filter = ctx.createBiquadFilter();

      // Constant thrust noise
      osc.frequency.value = 80;

      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 2;

      // Fade in quickly
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.3,
        ctx.currentTime + 0.05
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);

      return { osc, gain };
    } catch {
      return null;
    }
  }

  /**
   * Stop jetpack thrust sound (called when space is released)
   */
  public stopJetpackThrustSound(
    thrustSound: {
      osc: OscillatorNode;
      gain: GainNode;
    } | null
  ) {
    const ctx = this.getAudioContext();
    if (!thrustSound || !ctx) return;

    try {
      // Fade out quickly
      thrustSound.gain.gain.linearRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.1
      );

      // Stop after fade
      setTimeout(() => {
        try {
          thrustSound.osc.stop();
        } catch {
          // Already stopped
        }
      }, 100);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play RCS jet burst sound
   */
  public playRCSSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(ctx, "square", 150);

      // Short burst
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.25,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play sprint footstep sound (faster, higher pitch than walk)
   */
  public playSprintSound() {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const { osc, gain } = createOscillatorWithGain(
        ctx,
        "sine",
        120 + Math.random() * 30
      );

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.35,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play landing thud sound (scaled by velocity)
   */
  public playLandingSoundScaled(velocity: number) {
    const ctx = this.getAudioContext();
    const sfxGain = this.getSfxGain();
    if (!ctx || !sfxGain || this.isMuted) return;

    try {
      this.resumeAudioContext();

      // Scale impact by velocity (clamp between 0.1 and 1.0)
      const impact = Math.min(1.0, Math.max(0.1, velocity * 2));

      const { osc, gain } = createOscillatorWithGain(ctx, "sine", 180);
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6 * impact,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(sfxGain!);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Silently fail
    }
  }

  /**
   * Toggle mute
   */
  public toggleMute() {
    this.isMuted = !this.isMuted;

    const sfxGain = this.getSfxGain();
    const musicGain = this.getMusicGain();
    if (sfxGain && musicGain) {
      sfxGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
      musicGain.gain.value = this.isMuted ? 0 : this.musicVolume;
    }

    return this.isMuted;
  }

  /**
   * Set master volume (0-1)
   */
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set music volume (0-1)
   */
  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  /**
   * Set SFX volume (0-1)
   */
  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  private updateVolumes() {
    applyVolumes(
      this.getMusicGain(),
      this.getSfxGain(),
      this.musicVolume,
      this.sfxVolume,
      this.masterVolume,
      this.isMuted
    );
  }

  /**
   * Get mute state
   */
  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Cleanup
   */
  public dispose() {
    this.stopBackgroundMusic();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

export const getSoundManager = (): SoundManager => {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
};

export default SoundManager;
