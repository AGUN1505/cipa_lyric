/**
 * TimelineEditor — local tool for checking / correcting lyric timestamps.
 *
 * Open with the "edit" button, the E key, or index.html?editor.
 * Edits autosave to localStorage (the visualizer uses them immediately) and
 * can be exported as JSON, copied as lyrics.js entries, or written straight
 * back into js/lyrics.js when served by `node server.mjs`.
 */

import { SONG } from "./lyrics.js";

export const STORE_KEY = "mcpdc.timeline.v1";
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const tc = (s) => {
  if (!Number.isFinite(s)) return "--:--.--";
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};

/** Merge saved overrides (by id, only if text still matches) onto base lyrics. */
export function loadOverrides(base) {
  const lines = base.map((l) => ({ ...l }));
  let overridden = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved?.lyrics) {
      const byId = new Map(saved.lyrics.map((l) => [l.id, l]));
      for (const l of lines) {
        const s = byId.get(l.id);
        if (s && s.text === l.text && (s.start !== l.start || s.end !== l.end || s.verified !== l.verified)) {
          Object.assign(l, { start: s.start, end: s.end, verified: !!s.verified, edited: true });
          overridden = true;
        }
      }
    }
  } catch (err) {
    console.warn("[editor] ignoring corrupt saved timeline", err);
  }
  return { lines, overridden };
}

export class TimelineEditor {
  constructor({ root, player, engine, base, lines, onChange }) {
    this.root = root;
    this.player = player;
    this.engine = engine;
    this.base = base;
    this.lines = lines; // shared working copy (also used by the visualizer)
    this.onChange = onChange;
    this.sel = lines[0]?.id ?? null;
    this.stopAt = null;
    this.follow = false;
    this.onlyUnverified = false;
    this.env = null; // { full: Float32Array, vocal: Float32Array, rate }
    this.drag = null;
    this.isOpen = false;
    this.#build();
  }

  get selected() { return this.lines.find((l) => l.id === this.sel); }

  // ----------------------------------------------------------- open / close

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    document.body.classList.add("is-editing");
    document.getElementById("btn-editor")?.classList.add("is-on");
    document.getElementById("btn-editor")?.setAttribute("aria-pressed", "true");
    if (!this.env) this.#loadEnvelope();
    requestAnimationFrame(() => { this.#sizeCanvases(); window.dispatchEvent(new Event("resize")); });
  }

  close() {
    this.isOpen = false;
    this.root.hidden = true;
    document.body.classList.remove("is-editing");
    document.getElementById("btn-editor")?.classList.remove("is-on");
    document.getElementById("btn-editor")?.setAttribute("aria-pressed", "false");
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  // ----------------------------------------------------------- DOM

  #build() {
    this.root.innerHTML = `
      <div class="ed__head">
        <h2 class="ed__title"><span>timeline editor</span><span class="ed__stats" data-ref="stats"></span></h2>
        <div class="ed__clock" data-ref="clock">00:00.00</div>
        <div class="ed__row">
          <button class="ed__btn" data-act="play">play / pause<kbd>space</kbd></button>
          <button class="ed__btn" data-act="back">−2s</button>
          <button class="ed__btn" data-act="fwd">+2s</button>
          <select class="ed__select" data-ref="rate" aria-label="Playback rate">
            <option value="1">1×</option><option value="0.75">0.75×</option><option value="0.5">0.5×</option>
          </select>
          <label class="ed__check"><input type="checkbox" data-ref="follow" /> follow</label>
          <label class="ed__check"><input type="checkbox" data-ref="only" /> unverified only</label>
        </div>
        <canvas class="ed__wave" data-ref="wave" aria-label="Song overview — click to seek"></canvas>
        <canvas class="ed__zoom" data-ref="zoom" aria-label="Zoomed waveform — click to seek, drag selected line edges"></canvas>
      </div>
      <div class="ed__sel">
        <p class="ed__sel-text" data-ref="selText"></p>
        <div class="ed__sel-times">
          <span>start</span><input class="ed__num" type="number" step="0.01" min="0" data-ref="start" aria-label="Start (s)" />
          <span>end</span><input class="ed__num" type="number" step="0.01" min="0" data-ref="end" aria-label="End (s)" />
        </div>
        <div class="ed__row">
          <button class="ed__btn ed__btn--blue" data-act="setStart">set start<kbd>I</kbd></button>
          <button class="ed__btn ed__btn--blue" data-act="setEnd">set end<kbd>O</kbd></button>
          <button class="ed__btn" data-act="replay">replay<kbd>R</kbd></button>
          <button class="ed__btn" data-act="preview">preview<kbd>P</kbd></button>
          <button class="ed__btn ed__btn--red" data-act="verify">toggle verified<kbd>U</kbd></button>
        </div>
        <div class="ed__row">
          <button class="ed__btn" data-act="s-">start −.05<kbd>[</kbd></button>
          <button class="ed__btn" data-act="s+">start +.05<kbd>]</kbd></button>
          <button class="ed__btn" data-act="e-">end −.05<kbd>;</kbd></button>
          <button class="ed__btn" data-act="e+">end +.05<kbd>'</kbd></button>
          <button class="ed__btn" data-act="prev">prev<kbd>J</kbd></button>
          <button class="ed__btn" data-act="next">next<kbd>K</kbd></button>
        </div>
      </div>
      <ol class="ed__list" data-ref="list"></ol>
      <div class="ed__foot">
        <div class="ed__row">
          <button class="ed__btn ed__btn--blue" data-act="saveFile">save to js/lyrics.js</button>
          <button class="ed__btn" data-act="export">export json</button>
          <button class="ed__btn" data-act="copy">copy as js</button>
          <button class="ed__btn" data-act="import">import json</button>
          <button class="ed__btn ed__btn--red" data-act="reset">reset</button>
          <input type="file" accept="application/json,.json" data-ref="file" hidden />
        </div>
        <p class="ed__keys">Edits autosave locally and drive the visualizer instantly. Drag the edges of the selected line in the zoom view. “verified” = checked by ear.</p>
      </div>
      <div class="ed__toast" data-ref="toast" role="status"></div>`;

    this.$ = {};
    this.root.querySelectorAll("[data-ref]").forEach((el) => (this.$[el.dataset.ref] = el));
    this.root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (b) this.#act(b.dataset.act);
    });

    this.$.rate.addEventListener("change", () => (this.player.audio.playbackRate = Number(this.$.rate.value)));
    this.$.follow.addEventListener("change", () => (this.follow = this.$.follow.checked));
    this.$.only.addEventListener("change", () => { this.onlyUnverified = this.$.only.checked; this.#renderList(); });
    this.$.start.addEventListener("change", () => this.#setField("start", Number(this.$.start.value)));
    this.$.end.addEventListener("change", () => this.#setField("end", Number(this.$.end.value)));
    this.$.file.addEventListener("change", () => this.#import(this.$.file.files[0]));

    this.$.wave.addEventListener("pointerdown", (e) => {
      const r = this.$.wave.getBoundingClientRect();
      this.player.seek(((e.clientX - r.left) / r.width) * (this.player.duration || 1));
    });
    this.#bindZoom();

    window.addEventListener("resize", () => this.isOpen && this.#sizeCanvases());
    document.addEventListener("keydown", (e) => this.#key(e));

    this.#renderList();
    this.#renderSel();
  }

  #renderList() {
    const list = this.$.list;
    list.innerHTML = "";
    this.rows = new Map();
    for (const l of this.lines) {
      if (this.onlyUnverified && l.verified) continue;
      const li = document.createElement("li");
      li.className = "ed__item";
      li.dataset.id = l.id;
      li.innerHTML = `<span class="ed__id"></span><span class="ed__txt"><span class="ed__sec"></span><span class="ed__t"></span></span><span class="ed__tm"></span><span class="ed__chip"></span>`;
      li.querySelector(".ed__id").textContent = String(l.id).padStart(2, "0");
      li.querySelector(".ed__sec").textContent = `${l.section} · ${l.animation}`;
      li.querySelector(".ed__t").textContent = l.text;
      li.title = l.text;
      li.addEventListener("click", () => this.select(l.id, true));
      li.addEventListener("dblclick", () => { this.select(l.id); this.#act("replay"); });
      list.appendChild(li);
      this.rows.set(l.id, li);
      this.#paintRow(l);
    }
    this.#stats();
  }

  #paintRow(l) {
    const li = this.rows?.get(l.id);
    if (!li) return;
    li.classList.toggle("is-sel", l.id === this.sel);
    li.querySelector(".ed__tm").textContent = `${tc(l.start)} → ${Number.isFinite(l.end) ? l.end.toFixed(2) : "--"}`;
    li.querySelector(".ed__tm").style.color = Number.isFinite(l.start) && l.end > l.start ? "" : "#d4776f";
    const chip = li.querySelector(".ed__chip");
    chip.className = `ed__chip ${l.verified ? "ed__chip--ok" : l.edited ? "ed__chip--edit" : "ed__chip--no"}`;
    chip.textContent = l.verified ? "verified" : l.edited ? "edited" : "unverified";
    chip.title = Number.isFinite(l.confidence) ? `alignment confidence ${l.confidence}` : "";
  }

  #renderSel() {
    const l = this.selected;
    if (!l) return;
    this.$.selText.textContent = `${l.id}. ${l.text}`;
    if (document.activeElement !== this.$.start) this.$.start.value = l.start ?? "";
    if (document.activeElement !== this.$.end) this.$.end.value = l.end ?? "";
  }

  #stats() {
    const v = this.lines.filter((l) => l.verified).length;
    const e = this.lines.filter((l) => l.edited).length;
    this.$.stats.textContent = `${v}/${this.lines.length} verified${e ? ` · ${e} edited` : ""}`;
  }

  #toast(msg) {
    const t = this.$.toast;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  // ----------------------------------------------------------- edits

  select(id, scroll = false) {
    const prev = this.sel;
    this.sel = id;
    const p = this.lines.find((l) => l.id === prev);
    if (p) this.#paintRow(p);
    this.#paintRow(this.selected);
    this.#renderSel();
    if (scroll) this.rows.get(id)?.scrollIntoView({ block: "nearest" });
  }

  #setField(field, value, { silent = false } = {}) {
    const l = this.selected;
    if (!l || !Number.isFinite(value)) return;
    l[field] = Math.max(0, r2(value));
    l.edited = true;
    this.#commit(l);
    if (!silent && field === "end" && l.end <= l.start) this.#toast("end is before start");
  }

  #commit(l) {
    this.#paintRow(l);
    this.#renderSel();
    this.#stats();
    this.#save();
    this.onChange?.(this.lines);
  }

  #save() {
    const payload = this.#payload();
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  }

  #payload() {
    return {
      song: SONG.title,
      artist: SONG.artist,
      audio: SONG.src,
      duration: r2(this.player.duration),
      exportedAt: new Date().toISOString(),
      lyrics: this.lines.map(({ id, start, end, text, section, animation, confidence, verified }) => ({
        id, start: r2(start), end: r2(end), text, section, animation, confidence: confidence ?? null, verified: !!verified,
      })),
    };
  }

  #asJs() {
    const f = (v) => (v == null ? "null" : Number(v).toFixed(2));
    return this.lines
      .map((l) => `  { id: ${l.id}, start: ${f(l.start)}, end: ${f(l.end)}, text: ${JSON.stringify(l.text)}, section: "${l.section}", animation: "${l.animation}", confidence: ${l.confidence == null ? "null" : Number(l.confidence).toFixed(2)}, verified: ${!!l.verified} },`)
      .join("\n");
  }

  async #import(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const byId = new Map((data.lyrics || data).map((l) => [l.id, l]));
      let n = 0;
      for (const l of this.lines) {
        const s = byId.get(l.id);
        if (s && s.text === l.text) { Object.assign(l, { start: s.start, end: s.end, verified: !!s.verified, edited: true }); n++; }
      }
      this.#renderList();
      this.#renderSel();
      this.#save();
      this.onChange?.(this.lines);
      this.#toast(`imported ${n} lines`);
    } catch (err) {
      this.#toast(`import failed: ${err.message}`);
    }
    this.$.file.value = "";
  }

  async #act(a) {
    const p = this.player, l = this.selected, t = p.currentTime;
    const idx = this.lines.findIndex((x) => x.id === this.sel);
    switch (a) {
      case "play": p.toggle(); break;
      case "back": p.nudge(-2); break;
      case "fwd": p.nudge(2); break;
      case "setStart": this.#setField("start", t); break;
      case "setEnd": this.#setField("end", t); break;
      case "s-": this.#setField("start", l.start - 0.05); break;
      case "s+": this.#setField("start", l.start + 0.05); break;
      case "e-": this.#setField("end", l.end - 0.05); break;
      case "e+": this.#setField("end", l.end + 0.05); break;
      case "replay":
        if (!Number.isFinite(l?.start)) return;
        p.seek(Math.max(0, l.start - 0.3)); this.stopAt = l.end + 0.25; p.play(); break;
      case "preview":
        if (!Number.isFinite(l?.start)) return;
        p.seek(Math.max(0, l.start - 1.6)); this.stopAt = l.end + 1.4; p.play(); break;
      case "verify": l.verified = !l.verified; l.edited = true; this.#commit(l); break;
      case "prev": if (idx > 0) this.select(this.lines[idx - 1].id, true); break;
      case "next": if (idx < this.lines.length - 1) this.select(this.lines[idx + 1].id, true); break;
      case "export": {
        const blob = new Blob([JSON.stringify(this.#payload(), null, 2)], { type: "application/json" });
        const a2 = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "lyrics-timeline.json" });
        a2.click();
        setTimeout(() => URL.revokeObjectURL(a2.href), 1000);
        this.#toast("exported lyrics-timeline.json");
        break;
      }
      case "copy":
        try { await navigator.clipboard.writeText(this.#asJs()); this.#toast("lyric entries copied — paste into js/lyrics.js"); }
        catch { this.#toast("clipboard unavailable — use export"); }
        break;
      case "import": this.$.file.click(); break;
      case "saveFile":
        try {
          const res = await fetch("/__timeline", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(this.#payload()) });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || res.statusText);
          this.#toast(`wrote ${j.updated} lines to js/lyrics.js`);
        } catch (err) {
          this.#toast(`save endpoint unavailable (${err.message}) — use export`);
        }
        break;
      case "reset":
        if (!confirm("Discard local timeline edits and reload the timings from js/lyrics.js?")) return;
        localStorage.removeItem(STORE_KEY);
        this.base.forEach((b, i) => Object.assign(this.lines[i], { start: b.start, end: b.end, verified: b.verified, edited: false }));
        this.#renderList();
        this.#renderSel();
        this.onChange?.(this.lines);
        this.#toast("reset to js/lyrics.js");
        break;
    }
  }

  #key(e) {
    if (!this.isOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    if ((tag === "INPUT" && e.target.type !== "range" && e.target.type !== "checkbox") || tag === "SELECT" || tag === "TEXTAREA") return;
    const map = { i: "setStart", o: "setEnd", r: "replay", p: "preview", u: "verify", j: "prev", k: "next", "[": "s-", "]": "s+", ";": "e-", "'": "e+" };
    const act = map[e.key.toLowerCase()];
    if (act) { e.preventDefault(); e.stopPropagation(); this.#act(act); }
  }

  // ----------------------------------------------------------- waveform data

  async #loadEnvelope() {
    try {
      const buf = await (await fetch(SONG.src)).arrayBuffer();
      const tmp = new OfflineAudioContext(1, 1, 44100);
      const audio = await tmp.decodeAudioData(buf);
      const rate = 200; // envelope samples per second
      const env = (data) => {
        const hop = Math.floor(audio.sampleRate / rate);
        const out = new Float32Array(Math.ceil(data.length / hop));
        for (let i = 0, k = 0; i < data.length; i += hop, k++) {
          let s = 0;
          const end = Math.min(data.length, i + hop);
          for (let j = i; j < end; j++) s += data[j] * data[j];
          out[k] = Math.sqrt(s / (end - i));
        }
        let mx = 0;
        for (const v of out) mx = Math.max(mx, v);
        return out.map((v) => v / (mx || 1));
      };
      const full = env(audio.getChannelData(0));
      // vocal-band envelope (≈ 300 Hz – 3.4 kHz) — helps spot sung phrases
      const off = new OfflineAudioContext(1, audio.length, audio.sampleRate);
      const src = off.createBufferSource();
      src.buffer = audio;
      const hp = off.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
      const lp = off.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3400;
      src.connect(hp).connect(lp).connect(off.destination);
      src.start();
      const vocal = env((await off.startRendering()).getChannelData(0));
      this.env = { full, vocal, rate };
      this.#drawOverviewBase();
    } catch (err) {
      console.warn("[editor] waveform unavailable:", err);
    }
  }

  #sizeCanvases() {
    for (const c of [this.$.wave, this.$.zoom]) {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
    }
    this.#drawOverviewBase();
  }

  #drawOverviewBase() {
    if (!this.env) return;
    const c = this.$.wave;
    const base = (this.overview ||= document.createElement("canvas"));
    base.width = c.width; base.height = c.height;
    const x = base.getContext("2d"), W = base.width, H = base.height;
    x.clearRect(0, 0, W, H);
    const { full, vocal } = this.env;
    for (let i = 0; i < W; i++) {
      const a = Math.floor((i / W) * full.length), b = Math.floor(((i + 1) / W) * full.length);
      let f = 0, v = 0;
      for (let k = a; k < b; k++) { f = Math.max(f, full[k]); v = Math.max(v, vocal[k]); }
      x.fillStyle = "rgba(236,232,223,0.22)";
      x.fillRect(i, H / 2 - (f * H) / 2, 1, f * H);
      x.fillStyle = "rgba(236,232,223,0.5)";
      x.fillRect(i, H / 2 - (v * H) / 3, 1, (v * H) / 1.5);
    }
  }

  // ----------------------------------------------------------- zoom interactions

  #zoomWindow() {
    const t = this.player.currentTime, span = 6;
    return [t - span / 2, t + span / 2];
  }

  #bindZoom() {
    const z = this.$.zoom;
    const toTime = (e) => {
      const r = z.getBoundingClientRect();
      const [a, b] = this.dragWin || this.#zoomWindow();
      return a + ((e.clientX - r.left) / r.width) * (b - a);
    };
    z.addEventListener("pointerdown", (e) => {
      const l = this.selected;
      const win = this.#zoomWindow();
      const r = z.getBoundingClientRect();
      const px = (s) => ((s - win[0]) / (win[1] - win[0])) * r.width;
      const x = e.clientX - r.left;
      if (l && Number.isFinite(l.start) && Math.abs(px(l.start) - x) < 8) this.drag = "start";
      else if (l && Number.isFinite(l.end) && Math.abs(px(l.end) - x) < 8) this.drag = "end";
      if (this.drag) {
        this.dragWin = win; // freeze the window while dragging
        z.setPointerCapture(e.pointerId);
      } else {
        this.player.seek(toTime(e));
      }
    });
    z.addEventListener("pointermove", (e) => {
      if (!this.drag) {
        const l = this.selected, win = this.#zoomWindow(), r = z.getBoundingClientRect();
        const px = (s) => ((s - win[0]) / (win[1] - win[0])) * r.width;
        const x = e.clientX - r.left;
        z.style.cursor = l && (Math.abs(px(l.start) - x) < 8 || Math.abs(px(l.end) - x) < 8) ? "ew-resize" : "pointer";
        return;
      }
      const l = this.selected;
      l[this.drag] = Math.max(0, r2(toTime(e)));
      l.edited = true;
      this.#paintRow(l);
      this.#renderSel();
    });
    const end = () => {
      if (!this.drag) return;
      this.drag = null;
      this.dragWin = null;
      this.#commit(this.selected);
    };
    z.addEventListener("pointerup", end);
    z.addEventListener("pointercancel", end);
  }

  // ----------------------------------------------------------- per frame

  update(t) {
    if (this.stopAt != null && t >= this.stopAt) {
      this.player.pause();
      this.stopAt = null;
    }
    if (!this.isOpen) return;
    this.$.clock.textContent = tc(t);

    const now = this.lines.find((l) => Number.isFinite(l.start) && t >= l.start && t <= l.end)?.id ?? null;
    if (now !== this.nowId) {
      this.rows?.get(this.nowId)?.classList.remove("is-now");
      this.rows?.get(now)?.classList.add("is-now");
      this.nowId = now;
      if (this.follow && now != null) this.select(now, true);
    }
    this.#drawOverview(t);
    this.#drawZoom(t);
  }

  #regionColor(l, a) {
    if (l.id === this.sel) return `rgba(236,232,223,${0.22 * a})`;
    return l.verified ? `rgba(79,123,176,${0.32 * a})` : `rgba(178,58,50,${0.38 * a})`;
  }

  #drawOverview(t) {
    const c = this.$.wave, x = c.getContext("2d"), W = c.width, H = c.height;
    const d = this.player.duration || 1;
    x.clearRect(0, 0, W, H);
    for (const l of this.lines) {
      if (!Number.isFinite(l.start)) continue;
      x.fillStyle = this.#regionColor(l, 1);
      x.fillRect((l.start / d) * W, 0, Math.max(1, ((l.end - l.start) / d) * W), H);
    }
    if (this.overview) x.drawImage(this.overview, 0, 0);
    x.fillStyle = "#ece8df";
    x.fillRect((t / d) * W, 0, 1.5, H);
  }

  #drawZoom(t) {
    const c = this.$.zoom, x = c.getContext("2d"), W = c.width, H = c.height;
    const [a, b] = this.dragWin || this.#zoomWindow();
    const px = (s) => ((s - a) / (b - a)) * W;
    x.clearRect(0, 0, W, H);
    const dpr = W / Math.max(1, c.clientWidth);

    for (const l of this.lines) {
      if (!Number.isFinite(l.start) || l.end < a || l.start > b) continue;
      x.fillStyle = this.#regionColor(l, 0.8);
      x.fillRect(px(l.start), 0, px(l.end) - px(l.start), H);
      x.fillStyle = l.id === this.sel ? "#ece8df" : "rgba(236,232,223,0.5)";
      x.fillRect(px(l.start), 0, 1.5 * dpr, H);
      x.fillRect(px(l.end) - 1.5 * dpr, 0, 1.5 * dpr, H);
      x.font = `${10 * dpr}px "JetBrains Mono", monospace`;
      x.fillText(`${l.id} ${l.text}`.slice(0, 40), px(l.start) + 4 * dpr, 12 * dpr);
    }

    if (this.env) {
      const { full, vocal, rate } = this.env;
      for (let i = 0; i < W; i++) {
        const s = a + (i / W) * (b - a);
        const k = Math.floor(s * rate);
        if (k < 0 || k >= full.length) continue;
        const f = full[k], v = vocal[k];
        x.fillStyle = "rgba(236,232,223,0.18)";
        x.fillRect(i, H - f * H * 0.8, 1, f * H * 0.8);
        x.fillStyle = "rgba(236,232,223,0.55)";
        x.fillRect(i, H - v * H * 0.8, 1, 1.5 * dpr);
      }
    }
    // second ticks
    x.fillStyle = "rgba(236,232,223,0.3)";
    for (let s = Math.ceil(a); s <= b; s++) x.fillRect(px(s), H - 5 * dpr, 1, 5 * dpr);
    // playhead
    x.fillStyle = "#b23a32";
    x.fillRect(px(t) - dpr, 0, 2 * dpr, H);
  }
}
