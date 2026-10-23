/**
 * LyricEngine — renders lyrics as a pure function of playback time.
 *
 * Every frame we receive `t = audio.currentTime` and compute, for each line,
 * how far it is through its enter / hold / exit phases. No setTimeout chains,
 * no accumulated state: seeking anywhere immediately yields the correct frame.
 */

import { SECTIONS } from "./lyrics.js";
import { buildGrid, printGrid } from "./ascii-lyrics.js";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeInCubic = (k) => k * k * k;
const easeOutQuad = (k) => 1 - (1 - k) * (1 - k);
const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
/** deterministic pseudo-random in [0,1) — same t ⇒ same glitch, even after seeking */
export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** lead = how early a line starts entering before its vocal start. */
const ANIM = {
  fade: { lead: 0.35, inDur: 0.9, outDur: 0.7 },
  rise: { lead: 0.3, inDur: 0.8, outDur: 0.6 },
  blur: { lead: 0.45, inDur: 1.1, outDur: 0.8 },
  spread: { lead: 0.4, inDur: 1.3, outDur: 0.8 },
  letters: { lead: 0.12, inDur: 0.45, outDur: 0.7 },
  words: { lead: 0.12, inDur: 0.4, outDur: 0.6 },
  glitch: { lead: 0.2, inDur: 0.55, outDur: 0.5 },
  flicker: { lead: 0.15, inDur: 0.8, outDur: 0.6 },
  impact: { lead: 0.14, inDur: 0.6, outDur: 0.9 },
  echo: { lead: 0.3, inDur: 0.9, outDur: 1.1 },
};
const HOLD = 0.5; // linger after the vocal ends
const GHOST_LIFE = 10; // seconds a remnant stays in the background
const MAX_GHOSTS = 3;

export class LyricEngine {
  constructor({ container, ghostLayer, live, tearMap, reducedMotion = false }) {
    this.container = container;
    this.ghostLayer = ghostLayer;
    this.live = live;
    this.tearMap = tearMap;
    this.reduced = reducedMotion;
    this.fx = true;
    this.lyricStyle = "ascii"; // "ascii" | "blocks" | "cyber" | "contour" | "minimal" | "solid"
    this.timeline = [];
    this.nodes = new Map(); // id -> node record
    this.ghosts = new Map();
    this.cards = new Map();
    this.lastLiveId = null;
    this.duration = 0;
  }

  setFx(on) { this.fx = on; }

  setLyricStyle(style) {
    this.lyricStyle = style;
    for (const node of this.nodes.values()) {
      node.lastAsciiFrame = -1;
    }
  }

  /** Accepts the lyric array (possibly with null timings) and precomputes phases. */
  setTimeline(lines, duration = 0) {
    this.duration = duration;
    const timed = lines
      .filter((l) => Number.isFinite(l.start) && Number.isFinite(l.end))
      .map((l) => ({ ...l, a: ANIM[l.animation] || ANIM.fade }))
      .sort((x, y) => x.start - y.start);

    for (let i = 0; i < timed.length; i++) {
      const L = timed[i];
      const next = timed[i + 1];
      L.inStart = L.start - L.a.lead;
      let outStart = L.end + HOLD;
      if (next) outStart = Math.min(outStart, next.start - next.a.lead);
      L.outStart = Math.max(outStart, L.start + 0.3);
      const effectiveOutDur = next && (next.start - L.end < 0.6) ? 0.32 : L.a.outDur;
      L.effectiveOutDur = effectiveOutDur;
      L.outEnd = L.outStart + effectiveOutDur;
    }
    this.timeline = timed;
    // drop all DOM so changed timings / texts rebuild cleanly
    for (const n of this.nodes.values()) n.el.remove();
    this.nodes.clear();
    for (const g of this.ghosts.values()) g.remove();
    this.ghosts.clear();
  }

  /** Index of the line whose vocal span contains t (or -1). Used by the editor. */
  lineAt(t) {
    const tl = this.timeline;
    for (let i = tl.length - 1; i >= 0; i--) if (tl[i].start <= t) return t <= tl[i].end ? tl[i].id : -1;
    return -1;
  }

  #lastIndexStartedBy(t) {
    // binary search: last i with inStart <= t
    const tl = this.timeline;
    let lo = 0, hi = tl.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (tl[mid].inStart <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }

  // ------------------------------------------------------------- DOM build

  #build(L) {
    const el = document.createElement("div");
    el.className = "lyric is-ascii-mode";
    el.setAttribute("role", "text");
    el.setAttribute("aria-label", L.text);
    el.dataset.text = L.text;
    el.dataset.anim = L.animation;
    el.dataset.section = L.section;
    el.dataset.glitch = "";
    if (L.animation === "impact") el.classList.add("is-impact");

    // Primary ASCII art typography element
    const asciiEl = document.createElement("pre");
    asciiEl.className = "lyric__ascii";
    asciiEl.setAttribute("aria-hidden", "true");
    el.appendChild(asciiEl);

    // Subtitle bar with section tag & exact text
    const subEl = document.createElement("div");
    subEl.className = "lyric__sub";
    subEl.setAttribute("aria-hidden", "true");
    const secLabel = SECTIONS[L.section]?.label || L.section;
    subEl.innerHTML = `<span class="lyric__sub-tag">${secLabel}</span><span class="lyric__sub-text">${L.text}</span>`;
    el.appendChild(subEl);

    // Solid typography container (for solid mode fallback)
    const solidEl = document.createElement("p");
    solidEl.className = "lyric__solid";
    solidEl.setAttribute("aria-hidden", "true");

    const words = [];
    const chars = [];
    const tokens = L.text.split(" ");
    const totalChars = L.text.replace(/ /g, "").length || 1;
    let charCursor = 0;
    tokens.forEach((tok, wi) => {
      const w = document.createElement("span");
      w.className = "w";
      if (L.animation === "impact" && wi === tokens.length - 1) w.classList.add("accent");
      const wordRec = { el: w, offset: charCursor / totalChars, last: "" };
      for (const ch of tok) {
        const c = document.createElement("span");
        c.className = "c";
        c.textContent = ch;
        w.appendChild(c);
        chars.push({ el: c, offset: charCursor / totalChars, last: "" });
        charCursor++;
      }
      words.push(wordRec);
      solidEl.appendChild(w);
      if (wi < tokens.length - 1) solidEl.appendChild(document.createTextNode(" "));
    });
    el.appendChild(solidEl);

    const echoes = [];
    if (L.animation === "echo") {
      for (let i = 0; i < 3; i++) {
        const e = document.createElement("span");
        e.className = "lyric__echo";
        e.setAttribute("aria-hidden", "true");
        e.textContent = L.text;
        solidEl.appendChild(e);
        echoes.push(e);
      }
    }
    this.container.appendChild(el);
    return { el, asciiEl, subEl, solidEl, words, chars, echoes, L, last: "", lastAsciiFrame: -1 };
  }

  // ------------------------------------------------------------- per-line frame

  #glitchAmount(L, t, m) {
    if (!this.fx || this.reduced) return 0;
    const since = t - L.start;
    let g = 0;
    if (L.animation === "glitch") {
      g = since > -0.2 ? Math.exp(-Math.max(0, since) * 2.6) : 0;
      if (hash(Math.floor(t * 9) + L.id * 13) > 0.93) g = Math.max(g, 0.55);
    } else if (L.animation === "impact") {
      g = since > -0.15 ? 1.15 * Math.exp(-Math.max(0, since) * 2.2) : 0;
    } else if (L.animation === "flicker") {
      g = hash(Math.floor(t * 12) + L.id) > 0.95 ? 0.35 : 0;
    }
    // occasional beat-synced glitch, stronger in choruses
    const chorus = L.section.startsWith("chorus") ? 1 : 0.45;
    if (m.beatPulse > 0.05 && hash(m.beatCount * 7.31) > 0.78) g = Math.max(g, m.beatPulse * 0.5 * chorus);
    return Math.min(1.2, g);
  }

  #frameLine(node, t, m) {
    const { L, el } = node;
    const A = L.a;
    const pin = clamp01((t - L.inStart) / A.inDur);
    const outDur = L.effectiveOutDur || A.outDur;
    const pout = clamp01((t - L.outStart) / outDur);
    const ein = easeOutCubic(pin);
    const eout = easeInCubic(pout);
    const fadeOut = 1 - easeOutQuad(pout);

    let opacity = ein * fadeOut;
    let ty = 0, scale = 1, blur = 0, lsAdd = 0, tx = 0;

    switch (L.animation) {
      case "rise":
        ty = (1 - ein) * 70 - eout * 46;
        blur = (1 - ein) * 6 + eout * 10;
        break;
      case "blur":
        blur = (1 - ein) * 26 + eout * 20;
        scale = 1.1 - 0.1 * ein + eout * 0.05;
        break;
      case "spread":
        lsAdd = lerp(0.5, 0, easeInOutSine(pin)) + eout * 0.28;
        blur = (1 - ein) * 9 + eout * 14;
        break;
      case "letters":
      case "words":
        opacity = fadeOut * (pin > 0 ? 1 : 0);
        ty = -eout * 34;
        blur = eout * 12;
        break;
      case "glitch":
        ty = (1 - ein) * 14 - eout * 20;
        blur = (1 - ein) * 4 + eout * 8;
        tx = (hash(Math.floor(t * 30)) - 0.5) * 10 * (1 - ein);
        break;
      case "flicker": {
        const since = t - L.inStart;
        if (since < A.inDur + 0.4) {
          const f = hash(Math.floor(since * 26) + L.id * 3.7);
          opacity *= f > 0.42 ? 1 : 0.12 + f;
        } else if (hash(Math.floor(t * 7) + L.id) > 0.97) {
          opacity *= 0.35; // streetlight stutter
        }
        blur = eout * 12;
        ty = -eout * 24;
        break;
      }
      case "impact":
        scale = 1.2 - 0.2 * ein + eout * 0.04;
        blur = (1 - ein) * 18 + eout * 16;
        ty = -eout * 20;
        break;
      case "echo":
        ty = (1 - ein) * 16 - eout * 18;
        blur = (1 - ein) * 12 + eout * 16;
        break;
      default: // fade
        ty = (1 - ein) * 18 - eout * 26;
        blur = (1 - ein) * 10 + eout * 12;
    }

    if (this.reduced) { blur = 0; ty *= 0.3; lsAdd *= 0.3; }

    // audio-reactive breathing (subtle)
    if (this.fx) scale *= 1 + m.bass * 0.035 + m.beatPulse * 0.008;
    tx += Math.sin(t * 0.37 + L.id) * 3;

    const gRaw = this.#glitchAmount(L, t, m);
    // ASCII lettering stays crisp: no SVG tearing / heavy slicing while it is the active style
    const g = this.lyricStyle !== "solid" ? Math.min(0.3, gRaw) : gRaw;
    const torn = g > 0.38;
    const filter = `${torn ? "url(#tear) " : ""}blur(${blur.toFixed(2)}px)`;
    const sig = `${opacity.toFixed(3)}|${tx.toFixed(1)}|${ty.toFixed(1)}|${scale.toFixed(4)}|${filter}|${lsAdd.toFixed(3)}|${g.toFixed(2)}`;
    if (sig !== node.last) {
      node.last = sig;
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      el.style.filter = filter;
      el.style.setProperty("--ls-add", `${lsAdd.toFixed(3)}em`);
      el.style.setProperty("--ca", (g * 7 + (this.fx ? m.treble * 1.6 : 0)).toFixed(2));
      if (g > 0.12) {
        const seed = Math.floor(t * 24) + L.id * 17;
        const t1 = hash(seed) * 80, h1 = 4 + hash(seed + 1) * 16;
        const t2 = hash(seed + 2) * 80, h2 = 3 + hash(seed + 3) * 12;
        el.style.setProperty("--slice-o", Math.min(1, g).toFixed(2));
        el.style.setProperty("--s1t", `${t1.toFixed(1)}%`);
        el.style.setProperty("--s1b", `${Math.max(0, 100 - t1 - h1).toFixed(1)}%`);
        el.style.setProperty("--s2t", `${t2.toFixed(1)}%`);
        el.style.setProperty("--s2b", `${Math.max(0, 100 - t2 - h2).toFixed(1)}%`);
        el.style.setProperty("--sx1", ((hash(seed + 4) - 0.5) * 46 * g).toFixed(1));
        el.style.setProperty("--sx2", ((hash(seed + 5) - 0.5) * 46 * g).toFixed(1));
      } else {
        el.style.setProperty("--slice-o", "0");
      }
    }

    // ASCII art render update
    if (this.lyricStyle !== "solid") {
      if (!el.classList.contains("is-ascii-mode")) {
        el.classList.add("is-ascii-mode");
        el.classList.remove("is-solid-mode");
      }

      let activeStyle = this.lyricStyle;
      if (activeStyle === "ascii") {
        if (L.section.startsWith("chorus")) activeStyle = "slant";
        else if (L.section === "bridge") activeStyle = "slant";
        else if (L.section === "outro") activeStyle = "slant";
        else activeStyle = "slant";
      }

      const vw = window.innerWidth, vh = window.innerHeight;
      const isMobile = vw <= 640;
      const isLandscapeMobile = isMobile && vh < 500 && vw > vh;
      const grid = buildGrid(L.text, { style: activeStyle, isMobile, viewportWidth: vw });
      const cols = grid.cols;
      const rows = grid.totalRows;

      // Font size calculated so the text fills the stage comfortably with optimal legibility
      const stageW = this.container.clientWidth || vw;
      const widthFactor = isMobile ? (vw <= 380 ? 0.96 : 0.93) : 0.90;
      const heightFactor = isLandscapeMobile ? 0.70 : (isMobile ? 0.58 : 0.52);
      const fsByWidth = (stageW * widthFactor) / (cols * 0.60);
      const fsByHeight = (vh * heightFactor) / (rows * 1.15);
      const minFs = isMobile ? (vw <= 380 ? 6.5 : 7.2) : 9;
      const maxFs = isMobile ? 14 : 18;
      const fs = Math.max(minFs, Math.min(maxFs, fsByWidth, fsByHeight));
      if (node.fs !== fs) {
        node.fs = fs;
        node.asciiEl.style.fontSize = `${fs.toFixed(2)}px`;
        node.lastAsciiFrame = -1;
      }

      let revealProgress = 1;
      if (L.animation === "letters" || L.animation === "words") {
        const revealDur = Math.min(2.4, Math.max(0.4, (L.end - L.start) * 0.7));
        revealProgress = clamp01((t - (L.start - 0.06)) / revealDur);
      }

      const lively = m.beatPulse > 0.25 || g > 0.1;
      const frameSlot = Math.floor(t * (lively ? 18 : 8)) + (revealProgress < 1 ? Math.floor(revealProgress * 60) * 1000 : 0);
      if (frameSlot !== node.lastAsciiFrame) {
        node.lastAsciiFrame = frameSlot;
        const scramble = g * 0.4 + (m.beatPulse > 0.35 ? m.beatPulse * 0.3 : 0);

        const byWord = L.animation === "words";
        const asciiText = printGrid(grid, {
          scramble,
          reveal: revealProgress,
          byWord,
          time: t,
          seed: L.id,
        });

        if (node.asciiEl.textContent !== asciiText) {
          node.asciiEl.textContent = asciiText;
        }
      }
    } else {
      if (!el.classList.contains("is-solid-mode")) {
        el.classList.add("is-solid-mode");
        el.classList.remove("is-ascii-mode");
      }
    }

    // sub-line reveals, paced across the sung duration (by character count)
    if (L.animation === "letters" || L.animation === "words") {
      const reveal = Math.min(3.6, Math.max(0.4, (L.end - L.start) * 0.82));
      const base = L.start - 0.06;
      const units = L.animation === "letters" ? node.chars : node.words;
      const span = L.animation === "letters" ? 0.32 : 0.45;
      for (const u of units) {
        const p = clamp01((t - (base + u.offset * reveal)) / span);
        const e = easeOutCubic(p);
        const s = this.reduced
          ? `${e.toFixed(2)}|0|0`
          : `${e.toFixed(2)}|${((1 - e) * (L.animation === "letters" ? 0.22 : 0.35)).toFixed(3)}|${((1 - e) * 8).toFixed(1)}`;
        if (s !== u.last) {
          u.last = s;
          const [o, y, b] = s.split("|");
          u.el.style.opacity = o;
          u.el.style.transform = `translateY(${y}em)`;
          u.el.style.filter = b === "0.0" || b === "0" ? "none" : `blur(${b}px)`;
        }
      }
    }

    if (node.echoes.length) {
      const hold = clamp01((t - L.start) / Math.max(0.5, L.end - L.start));
      node.echoes.forEach((e, i) => {
        const k = (i + 1) / node.echoes.length;
        e.style.transform = `translateY(${(-(hold * 0.5 + eout) * 0.55 * k).toFixed(3)}em) scale(${(1 + k * 0.06 * hold).toFixed(3)})`;
        e.style.opacity = ((1 - k * 0.6) * (0.55 + m.level * 0.6) * fadeOut).toFixed(3);
      });
    }

    return { opacity, glitch: g };
  }

  // ------------------------------------------------------------- ghosts

  #renderGhosts(t, idx) {
    const tl = this.timeline;
    const want = new Set();
    for (let i = idx, n = 0; i >= 0 && n < MAX_GHOSTS + 2; i--) {
      const L = tl[i];
      const age = t - L.outEnd;
      if (age < 0) continue;
      if (age > GHOST_LIFE) break;
      n++;
      if (want.size >= MAX_GHOSTS) break;
      want.add(L.id);
      let g = this.ghosts.get(L.id);
      if (!g) {
        g = document.createElement("p");
        g.className = "ghost";
        g.dataset.section = L.section;
        g.textContent = L.text;
        this.ghostLayer.appendChild(g);
        this.ghosts.set(L.id, g);
      }
      const life = age / GHOST_LIFE;
      const o = 0.12 * easeOutQuad(clamp01(age / 0.9)) * Math.pow(1 - life, 1.6);
      const x = (hash(L.id * 3.1) - 0.5) * 50;
      const y = (hash(L.id * 7.7) - 0.5) * 70 - age * 1.6;
      const r = (hash(L.id * 1.3) - 0.5) * 6;
      g.style.opacity = o.toFixed(3);
      g.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}vw, ${y.toFixed(2)}vh) rotate(${r.toFixed(2)}deg) scale(${(1 + age * 0.012).toFixed(3)})`;
      g.style.filter = `blur(${(1 + life * 6).toFixed(1)}px)`;
    }
    for (const [id, g] of this.ghosts) if (!want.has(id)) { g.remove(); this.ghosts.delete(id); }
  }

  // ------------------------------------------------------------- cards

  #card(key, html, opacity, ls) {
    let el = this.cards.get(key);
    if (opacity <= 0.001) {
      if (el) { el.remove(); this.cards.delete(key); }
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.className = "card";
      el.innerHTML = html;
      this.container.appendChild(el);
      this.cards.set(key, el);
    }
    el.style.opacity = opacity.toFixed(3);
    el.style.letterSpacing = `${ls.toFixed(3)}em`;
    el.style.filter = `blur(${((1 - opacity) * 8).toFixed(1)}px)`;
  }

  // ------------------------------------------------------------- main

  render(t, m) {
    const tl = this.timeline;
    const idx = this.#lastIndexStartedBy(t);

    // which lines are visible right now (at most a crossfading handful)
    const visible = [];
    for (let i = idx; i >= 0 && i >= idx - 3; i--) if (t < tl[i].outEnd) visible.push(tl[i]);

    const keep = new Set(visible.map((l) => l.id));
    for (const [id, n] of this.nodes) if (!keep.has(id)) { n.el.remove(); this.nodes.delete(id); }

    let maxGlitch = 0, focus = null, focusOpacity = 0;
    for (const L of visible) {
      let node = this.nodes.get(L.id);
      if (!node) { node = this.#build(L); this.nodes.set(L.id, node); }
      const r = this.#frameLine(node, t, m);
      maxGlitch = Math.max(maxGlitch, r.glitch);
      if (r.opacity >= focusOpacity) { focusOpacity = r.opacity; focus = L; }
    }
    if (this.tearMap) this.tearMap.setAttribute("scale", (maxGlitch * 34).toFixed(1));

    this.#renderGhosts(t, idx);

    // intro & end cards (title metadata, not lyric text)
    const first = tl[0], last = tl[tl.length - 1];
    if (first) {
      const introEnd = first.inStart - 0.4;
      const k = introEnd > 2.5 ? clamp01((t - 0.4) / 2.2) * (1 - clamp01((t - (introEnd - 1.6)) / 1.6)) : 0;
      this.#card("intro", "bleachers<strong>merry christmas, please don't call</strong>", k, 0.6 + (1 - k) * 0.3 + t * 0.004);
      const endK = clamp01((t - (last.outEnd + 1.2)) / 2.5);
      this.#card("end", "bleachers<strong>— end —</strong>", endK, 0.9 - endK * 0.3);
    }

    // section state for HUD / tone / ascii
    let section = "intro", label = SECTIONS.intro.label, tone = "cold", instrumental = false;
    if (idx >= 0) {
      const cur = tl[idx];
      const next = tl[idx + 1];
      section = cur.section;
      label = SECTIONS[section]?.label ?? section;
      tone = SECTIONS[section]?.tone ?? "cold";
      if (t > cur.outEnd + 2 && (!next || next.inStart - t > 2)) {
        instrumental = true;
        label = next ? "instrumental" : "fin";
      }
    }

    // screen-reader live region: announce each new line once
    const nowId = focus && focusOpacity > 0.5 ? focus.id : null;
    if (nowId && nowId !== this.lastLiveId) {
      this.lastLiveId = nowId;
      if (this.live) this.live.textContent = focus.text;
    }

    return {
      section, label, tone, instrumental,
      line: focus, lineOpacity: focusOpacity,
      glitch: maxGlitch,
      hasLyric: focusOpacity > 0.05,
    };
  }
}
