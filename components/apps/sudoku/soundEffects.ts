class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('durgasos_sudoku_sound_muted', muted ? 'true' : 'false');
    }
  }

  getMute() {
    return this.isMuted;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('durgasos_sudoku_sound_muted') === 'true';
    }
  }

  play(type: 'place' | 'note' | 'win' | 'hint' | 'error' | 'click') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    try {
      switch (type) {
        case 'place': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5 (subtle tap)

          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
        case 'note': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(698.46, now + 0.02); // F5
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, now);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
        case 'error': {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(130.81, now); // C3
          osc1.frequency.linearRampToValueAtTime(110.0, now + 0.2); // A2
          osc2.frequency.setValueAtTime(131.81, now);
          osc2.frequency.linearRampToValueAtTime(111.0, now + 0.2);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.22);
          osc2.stop(now + 0.22);
          break;
        }
        case 'hint': {
          const notes = [587.33, 659.25, 783.99, 987.77, 1174.66]; // D5, E5, G5, B5, D6
          notes.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.03, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.35);
          });
          break;
        }
        case 'win': {
          const root = 261.63; // C4
          const intervals = [1, 1.25, 1.5, 2, 2.5, 3, 4]; // C4, E4, G4, C5, E5, G5, C6
          intervals.forEach((ratio, idx) => {
            const delay = idx * 0.1;
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(root * ratio, now + delay);
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.04, now + delay + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.7);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('Audio Context failed to play sound stream', e);
    }
  }
}

export const soundEffects = new SoundManager();
