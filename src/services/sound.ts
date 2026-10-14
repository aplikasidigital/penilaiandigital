// Sound synthesis service using Web Audio API for clicks, fanfares, and coin sounds,
// along with HTML5 Audio for custom audio files and background music (BGM).

class SoundService {
  private audioCtx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private currentBgmUrl: string = '';

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
    }
  }

  public playClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // AudioContext unavailable or error
    }
  }

  public playVoteCoin(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio error
    }
  }

  public playSuccessFanfare(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const duration = 0.12;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * duration);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * duration);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx + 1) * duration + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * duration);
        osc.stop(ctx.currentTime + (idx + 1) * duration + 0.1);
      });
    } catch {
      // Ignore audio error
    }
  }

  public playCustomAudio(audioSource: string): void {
    if (this.isMuted || !audioSource) return;
    try {
      const sound = new Audio(audioSource);
      sound.volume = 0.7;
      sound.play().catch(() => {});
    } catch {
      // Ignore
    }
  }

  public startGlobalBGM(url: string): void {
    if (typeof window === 'undefined') return;
    if (!url) {
      this.stopGlobalBGM();
      return;
    }
    if (this.currentBgmUrl === url && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    this.stopGlobalBGM();
    this.currentBgmUrl = url;

    try {
      this.bgmAudio = new Audio(url);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.35;
      this.bgmAudio.muted = this.isMuted;
      this.bgmAudio.play().catch(() => {
        // Autoplay policy might block until user gesture
      });
    } catch {
      // Ignore
    }
  }

  public stopGlobalBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgmUrl = '';
  }

  public setBgmVolume(volume: number): void {
    if (this.bgmAudio) {
      this.bgmAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

export const soundService = new SoundService();
