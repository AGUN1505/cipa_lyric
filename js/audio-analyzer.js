/**
 * AudioAnalyzer — Web Audio AnalyserNode wrapper.
 * Must be started from a user gesture (autoplay policy). Produces smoothed
 * band energies, RMS level, spectral-flux beat detection and raw buffers.
 */

export class AudioAnalyzer {
  constructor(audioEl) {
    this.audioEl = audioEl;
    this.ctx = null;
    this.analyser = null;
    this.freq = new Uint8Array(1024);
    this.wave = new Uint8Array(2048);

    this.m = {
      level: 0, bass: 0, mid: 0, treble: 0,
      bassRaw: 0, beat: false, beatCount: 0, beatPulse: 0, flux: 0,
      active: false,
    };
    this._prevSpec = new Float32Array(1024);
    this._fluxHist = new Float32Array(43);
    this._fluxIdx = 0;
    this._lastBeat = -1;
  }

  /** Create (or resume) the AudioContext. Safe to call repeatedly. */
  async start() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      const src = this.ctx.createMediaElementSource(this.audioEl);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.72;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -18;
      src.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.wave = new Uint8Array(this.analyser.fftSize);
      this._prevSpec = new Float32Array(this.analyser.frequencyBinCount);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.m.active = true;
    return true;
  }

  #band(lo, hi) {
    const hz = this.ctx.sampleRate / 2 / this.freq.length;
    const a = Math.max(1, Math.floor(lo / hz));
    const b = Math.min(this.freq.length - 1, Math.ceil(hi / hz));
    let s = 0;
    for (let i = a; i <= b; i++) s += this.freq[i];
    return s / ((b - a + 1) * 255);
  }

  /** Update metrics for this frame. `t` = audio.currentTime, `playing` = !paused. */
  update(t, playing, dt) {
    const m = this.m;
    const k = (rate) => 1 - Math.exp(-dt * rate); // frame-rate independent smoothing

    if (!this.analyser || !playing) {
      m.level += (0 - m.level) * k(3);
      m.bass += (0 - m.bass) * k(3);
      m.mid += (0 - m.mid) * k(3);
      m.treble += (0 - m.treble) * k(3);
      m.beat = false;
      m.beatPulse *= Math.exp(-dt * 5);
      return m;
    }

    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.wave);

    let sum = 0;
    for (let i = 0; i < this.wave.length; i++) {
      const v = (this.wave[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.min(1, Math.sqrt(sum / this.wave.length) * 2.6);

    const bass = this.#band(30, 180);
    const mid = this.#band(180, 2200);
    const treble = this.#band(2200, 11000);

    m.level += (rms - m.level) * k(14);
    m.bass += (bass - m.bass) * k(16);
    m.mid += (mid - m.mid) * k(10);
    m.treble += (treble - m.treble) * k(10);
    m.bassRaw = bass;

    // spectral flux on the low-mid range -> onset / beat
    let flux = 0;
    const lim = Math.min(160, this.freq.length);
    for (let i = 1; i < lim; i++) {
      const v = this.freq[i] / 255;
      const d = v - this._prevSpec[i];
      if (d > 0) flux += d;
      this._prevSpec[i] = v;
    }
    flux /= lim;
    this._fluxHist[this._fluxIdx++ % this._fluxHist.length] = flux;
    let mean = 0;
    for (const f of this._fluxHist) mean += f;
    mean /= this._fluxHist.length;
    m.flux = flux;

    m.beat = false;
    if (flux > mean * 1.55 && flux > 0.018 && t - this._lastBeat > 0.24) {
      m.beat = true;
      m.beatCount++;
      this._lastBeat = t;
      m.beatPulse = 1;
    } else {
      m.beatPulse *= Math.exp(-dt * 6);
    }
    return m;
  }
}
