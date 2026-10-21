/**
 * VisualEffects — film grain, analog noise bands, glitch bars and beat
 * flashes on a full-screen overlay canvas, plus CSS custom properties that
 * let the stylesheet react to the audio (glow, aberration).
 */

import { hash } from "./lyric-engine.js";

export class VisualEffects {
  constructor(canvas, { mobile = false, reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mobile = mobile;
    this.reduced = reducedMotion;
    this.enabled = true;
    this.tiles = [];
    this.frame = 0;
    this.root = document.documentElement;
    this.resize();
    this.#makeGrain();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize() {
    // grain looks better unscaled: keep DPR at 1 (cheaper too)
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  #makeGrain() {
    const S = 256;
    for (let k = 0; k < 6; k++) {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const x = c.getContext("2d");
      const img = x.createImageData(S, S);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.random() < 0.5 ? 26 : 12;
      }
      x.putImageData(img, 0, 0);
      this.tiles.push(this.ctx.createPattern(c, "repeat"));
    }
  }

  /** Writes CSS vars every frame (even with fx off: glow still breathes). */
  writeVars(m) {
    const s = this.root.style;
    s.setProperty("--level", m.level.toFixed(3));
    s.setProperty("--bass", m.bass.toFixed(3));
    s.setProperty("--treble", m.treble.toFixed(3));
  }

  render(t, m, st) {
    this.writeVars(m);
    if (!this.enabled) return;
    this.frame++;
    if (this.mobile && this.frame % 2) return;

    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    // grain: random tile + random offset each frame (24 fps cadence feels filmic)
    const step = Math.floor(t * 24) + this.frame * (t === 0 ? 1 : 0);
    ctx.save();
    ctx.globalAlpha = 0.55 + m.level * 0.35;
    ctx.fillStyle = this.tiles[step % this.tiles.length];
    ctx.translate(-(hash(step) * 256) | 0, -(hash(step + 1) * 256) | 0);
    ctx.fillRect(0, 0, w + 256, h + 256);
    ctx.restore();

    if (this.reduced) return;

    // analog noise band rolling slowly downward
    const bandY = ((t * 38) % (h + 160)) - 80;
    const gb = ctx.createLinearGradient(0, bandY - 60, 0, bandY + 60);
    gb.addColorStop(0, "rgba(255,255,255,0)");
    gb.addColorStop(0.5, `rgba(255,255,255,${0.018 + m.level * 0.03})`);
    gb.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gb;
    ctx.fillRect(0, bandY - 60, w, 120);

    // glitch bars (chromatic) — intensity from lyric engine + loud transients
    const g = Math.max(st.glitch, m.beatPulse > 0.6 && hash(m.beatCount * 3.3) > 0.85 ? 0.4 : 0);
    if (g > 0.08) {
      const seed = Math.floor(t * 30);
      const n = 2 + Math.floor(hash(seed) * 5 * g);
      for (let i = 0; i < n; i++) {
        const y = hash(seed + i * 11) * h;
        const bh = 1 + hash(seed + i * 5) * 18 * g;
        const x = (hash(seed + i * 7) - 0.5) * w * 0.4;
        const red = hash(seed + i) > 0.5;
        ctx.fillStyle = red ? `rgba(178,58,50,${0.16 * g})` : `rgba(79,123,176,${0.18 * g})`;
        ctx.fillRect(x, y, w * (0.4 + hash(seed + i * 3) * 0.8), bh);
        ctx.fillStyle = `rgba(236,232,223,${0.05 * g})`;
        ctx.fillRect(x + 6, y + bh, w * 0.5, 1);
      }
    }

    // soft beat flash during choruses
    if (st.section.startsWith("chorus") && m.beatPulse > 0.2) {
      ctx.fillStyle = `rgba(178,58,50,${(m.beatPulse - 0.2) * 0.05})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
