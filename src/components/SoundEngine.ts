// Minimal wrapper around Web Audio API operations used by SoundManager
// Keeps the heavy WebAudio wiring in an isolated module to make testing easier.

export default class SoundEngine {
  audioContext: AudioContext | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;

  init() {
    try {
      if (
        typeof window === "undefined" ||
        (!(window as unknown as { AudioContext?: typeof AudioContext })
          .AudioContext &&
          !(window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
      ) {
        return;
      }

      const W = window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctx =
        (window as unknown as { AudioContext?: typeof AudioContext })
          .AudioContext || W.webkitAudioContext!;
      this.audioContext = new Ctx();

      this.musicGain = this.audioContext!.createGain();
      this.musicGain!.connect(this.audioContext!.destination);

      this.sfxGain = this.audioContext!.createGain();
      this.sfxGain!.connect(this.audioContext!.destination);
    } catch (e) {
      // best-effort
      void e;
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  close() {
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        void e;
      }
      this.audioContext = null;
    }
  }
}
