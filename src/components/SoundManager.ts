/**
 * SoundManager - Handles all game audio
 * Uses Web Audio API for sound effects and background music
 */

/* eslint-disable no-undef */
class SoundManager {
  private audioContext: AudioContext | null = null;
  private backgroundMusic: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private masterVolume: number = 0.3;
  private musicVolume: number = 0.15;
  private sfxVolume: number = 0.2;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== "undefined") {
      this.initAudioContext();
    }
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
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Start background music (ambient space-themed procedural music)
   */
  public startBackgroundMusic() {
    if (!this.audioContext || this.isMusicPlaying || this.isMuted) return;

    try {
      this.resumeAudioContext();

      // Create space-themed ambient music with multiple layers
      const masterGain = this.audioContext.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(this.musicGain!);

      // Deep space drone (very low frequencies)
      const drone1 = this.audioContext.createOscillator();
      const drone2 = this.audioContext.createOscillator();
      const droneGain = this.audioContext.createGain();
      drone1.type = "sine";
      drone1.frequency.value = 55; // A1 - very deep
      drone2.type = "sine";
      drone2.frequency.value = 82.5; // E2 - perfect fifth
      droneGain.gain.value = 0.4;
      drone1.connect(droneGain);
      drone2.connect(droneGain);
      droneGain.connect(masterGain);

      // Mid-range ethereal pad
      const pad1 = this.audioContext.createOscillator();
      const pad2 = this.audioContext.createOscillator();
      const pad3 = this.audioContext.createOscillator();
      const padGain = this.audioContext.createGain();
      const padFilter = this.audioContext.createBiquadFilter();

      pad1.type = "triangle";
      pad1.frequency.value = 220; // A3
      pad2.type = "triangle";
      pad2.frequency.value = 329.63; // E4
      pad3.type = "triangle";
      pad3.frequency.value = 277.18; // C#4 - adds mystery

      padFilter.type = "lowpass";
      padFilter.frequency.value = 1200;
      padFilter.Q.value = 0.5;
      padGain.gain.value = 0.25;

      pad1.connect(padFilter);
      pad2.connect(padFilter);
      pad3.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(masterGain);

      // Subtle shimmer (high frequencies for space atmosphere)
      const shimmer = this.audioContext.createOscillator();
      const shimmerGain = this.audioContext.createGain();
      const shimmerFilter = this.audioContext.createBiquadFilter();
      shimmer.type = "sine";
      shimmer.frequency.value = 880; // A5
      shimmerFilter.type = "highpass";
      shimmerFilter.frequency.value = 800;
      shimmerGain.gain.value = 0.08;
      shimmer.connect(shimmerFilter);
      shimmerFilter.connect(shimmerGain);
      shimmerGain.connect(masterGain);

      // LFO for slow filter sweep (creates movement/breathing)
      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.1; // Very slow - 10 second cycle
      lfoGain.gain.value = 200; // Sweep range
      lfo.connect(lfoGain);
      lfoGain.connect(padFilter.frequency);

      // LFO for shimmer tremolo
      const shimmerLfo = this.audioContext.createOscillator();
      const shimmerLfoGain = this.audioContext.createGain();
      shimmerLfo.type = "sine";
      shimmerLfo.frequency.value = 0.3; // Faster shimmer
      shimmerLfoGain.gain.value = 0.03;
      shimmerLfo.connect(shimmerLfoGain);
      shimmerLfoGain.connect(shimmerGain.gain);

      // Store all oscillators in array for easier management
      const oscillators = [
        drone1,
        drone2,
        pad1,
        pad2,
        pad3,
        shimmer,
        lfo,
        shimmerLfo,
      ];

      // Start all oscillators
      oscillators.forEach((osc) => osc.start());

      // Fade in music - increased from 3s to 5s for smoother start
      masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      masterGain.gain.linearRampToValueAtTime(
        1.0,
        this.audioContext.currentTime + 5.0
      );

      // Store reference to first oscillator for backwards compatibility
      this.backgroundMusic = drone1;
      this.isMusicPlaying = true;
    } catch (error) {
      console.error("Failed to start background music:", error);
    }
  }

  /**
   * Stop background music (with fade out)
   */
  public stopBackgroundMusic() {
    if (this.backgroundMusic && this.audioContext && this.musicGain) {
      try {
        // Fade out over 4 seconds - increased from 2s for smoother end
        const fadeOutTime = 4.0;
        this.musicGain.gain.linearRampToValueAtTime(
          0,
          this.audioContext.currentTime + fadeOutTime
        );

        // Stop after fade completes
        setTimeout(() => {
          if (this.backgroundMusic) {
            try {
              this.backgroundMusic.stop();
            } catch {
              // Oscillator may already be stopped - silently continue
            }
            this.backgroundMusic = null;
          }
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
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.value = 80 + Math.random() * 20; // Random variation

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.3,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.15
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.15);
    } catch {
      // Silently fail for sound effects
    }
  }

  /**
   * Play jump sound effect
   */
  public playJumpSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        400,
        this.audioContext.currentTime + 0.1
      );

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.5,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.2
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.2);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play landing sound effect
   */
  public playLandSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        50,
        this.audioContext.currentTime + 0.15
      );

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.15
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.15);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play tag sound (when player tags another) - SUCCESS VERSION
   */
  public playTagSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        880,
        this.audioContext.currentTime + 0.1
      );
      osc.frequency.exponentialRampToValueAtTime(
        440,
        this.audioContext.currentTime + 0.2
      );

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.7,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.3
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.3);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play tagged sound (when player gets tagged) - FAILURE VERSION
   */
  public playTaggedSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Descending tone for "you got tagged"
      osc.type = "square";
      osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        220,
        this.audioContext.currentTime + 0.15
      );

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.25
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.25);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play jetpack activation sound (double-jump trigger)
   */
  public playJetpackActivateSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Whoosh-like sound with filter sweep
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        300,
        this.audioContext.currentTime + 0.2
      );

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        2000,
        this.audioContext.currentTime + 0.2
      );
      filter.Q.value = 5;

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.5,
        this.audioContext.currentTime + 0.05
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.3
      );

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.3);
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
    if (!this.audioContext || this.isMuted) return null;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      // Constant thrust noise
      osc.type = "sawtooth";
      osc.frequency.value = 80;

      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 2;

      // Fade in quickly
      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.3,
        this.audioContext.currentTime + 0.05
      );

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);

      return { osc, gain: gainNode };
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
    if (!thrustSound || !this.audioContext) return;

    try {
      // Fade out quickly
      thrustSound.gain.gain.linearRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.1
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
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Short burst
      osc.type = "square";
      osc.frequency.value = 150;

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.25,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.08
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.08);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play sprint footstep sound (faster, higher pitch than walk)
   */
  public playSprintSound() {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.value = 120 + Math.random() * 30; // Higher than walk

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.35,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.12
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.12);
    } catch {
      // Silently fail
    }
  }

  /**
   * Play landing thud sound (scaled by velocity)
   */
  public playLandingSoundScaled(velocity: number) {
    if (!this.audioContext || this.isMuted) return;

    try {
      this.resumeAudioContext();

      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Scale impact by velocity (clamp between 0.1 and 1.0)
      const impact = Math.min(1.0, Math.max(0.1, velocity * 2));

      osc.type = "sine";
      osc.frequency.setValueAtTime(180, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        40,
        this.audioContext.currentTime + 0.2
      );

      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        this.sfxVolume * 0.6 * impact,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.2
      );

      osc.connect(gainNode);
      gainNode.connect(this.sfxGain!);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.2);
    } catch {
      // Silently fail
    }
  }

  /**
   * Toggle mute
   */
  public toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.sfxGain && this.musicGain) {
      this.sfxGain.gain.value = this.isMuted ? 0 : this.sfxVolume;
      this.musicGain.gain.value = this.isMuted ? 0 : this.musicVolume;
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
    if (this.musicGain && !this.isMuted) {
      this.musicGain.gain.value = this.musicVolume * this.masterVolume;
    }
    if (this.sfxGain && !this.isMuted) {
      this.sfxGain.gain.value = this.sfxVolume * this.masterVolume;
    }
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
