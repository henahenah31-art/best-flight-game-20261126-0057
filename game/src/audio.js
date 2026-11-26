// Synthesised sound only (WebAudio, no files): engine hum, ring chime, landing
// fanfare, crash thud. Silent until the first user gesture (autoplay policy);
// screenshot mode never starts audio.
export class Sound {
  constructor() {
    this.ctx = null; this.engine = null; this.engineGain = null; this.enabled = false;
  }
  unlock() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.enabled = true;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      osc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      osc.start();
      this.engine = osc;
      this.engineFilter = filt;
    } catch { this.enabled = false; }
  }
  setEngine(throttle, speed) {
    if (!this.enabled || !this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.4, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(240 + throttle * 700, t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.015 + throttle * 0.05, t, 0.15);
  }
  blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  ring() { this.blip(880, 0.25); setTimeout(() => this.blip(1318, 0.35), 90); }
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.4, 'triangle', 0.14), i * 120));
  }
  crash() { this.blip(70, 0.5, 'sawtooth', 0.2); }
  stopEngine() {
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }
}
