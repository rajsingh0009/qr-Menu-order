// ==============================================================================
// Web Audio API Sound Synthesizer for Loud Restaurant Order Alerts
// Unlocks with user gesture, loops cleanly until stopped, zero external dependencies.
// ==============================================================================

class SoundService {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isUnlocked = false;

  public init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public async unlock(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('Could not resume AudioContext', err);
      }
    }

    // Play a brief silent sound to unlock iOS/Chrome audio autoplay
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.001; // nearly silent
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  public getUnlocked(): boolean {
    return this.isUnlocked && this.ctx?.state === 'running';
  }

  // Play a crisp two-tone restaurant service bell chime
  public playChime(volume = 1.0) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const vol = Math.min(Math.max(volume, 0.1), 1.0);

    // Note 1: High crisp chime (880 Hz / A5)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // Sweep to C6

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.7 * vol, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Note 2: Harmonic ring (1318.5 Hz / E6)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.15);

    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.9 * vol, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);

    // Note 3: Urgent lower attention tap (587 Hz / D5)
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(587.33, now + 0.3);

    gain3.gain.setValueAtTime(0, now + 0.3);
    gain3.gain.linearRampToValueAtTime(0.5 * vol, now + 0.33);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc3.connect(gain3);
    gain3.connect(this.ctx.destination);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.7);
  }

  // Loud repeating alert until owner acts
  public startAlarm(volume = 1.0) {
    this.stopAlarm();
    this.playChime(volume);
    this.intervalId = setInterval(() => {
      this.playChime(volume);
    }, 2200);
  }

  public stopAlarm() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const SoundAlert = new SoundService();
