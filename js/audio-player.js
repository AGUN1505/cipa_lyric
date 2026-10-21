/**
 * AudioPlayer — thin wrapper around the <audio> element + the minimal control UI.
 * audio.currentTime is the single playback clock for the whole app.
 */

const fmt = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export class AudioPlayer extends EventTarget {
  constructor({ audio, src, ui }) {
    super();
    this.audio = audio;
    this.ui = ui;
    this.scrubbing = false;
    this.lastVolume = 0.9;

    audio.src = src;
    audio.volume = Number(ui.volume.value);
    audio.preload = "auto";

    this.#bind();
  }

  get currentTime() { return this.audio.currentTime; }
  get duration() { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
  get paused() { return this.audio.paused; }

  async play() {
    try {
      await this.audio.play();
    } catch (err) {
      // Autoplay restrictions: surface, don't crash.
      console.warn("[player] play() was blocked:", err.message);
      this.dispatchEvent(new CustomEvent("blocked"));
    }
  }

  pause() { this.audio.pause(); }
  toggle() { return this.audio.paused ? this.play() : this.pause(); }

  seek(t) {
    const d = this.duration || 0;
    this.audio.currentTime = Math.max(0, Math.min(d ? d - 0.01 : t, t));
    this.dispatchEvent(new CustomEvent("seek", { detail: this.audio.currentTime }));
  }

  nudge(dt) { this.seek(this.audio.currentTime + dt); }

  setVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    this.audio.volume = vol;
    if (vol > 0) this.audio.muted = false;
    this.ui.volume.value = String(vol);
    this.#paintRange(this.ui.volume, vol);
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
  }

  async toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen?.({ navigationUI: "hide" });
      else await document.exitFullscreen?.();
    } catch (err) {
      console.warn("[player] fullscreen unavailable:", err.message);
    }
  }

  /** Called every animation frame so the progress UI tracks the true clock. */
  tick() {
    const { seek, cur } = this.ui;
    const t = this.audio.currentTime;
    if (!this.scrubbing) {
      seek.value = String(t);
      this.#paintRange(seek, this.duration ? t / this.duration : 0);
    }
    cur.textContent = fmt(t);
  }

  #paintRange(input, frac) {
    input.style.setProperty("--p", `${(frac * 100).toFixed(3)}%`);
  }

  #bind() {
    const { audio, ui } = this;

    audio.addEventListener("loadedmetadata", () => {
      ui.seek.max = String(audio.duration);
      ui.dur.textContent = fmt(audio.duration);
      this.dispatchEvent(new CustomEvent("ready", { detail: audio.duration }));
    });
    audio.addEventListener("play", () => document.body.classList.add("is-playing"));
    audio.addEventListener("pause", () => document.body.classList.remove("is-playing"));
    audio.addEventListener("ended", () => this.dispatchEvent(new CustomEvent("ended")));
    audio.addEventListener("volumechange", () => {
      document.body.classList.toggle("is-muted", audio.muted || audio.volume === 0);
      ui.mute.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
    });
    audio.addEventListener("error", () => {
      const msg = audio.error ? `code ${audio.error.code}` : "unknown";
      console.error(`[player] failed to load audio (${msg}):`, audio.src);
      this.dispatchEvent(new CustomEvent("error", { detail: msg }));
    });

    ui.play.addEventListener("click", () => this.toggle());
    ui.mute.addEventListener("click", () => this.toggleMute());
    ui.fs.addEventListener("click", () => this.toggleFullscreen());

    ui.volume.addEventListener("input", () => this.setVolume(Number(ui.volume.value)));
    this.#paintRange(ui.volume, Number(ui.volume.value));

    // Seek bar: live scrubbing updates audio.currentTime immediately, so the
    // lyric engine (which reads currentTime) jumps to the right line at once.
    const startScrub = () => { this.scrubbing = true; };
    const endScrub = () => { this.scrubbing = false; };
    ui.seek.addEventListener("pointerdown", startScrub);
    ui.seek.addEventListener("pointerup", endScrub);
    ui.seek.addEventListener("pointercancel", endScrub);
    ui.seek.addEventListener("blur", endScrub);
    ui.seek.addEventListener("input", () => {
      const v = Number(ui.seek.value);
      this.#paintRange(ui.seek, this.duration ? v / this.duration : 0);
      this.seek(v);
    });
    ui.seek.addEventListener("change", endScrub);
  }
}

export { fmt as formatTime };
