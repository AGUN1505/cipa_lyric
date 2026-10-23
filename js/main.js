/**
 * main.js — wires player, analyzer, lyric engine, ASCII canvas, effects and
 * the timeline editor into one requestAnimationFrame loop whose only clock is
 * audio.currentTime.
 */

import { SONG, SECTIONS, lyrics } from "./lyrics.js";
import { AudioPlayer } from "./audio-player.js";
import { AudioAnalyzer } from "./audio-analyzer.js";
import { LyricEngine } from "./lyric-engine.js";
import { AsciiRenderer } from "./ascii-renderer.js";
import { VisualEffects } from "./visual-effects.js";
import { TimelineEditor, loadOverrides } from "./timeline-editor.js";

const $ = (id) => document.getElementById(id);
const body = document.body;
const mobile = matchMedia("(max-width: 640px), (pointer: coarse)").matches;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ data

const base = lyrics.map((l) => ({ ...l }));
const { lines, overridden } = loadOverrides(lyrics);
if (overridden) $("local-badge").hidden = false;

// ------------------------------------------------------------------ modules

const audioEl = $("audio");
const player = new AudioPlayer({
  audio: audioEl,
  src: SONG.src,
  ui: {
    play: $("btn-play"), mute: $("btn-mute"), fs: $("btn-fs"),
    seek: $("seek"), volume: $("volume"), cur: $("t-cur"), dur: $("t-dur"),
  },
});
const analyzer = new AudioAnalyzer(audioEl);
const engine = new LyricEngine({
  container: $("lyrics"),
  ghostLayer: $("ghosts"),
  live: $("lyric-live"),
  tearMap: $("tear-map"),
  reducedMotion,
});
const ascii = new AsciiRenderer($("ascii-canvas"), { mobile });
const fx = new VisualEffects($("fx-canvas"), { mobile, reducedMotion });

engine.setTimeline(lines, SONG.duration ?? 0);

const editor = new TimelineEditor({
  root: $("editor"),
  player,
  engine,
  base,
  lines,
  onChange: (ls) => {
    engine.setTimeline(ls, player.duration);
    $("local-badge").hidden = false;
    paintSectionTicks();
  },
});

// ------------------------------------------------------------------ start gate (autoplay policy)

const gate = $("gate");
const gateBtn = $("gate-btn");
let ended = false;

async function begin() {
  await analyzer.start(); // AudioContext only after an intentional gesture
  if (ended) { player.seek(0); ended = false; }
  await player.play();
  if (!player.paused) gate.classList.add("is-gone");
}

gateBtn.addEventListener("click", begin);
audioEl.addEventListener("play", () => {
  analyzer.start();
  gate.classList.add("is-gone");
});
player.addEventListener("ended", () => {
  ended = true;
  gateBtn.lastChild.textContent = " listen again";
  gate.classList.remove("is-gone");
});
player.addEventListener("error", () => {
  gateBtn.lastChild.textContent = " audio file could not be loaded";
  gateBtn.disabled = true;
});

// ------------------------------------------------------------------ section ticks on the progress bar

function paintSectionTicks() {
  const d = player.duration;
  const host = $("progress-sections");
  host.innerHTML = "";
  if (!d) return;
  let prev = null;
  for (const l of lines) {
    if (!Number.isFinite(l.start) || l.section === prev) continue;
    prev = l.section;
    const i = document.createElement("i");
    i.style.left = `${(l.start / d) * 100}%`;
    i.title = SECTIONS[l.section]?.label ?? l.section;
    host.appendChild(i);
  }
}
player.addEventListener("ready", (e) => {
  engine.setTimeline(lines, e.detail);
  paintSectionTicks();
});

// ------------------------------------------------------------------ toggles

function setToggle(btn, on, label) {
  btn.classList.toggle("is-on", on);
  btn.setAttribute("aria-pressed", String(on));
  if (label) btn.textContent = label;
}
const state = { ascii: true, color: false, fx: !reducedMotion };

function toggleAscii() {
  state.ascii = !state.ascii;
  ascii.setEnabled(state.ascii);
  body.classList.toggle("no-ascii", !state.ascii);
  setToggle($("btn-ascii"), state.ascii);
}
function toggleColor() {
  state.color = !state.color;
  ascii.setColorMode(state.color);
  setToggle($("btn-color"), state.color, state.color ? "color" : "mono");
}
function toggleFx() {
  state.fx = !state.fx;
  fx.setEnabled(state.fx);
  engine.setFx(state.fx);
  body.classList.toggle("no-fx", !state.fx);
  setToggle($("btn-fx"), state.fx);
}
if (!state.fx) { state.fx = true; toggleFx(); }

const LYRIC_STYLES = ["ascii", "slant", "standard", "blocks", "shadow", "solid"];
let lyricStyleIdx = 0;

function cycleLyricStyle() {
  lyricStyleIdx = (lyricStyleIdx + 1) % LYRIC_STYLES.length;
  const current = LYRIC_STYLES[lyricStyleIdx];
  engine.setLyricStyle(current);
  const btn = $("btn-lyric-style");
  if (btn) {
    btn.textContent = `lyric: ${current}`;
    btn.classList.toggle("is-on", current !== "solid");
  }
}

$("btn-ascii").addEventListener("click", toggleAscii);
$("btn-lyric-style").addEventListener("click", cycleLyricStyle);
$("btn-color").addEventListener("click", toggleColor);
$("btn-fx").addEventListener("click", toggleFx);
$("btn-editor").addEventListener("click", () => editor.toggle());

// ------------------------------------------------------------------ keyboard

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName;
  const typing = (tag === "INPUT" && !["range", "checkbox"].includes(e.target.type)) || tag === "SELECT" || tag === "TEXTAREA";
  if (typing) return;
  const onRange = tag === "INPUT" && e.target.type === "range";
  const onButton = tag === "BUTTON";

  switch (e.key) {
    case " ":
    case "k":
      if (e.key === "k" && editor.isOpen) return; // editor uses K for "next line"
      if (onButton && e.key === " ") return; // native button activation
      e.preventDefault();
      gate.classList.contains("is-gone") ? player.toggle() : begin();
      break;
    case "ArrowRight": if (!onRange) { e.preventDefault(); player.nudge(e.shiftKey ? 1 : 5); } break;
    case "ArrowLeft": if (!onRange) { e.preventDefault(); player.nudge(e.shiftKey ? -1 : -5); } break;
    case "ArrowUp": if (!onRange) { e.preventDefault(); player.setVolume(audioEl.volume + 0.05); } break;
    case "ArrowDown": if (!onRange) { e.preventDefault(); player.setVolume(audioEl.volume - 0.05); } break;
    case "m": case "M": player.toggleMute(); break;
    case "f": case "F": player.toggleFullscreen(); break;
    case "a": case "A": toggleAscii(); break;
    case "l": case "L": cycleLyricStyle(); break;
    case "c": case "C": toggleColor(); break;
    case "v": case "V": toggleFx(); break;
    case "e": case "E": editor.toggle(); break;
    case "Escape": if (editor.isOpen) editor.close(); break;
    case "Home": player.seek(0); break;
    default: return;
  }
  wake();
});

// ------------------------------------------------------------------ auto-hiding chrome

let idleTimer = 0;
function wake() {
  body.classList.remove("is-chrome-hidden");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!player.paused && !editor.isOpen) body.classList.add("is-chrome-hidden");
  }, 2800);
}
["pointermove", "pointerdown", "touchstart"].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
audioEl.addEventListener("pause", wake);
audioEl.addEventListener("play", wake);

// ------------------------------------------------------------------ resize

let resizeRaf = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => { ascii.resize(); fx.resize(); });
});
document.addEventListener("fullscreenchange", () => window.dispatchEvent(new Event("resize")));

// ------------------------------------------------------------------ render loop

const hudSection = $("hud-section");
const hudTc = $("hud-tc");
let last = performance.now();
let lastLabel = "";

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  const t = audioEl.currentTime; // the one and only clock
  const m = analyzer.update(t, !audioEl.paused, dt);
  const st = engine.render(t, m);

  ascii.render(t, dt, m, st, analyzer);
  fx.render(t, m, st);
  player.tick();
  editor.update(t);

  if (body.dataset.section !== st.section) body.dataset.section = st.section;
  if (body.dataset.tone !== st.tone) body.dataset.tone = st.tone;
  if (st.label !== lastLabel) {
    lastLabel = st.label;
    hudSection.textContent = st.label;
    hudSection.classList.remove("is-changing");
    void hudSection.offsetWidth;
    hudSection.classList.add("is-changing");
  }
  const mm = Math.floor(t / 60), ss = (t % 60).toFixed(2).padStart(5, "0");
  hudTc.textContent = `${String(mm).padStart(2, "0")}:${ss}`;

  // the ASCII field blooms when nobody is singing
  const asciiOpacity = st.hasLyric ? 0.38 + m.level * 0.2 : 0.62 + m.level * 0.25;
  document.documentElement.style.setProperty("--ascii-opacity", asciiOpacity.toFixed(3));

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const urlParams = new URLSearchParams(location.search);
if (urlParams.has("editor")) editor.open();
if (urlParams.has("style")) {
  const s = urlParams.get("style");
  engine.setLyricStyle(s);
  const btn = $("btn-lyric-style");
  if (btn) btn.textContent = `lyric: ${s}`;
}
if (urlParams.has("t")) {
  const targetT = parseFloat(urlParams.get("t"));
  if (Number.isFinite(targetT)) {
    player.seek(targetT);
    gate.classList.add("is-gone");
  }
}
wake();

// debugging / automated testing handle
window.__viz = { player, engine, editor, lines, analyzer };
window.__player = player;
window.__engine = engine;
window.__editor = editor;
