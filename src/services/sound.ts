// Sound synthesis service using Web Audio API for clicks, fanfares, and coin sounds,
// along with HTML5 Audio for custom audio files and background music (BGM).

class SoundService {
  private audioCtx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private currentBgmUrl: string = '';
  private bgmVolume: number = 0.35;
  private isBgmPlayingState: boolean = false;
  private synthGainNode: GainNode | null = null;
  private synthTimer: any = null;
  private activeSynthNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private stateListeners: Set<() => void> = new Set();

  private notifyStateChange(): void {
    this.stateListeners.forEach(listener => {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public isBgmPlaying(): boolean {
    if (this.bgmAudio) {
      return !this.bgmAudio.paused;
    }
    return this.isBgmPlayingState;
  }

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

  public playError(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
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

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
    }
    if (this.synthGainNode && this.audioCtx) {
      this.synthGainNode.gain.setValueAtTime(
        muted ? 0 : this.bgmVolume * 0.15,
        this.audioCtx.currentTime
      );
    }
    this.notifyStateChange();
  }

  public setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
    if (this.synthGainNode && this.audioCtx && !this.isMuted) {
      this.synthGainNode.gain.setValueAtTime(
        this.bgmVolume * 0.15,
        this.audioCtx.currentTime
      );
    }
    this.notifyStateChange();
  }

  public async startGlobalBGM(url?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // If an audio file URL is supplied (e.g. uploaded by Admin in Settings)
    if (url && url.trim().length > 0) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // YouTube URLs are managed by BackgroundMusicPlayer via YouTube IFrame API
        this.currentBgmUrl = url;
        this.isBgmPlayingState = true;
        this.notifyStateChange();
        return true;
      }

      this.stopSynthBGM();
      if (this.currentBgmUrl === url && this.bgmAudio) {
        if (this.bgmAudio.paused) {
          try {
            await this.bgmAudio.play();
            this.isBgmPlayingState = true;
            this.notifyStateChange();
            return true;
          } catch {
            this.isBgmPlayingState = false;
            this.notifyStateChange();
            return false;
          }
        }
        return true;
      }

      this.stopGlobalBGM();
      this.currentBgmUrl = url;

      try {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = this.bgmVolume;
        audio.muted = this.isMuted;
        this.bgmAudio = audio;

        audio.addEventListener('play', () => {
          this.isBgmPlayingState = true;
          this.notifyStateChange();
        });
        audio.addEventListener('pause', () => {
          this.isBgmPlayingState = false;
          this.notifyStateChange();
        });
        audio.addEventListener('ended', () => {
          this.isBgmPlayingState = false;
          this.notifyStateChange();
        });

        await audio.play();
        this.isBgmPlayingState = true;
        this.notifyStateChange();
        return true;
      } catch {
        this.isBgmPlayingState = false;
        this.notifyStateChange();
        return false;
      }
    }

    // Otherwise, play the default ambient harmonic background loop via Web Audio API
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
    }
    this.currentBgmUrl = '';

    return this.startSynthBGM();
  }

  private startSynthBGM(): boolean {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      this.stopSynthBGM();

      // Master BGM gain node
      const masterBgmGain = ctx.createGain();
      const initialGain = this.isMuted ? 0 : this.bgmVolume * 0.15;
      masterBgmGain.gain.setValueAtTime(initialGain, ctx.currentTime);
      masterBgmGain.connect(ctx.destination);
      this.synthGainNode = masterBgmGain;

      // Chord progressions for soothing, continuous looping ambient background music:
      // Chord 1: C major (C4, E4, G4, B4)
      // Chord 2: A minor 7 (A3, C4, E4, G4)
      // Chord 3: F major 7 (F3, A3, C4, E4)
      // Chord 4: G add9 (G3, B3, D4, A4)
      const chords = [
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 329.63],
        [196.00, 246.94, 293.66, 440.00],
      ];

      let chordIdx = 0;

      const playChord = () => {
        if (!this.synthGainNode || !this.audioCtx) return;
        const currentCtx = this.audioCtx;
        const now = currentCtx.currentTime;
        const notes = chords[chordIdx % chords.length];
        chordIdx++;

        // Clean up older completed nodes
        this.activeSynthNodes = this.activeSynthNodes.filter(item => {
          try {
            item.osc.stop();
          } catch {}
          return false;
        });

        // Play gentle soft tones with slow attack and release
        notes.forEach((freq, i) => {
          try {
            const osc = currentCtx.createOscillator();
            const noteGain = currentCtx.createGain();

            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            // Detune slightly for lush warmth
            osc.detune.setValueAtTime((i - 1.5) * 4, now);

            // Envelope: 1.2s attack, 3.5s hold/decay
            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.linearRampToValueAtTime(0.04 / (i + 1), now + 1.2);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

            osc.connect(noteGain);
            noteGain.connect(this.synthGainNode!);

            osc.start(now);
            osc.stop(now + 4.6);

            this.activeSynthNodes.push({ osc, gain: noteGain });
          } catch {}
        });
      };

      // Play first chord immediately
      playChord();

      // Loop every 3.8 seconds continuously
      this.synthTimer = setInterval(playChord, 3800);

      this.isBgmPlayingState = true;
      this.notifyStateChange();
      return true;
    } catch {
      this.isBgmPlayingState = false;
      this.notifyStateChange();
      return false;
    }
  }

  private stopSynthBGM(): void {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    this.activeSynthNodes.forEach(item => {
      try {
        item.osc.stop();
      } catch {}
    });
    this.activeSynthNodes = [];
    if (this.synthGainNode) {
      try {
        this.synthGainNode.disconnect();
      } catch {}
      this.synthGainNode = null;
    }
  }

  public pauseBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.stopSynthBGM();
    this.isBgmPlayingState = false;
    this.notifyStateChange();
  }

  public async resumeBGM(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }
    return this.startGlobalBGM(this.currentBgmUrl);
  }

  public stopGlobalBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.stopSynthBGM();
    this.currentBgmUrl = '';
    this.isBgmPlayingState = false;
    this.notifyStateChange();
  }
}

export const soundService = new SoundService();
