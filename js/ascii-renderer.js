/**
 * AsciiRenderer — draws a small procedural, audio-reactive "scene" into a
 * low-resolution offscreen buffer (one pixel per character cell), then maps
 * each pixel's brightness onto a character ramp and prints it to the canvas.
 *
 * Scene: flickering streetlight + light cone, drifting fog, falling snow,
 * waveform horizon, spectrum floor, and ASCII echoes of impactful lyrics.
 */

import { hash } from "./lyric-engine.js";

const PALETTE = {
  neutral: [236, 232, 223],
  red: [206, 86, 74],
  blue: [104, 148, 204],
};

export class AsciiRenderer {
  constructor(canvas, { ramp = " .:-=+*#%@", mobile = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ramp = ramp;
    this.mobile = mobile;
    this.enabled = true;
    this.color = false;
    this.cell = mobile ? 14 : 12; // px, character height
    this.frame = 0;
    this.costAvg = 0;

    this.src = document.createElement("canvas");
    this.sctx = this.src.getContext("2d", { willReadFrequently: true });
    this.noise = this.#makeNoise(96, 48);
    this.snow = [];
    this.resize();
  }

  setRamp(r) { if (r && r.length > 1) this.ramp = r; }
  setEnabled(on) { this.enabled = on; if (!on) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  setColorMode(on) { this.color = on; }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1 : 1.5);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `${this.cell}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    this.ctx.textBaseline = "top";
    this.cw = Math.max(5, this.ctx.measureText("M").width);
    this.cols = Math.ceil(this.w / this.cw);
    this.rows = Math.ceil(this.h / this.cell);
    this.src.width = this.cols;
    this.src.height = this.rows;
    this.#seedSnow();
  }

  #makeNoise(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    const img = x.createImageData(w, h);
    // cheap smooth-ish noise: random blobs blurred via a few box passes
    const v = new Float32Array(w * h).map(() => Math.random());
    for (let pass = 0; pass < 3; pass++) {
      const o = new Float32Array(v.length);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
          s += v[((j + dy + h) % h) * w + ((i + dx + w) % w)];
        }
        o[j * w + i] = s / 15;
      }
      v.set(o);
    }
    for (let k = 0; k < v.length; k++) {
      const b = Math.max(0, (v[k] - 0.42) * 4) * 255;
      img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = b;
      img.data[k * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  #seedSnow() {
    const n = this.mobile ? 110 : 240;
    this.snow = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), z: 0.25 + Math.random() * 0.75, p: Math.random() * 6.28,
    }));
  }

  /** Draw the procedural scene into the low-res buffer. */
  #scene(t, dt, m, st, analyzer) {
    const s = this.sctx, W = this.cols, H = this.rows;
    s.globalCompositeOperation = "source-over";
    s.fillStyle = `rgba(0,0,0,${st.hasLyric ? 0.42 : 0.3})`; // persistence = soft trails
    s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = "lighter";

    // fog
    const drift = (t * 0.012) % 1;
    s.globalAlpha = 0.07 + m.level * 0.22 + (st.instrumental ? 0.06 : 0);
    s.drawImage(this.noise, -drift * W, 0, W, H);
    s.drawImage(this.noise, (1 - drift) * W, 0, W, H);
    s.globalAlpha = 1;

    // streetlight: occasional hard flicker (deterministic in t)
    const lx = W * 0.8, ly = H * 0.1;
    const flick = hash(Math.floor(t * 11)) > 0.955 ? 0.15 : 1;
    const lamp = (0.35 + m.level * 0.55 + m.beatPulse * 0.15) * flick;
    const warm = this.color ? "255,214,170" : "255,255,255";
    let g = s.createRadialGradient(lx, ly, 0, lx, ly, H * (0.42 + m.bass * 0.3));
    g.addColorStop(0, `rgba(${warm},${0.85 * lamp})`);
    g.addColorStop(0.25, `rgba(${warm},${0.25 * lamp})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, W, H);
    // cone
    g = s.createLinearGradient(0, ly, 0, H);
    g.addColorStop(0, `rgba(${warm},${0.16 * lamp})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    s.fillStyle = g;
    s.beginPath();
    s.moveTo(lx - W * 0.012, ly);
    s.lineTo(lx + W * 0.012, ly);
    s.lineTo(lx + W * 0.22, H);
    s.lineTo(lx - W * 0.3, H);
    s.closePath();
    s.fill();

    // snow
    const wind = Math.sin(t * 0.21) * 0.02 + m.treble * 0.05;
    const fall = 0.025 + m.mid * 0.09 + m.beatPulse * 0.03;
    for (const p of this.snow) {
      p.y += fall * p.z * dt * 2.2;
      p.x += (wind + Math.sin(t * 0.8 + p.p) * 0.01) * p.z * dt;
      if (p.y > 1) { p.y -= 1; p.x = Math.random(); }
      if (p.x < 0) p.x += 1; else if (p.x > 1) p.x -= 1;
      const px = p.x * W, py = p.y * H;
      const inCone = Math.abs(px - lx) < (py / H) * W * 0.3 ? 1.6 : 1;
      const b = Math.min(1, p.z * 0.75 * inCone * (0.55 + m.level));
      s.fillStyle = `rgba(255,255,255,${b})`;
      s.fillRect(px, py, p.z > 0.8 ? 1.4 : 1, 1);
    }

    // waveform horizon
    if (analyzer?.analyser) {
      const wave = analyzer.wave, N = wave.length;
      const y0 = H * 0.74, amp = H * (0.08 + m.level * 0.18);
      s.strokeStyle = this.color && st.tone === "blue" ? "rgba(120,170,255,0.75)" : "rgba(255,255,255,0.55)";
      s.lineWidth = 1;
      s.beginPath();
      for (let x = 0; x <= W; x++) {
        const v = (wave[Math.floor((x / W) * (N - 1))] - 128) / 128;
        const y = y0 + v * amp;
        x ? s.lineTo(x, y) : s.moveTo(x, y);
      }
      s.stroke();

      // spectrum floor (log frequency axis)
      const f = analyzer.freq, F = f.length;
      s.fillStyle = this.color ? "rgba(255,90,70,0.32)" : "rgba(255,255,255,0.22)";
      const bars = Math.min(W, 96);
      for (let i = 0; i < bars; i++) {
        const a = Math.floor(Math.pow(i / bars, 2) * F * 0.7) + 1;
        const v = f[a] / 255;
        const bh = v * v * H * 0.28;
        const bw = W / bars;
        s.fillRect(i * bw, H - bh, Math.max(1, bw - 0.4), bh);
      }
    }

    // ASCII echo of cinematic lines
    const L = st.line;
    if (L && st.lineOpacity > 0.05 && (L.animation === "impact" || L.animation === "echo" || L.animation === "spread")) {
      const k = st.lineOpacity * (0.5 + m.level * 0.6);
      s.save();
      s.fillStyle = this.color ? `rgba(255,96,80,${0.55 * k})` : `rgba(255,255,255,${0.42 * k})`;
      let size = H * 0.34;
      s.font = `900 ${size}px Archivo, Arial, sans-serif`;
      const text = L.text.toUpperCase();
      const tw = s.measureText(text).width;
      if (tw > W * 1.6) { size *= (W * 1.6) / tw; s.font = `900 ${size}px Archivo, Arial, sans-serif`; }
      s.textAlign = "center";
      s.textBaseline = "middle";
      const scroll = ((t - L.start) * W * 0.06) % (W * 2);
      s.fillText(text, W * 0.5 + W * 0.3 - scroll, H * 0.5);
      s.restore();
    }

    if (m.beatPulse > 0.4 && st.section.startsWith("chorus")) {
      s.fillStyle = `rgba(255,255,255,${(m.beatPulse - 0.4) * 0.08})`;
      s.fillRect(0, 0, W, H);
    }
  }

  render(t, dt, m, st, analyzer) {
    if (!this.enabled) return;
    this.frame++;
    if (this.mobile && this.frame % 2) return; // ~30fps on phones

    const t0 = performance.now();
    this.#scene(t, dt, m, st, analyzer);

    const { cols, rows, cw, cell, ctx, ramp } = this;
    const data = this.sctx.getImageData(0, 0, cols, rows).data;
    const R = ramp.length - 1;
    // density reacts to loudness: louder ⇒ more cells cross the first threshold
    const gain = 1.05 + m.level * 0.9 + m.beatPulse * 0.25;

    // bucket cells by (colour, ramp index) so fillStyle changes stay minimal
    const buckets = new Map();
    for (let j = 0, p = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++, p += 4) {
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const v = Math.min(1, Math.pow(lum * gain, 0.85));
        const idx = Math.floor(v * R + 0.0001);
        if (idx <= 0) continue;
        let tint = "neutral";
        if (this.color) {
          if (r > b * 1.3 && r > g * 1.18) tint = "red";
          else if (b > r * 1.2) tint = "blue";
        }
        const key = tint + idx;
        let arr = buckets.get(key);
        if (!arr) buckets.set(key, (arr = []));
        arr.push(i, j);
      }
    }

    ctx.clearRect(0, 0, this.w, this.h);
    for (const [key, arr] of buckets) {
      const idx = Number(key.replace(/\D+/g, ""));
      const tint = key.replace(/\d+/g, "");
      const [r, g, b] = PALETTE[tint];
      ctx.fillStyle = `rgba(${r},${g},${b},${(0.22 + (idx / R) * 0.78).toFixed(3)})`;
      const ch = ramp[idx];
      for (let k = 0; k < arr.length; k += 2) ctx.fillText(ch, arr[k] * cw, arr[k + 1] * cell);
    }

    // adaptive quality: grow cells if we're expensive
    const cost = performance.now() - t0;
    this.costAvg = this.costAvg * 0.95 + cost * 0.05;
    if (this.frame > 90 && this.costAvg > (this.mobile ? 12 : 9) && this.cell < 22) {
      this.cell += 2;
      this.costAvg = 0;
      this.frame = 0;
      this.resize();
    }
  }
}
