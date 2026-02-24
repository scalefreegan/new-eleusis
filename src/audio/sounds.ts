/**
 * SoundManager using Web Audio API with synthesized sounds
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
  }

  getVolume(): number {
    return this.volume;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a click sound (card placement)
   */
  playCardPlace() {
    if (!this.enabled) return;

    const ctx = this.initContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.type = 'sine';

    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  /**
   * Play ascending chime (correct card)
   */
  playCorrect() {
    if (!this.enabled) return;

    const ctx = this.initContext();
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.type = 'sine';

      gain.gain.setValueAtTime(this.volume * 0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  /**
   * Play descending buzz (wrong card)
   */
  playWrong() {
    if (!this.enabled) return;

    const ctx = this.initContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
    osc.type = 'sawtooth';

    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  /**
   * Play fanfare (prophet declaration)
   */
  playProphetDeclare() {
    if (!this.enabled) return;

    const ctx = this.initContext();
    const notes = [
      { freq: 523.25, time: 0 },    // C5
      { freq: 659.25, time: 0.1 },  // E5
      { freq: 783.99, time: 0.2 },  // G5
      { freq: 1046.5, time: 0.3 },  // C6
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + time;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.type = 'triangle';

      gain.gain.setValueAtTime(this.volume * 0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /**
   * Play dramatic chord (game over)
   */
  playGameOver() {
    if (!this.enabled) return;

    const ctx = this.initContext();
    const chord = [261.63, 329.63, 392.00]; // C4, E4, G4

    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'triangle';

      gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    });
  }
}

// Export singleton instance
export const sounds = new SoundManager();
