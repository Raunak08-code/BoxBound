class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setPreferences(sound: boolean, music: boolean): void {
    this.soundEnabled = sound;
    this.musicEnabled = music;
    if (!music) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled && this.musicTimer === null) {
      this.startMusic();
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFreq?: number,
    delay = 0,
  ): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        startTime + duration,
      );
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playMove(): void {
    this.playTone(290, 0.065, 'triangle', 0.07, 360);
  }

  public playPush(reachedTarget: boolean): void {
    this.playTone(150, 0.11, 'triangle', 0.12, 105);
    this.playTone(220, 0.08, 'sine', 0.07, 180, 0.02);
    if (reachedTarget) {
      this.playTone(523.25, 0.14, 'sine', 0.1, 659.25, 0.04);
      this.playTone(783.99, 0.18, 'triangle', 0.09, undefined, 0.1);
    }
  }

  public playBump(): void {
    this.playTone(110, 0.09, 'sawtooth', 0.055, 72);
  }

  public playUndo(): void {
    this.playTone(440, 0.08, 'sine', 0.07, 310);
  }

  public playClick(): void {
    this.playTone(520, 0.045, 'triangle', 0.06, 620);
  }

  public playLevelComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'triangle', 0.11, undefined, idx * 0.085);
    });
  }

  public startMusic(): void {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    if (typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Gentle cozy pentatonic puzzle groove (C major pentatonic)
    const melody = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 392.0];
    const bass = [130.81, 0, 146.83, 0, 164.81, 0, 146.83, 0];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const audio = this.ensureContext();
      if (!audio || audio.state !== 'running') return;

      const idx = this.musicStep % melody.length;
      const melFreq = melody[idx];
      const bassFreq = bass[idx];

      this.playMusicNote(melFreq, 0.26, 'sine', 0.025);
      if (bassFreq > 0) {
        this.playMusicNote(bassFreq, 0.42, 'triangle', 0.022);
      }
      this.musicStep++;
    }, 460);
  }

  private playMusicNote(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
