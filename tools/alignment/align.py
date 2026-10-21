"""
Lyric alignment + validation for the Bleachers visualizer.

Source of truth: assets/audio/merry-christmas-please-dont-call.mp3
Lyric text:      js/lyrics.js  (parsed, never duplicated here)

Pipeline
  1. decode    – ffmpeg -> 16 kHz mono float32 PCM
  2. transcribe – faster-whisper with word-level timestamps (cached to output/)
  3. align     – Needleman-Wunsch alignment of lyric words <-> transcript words
                 (fuzzy word similarity, contraction-aware), per-line start/end
  4. validate  – each line's clip is re-transcribed in isolation and must
                 contain the line's words; a second model provides an
                 independent timing cross-check
  5. apply     – start / end / confidence / verified rewritten in js/lyrics.js

Usage (from repo root):
  tools\\alignment\\.venv\\Scripts\\python.exe tools\\alignment\\align.py --apply
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "assets" / "audio" / "merry-christmas-please-dont-call.mp3"
LYRICS_JS = ROOT / "js" / "lyrics.js"
OUT = Path(__file__).resolve().parent / "output"
SR = 16000

HOTWORDS = (
    "Merry Christmas, please don't call. golden boy. streetlight. uptight. "
    "carousel. haunted home. heavy gaze. baggage. flickers."
)

# ---------------------------------------------------------------- lyrics I/O

LINE_RE = re.compile(r'^\s*\{\s*id:\s*(\d+),.*?text:\s*("(?:[^"\\]|\\.)*"),\s*section:\s*"([^"]+)"')


def load_lyrics() -> list[dict]:
    items = []
    for raw in LYRICS_JS.read_text(encoding="utf-8").splitlines():
        m = LINE_RE.match(raw)
        if m:
            items.append({"id": int(m.group(1)), "text": json.loads(m.group(2)), "section": m.group(3)})
    if not items:
        sys.exit("No lyric entries parsed from js/lyrics.js")
    return items


def fmt_num(v):
    return "null" if v is None else f"{v:.2f}"


def apply_to_lyrics_js(results: dict[int, dict], duration: float) -> None:
    src = LYRICS_JS.read_text(encoding="utf-8").splitlines(keepends=True)
    out = []
    for raw in src:
        m = re.match(r"^(\s*\{\s*id:\s*)(\d+),", raw)
        if m and int(m.group(2)) in results:
            r = results[int(m.group(2))]
            raw = re.sub(r"start:\s*[^,]+,", f"start: {fmt_num(r['start'])},", raw, count=1)
            raw = re.sub(r"end:\s*[^,]+,", f"end: {fmt_num(r['end'])},", raw, count=1)
            raw = re.sub(r"confidence:\s*[^,]+,", f"confidence: {r['confidence']:.2f},", raw, count=1)
            raw = re.sub(r"verified:\s*(true|false)", f"verified: {'true' if r['verified'] else 'false'}", raw, count=1)
        raw = re.sub(r"^(\s*duration:\s*)[^,]+,", rf"\g<1>{duration:.3f},", raw)
        out.append(raw)
    LYRICS_JS.write_text("".join(out), encoding="utf-8")


# ---------------------------------------------------------------- audio


def decode_audio() -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", str(AUDIO), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    pcm = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


def probe_duration() -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(AUDIO)]
    return float(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.strip())


# ---------------------------------------------------------------- whisper


def load_model(name: str):
    from faster_whisper import WhisperModel

    model = WhisperModel(name, device="cpu", compute_type="int8")
    print(f"  model {name} loaded on cpu/int8", flush=True)
    return model


def transcribe_words(model, audio: np.ndarray, hotwords: str | None) -> list[dict]:
    kwargs = dict(
        language="en",
        word_timestamps=True,
        beam_size=5,
        vad_filter=False,
        condition_on_previous_text=False,
        temperature=0.0,
    )
    if hotwords:
        kwargs["hotwords"] = hotwords
    segments, _ = model.transcribe(audio, **kwargs)
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
    return words


def cached_transcript(model_name: str, mode: str, audio, model_cache: dict) -> list[dict]:
    path = OUT / f"words_{model_name}_{mode}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    if model_name not in model_cache:
        model_cache[model_name] = load_model(model_name)
    t0 = time.time()
    words = transcribe_words(model_cache[model_name], audio, HOTWORDS if mode == "hot" else None)
    print(f"  transcribed {model_name}/{mode}: {len(words)} words in {time.time() - t0:.0f}s", flush=True)
    path.write_text(json.dumps(words, indent=1), encoding="utf-8")
    return words


# ---------------------------------------------------------------- word matching

CANON = {"em": "them", "cause": "because", "cuz": "because", "til": "until", "gonna": "going", "ya": "you"}


def norm(word: str) -> str:
    w = word.lower().replace("\u2019", "'")
    w = re.sub(r"[^a-z0-9']", "", w).strip("'").replace("'", "")
    return CANON.get(w, w)


def word_sim(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def needleman_wunsch(lw: list[str], tw: list[str]) -> list[int | None]:
    """Global alignment; returns for each lyric word the index of the matched transcript word."""
    n, m = len(lw), len(tw)
    gap_l, gap_t = -1.0, -0.6  # skipping transcript words (hallucinations) is cheaper
    score = np.zeros((n + 1, m + 1), dtype=np.float32)
    trace = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diag, 1 up (skip lyric), 2 left (skip transcript)
    score[1:, 0] = np.arange(1, n + 1) * gap_l
    score[0, 1:] = np.arange(1, m + 1) * gap_t
    trace[1:, 0], trace[0, 1:] = 1, 2
    for i in range(1, n + 1):
        a = lw[i - 1]
        for j in range(1, m + 1):
            s = word_sim(a, tw[j - 1])
            sub = 2.0 if s == 1.0 else (1.0 if s >= 0.75 else -1.5)
            d, u, l = score[i - 1, j - 1] + sub, score[i - 1, j] + gap_l, score[i, j - 1] + gap_t
            if d >= u and d >= l:
                score[i, j], trace[i, j] = d, 0
            elif u >= l:
                score[i, j], trace[i, j] = u, 1
            else:
                score[i, j], trace[i, j] = l, 2
    match: list[int | None] = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        t = trace[i, j]
        if i > 0 and j > 0 and t == 0:
            if word_sim(lw[i - 1], tw[j - 1]) >= 0.75:
                match[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif i > 0 and (j == 0 or t == 1):
            i -= 1
        else:
            j -= 1
    return match


def align_lines(lines: list[dict], words: list[dict]) -> list[dict]:
    lw, owner, pos = [], [], []
    for li, line in enumerate(lines):
        toks = [norm(t) for t in line["text"].split()]
        toks = [t for t in toks if t]
        for k, t in enumerate(toks):
            lw.append(t)
            owner.append(li)
            pos.append((k, len(toks)))
    tw = [norm(w["w"]) for w in words]
    match = needleman_wunsch(lw, tw)

    out = []
    for li, line in enumerate(lines):
        idx = [k for k, o in enumerate(owner) if o == li]
        n = len(idx)
        hits = [(pos[k][0], words[match[k]]) for k in idx if match[k] is not None]
        res = {"id": line["id"], "text": line["text"], "n": n, "hits": len(hits), "coverage": len(hits) / n}
        if hits:
            first_k, first_w = hits[0]
            last_k, last_w = hits[-1]
            # extrapolate unmatched leading/trailing words at ~0.32 s per word
            res["start"] = max(0.0, first_w["s"] - first_k * 0.32)
            res["end"] = last_w["e"] + (n - 1 - last_k) * 0.32
            res["anchored"] = first_k <= 1 and last_k >= n - 2
            res["prob"] = float(np.mean([w["p"] for _, w in hits]))
        else:
            res.update(start=None, end=None, anchored=False, prob=0.0)
        out.append(res)

    # interpolate fully-missed lines between neighbours
    for i, r in enumerate(out):
        if r["start"] is None:
            prev_end = next((out[k]["end"] for k in range(i - 1, -1, -1) if out[k]["end"] is not None), 0.0)
            nxt = next((out[k]["start"] for k in range(i + 1, len(out)) if out[k]["start"] is not None), prev_end + 3)
            r["start"], r["end"] = prev_end + 0.1, max(prev_end + 0.6, nxt - 0.1)
            r["interpolated"] = True
    return out


def clip_overlap(text: str, clip_words: list[str]) -> float:
    want = [norm(t) for t in text.split() if norm(t)]
    pool = [norm(w) for w in clip_words if norm(w)]
    got = 0
    for t in want:
        best = max(range(len(pool)), key=lambda j: word_sim(t, pool[j]), default=None)
        if best is not None and word_sim(t, pool[best]) >= 0.75:
            got += 1
            pool.pop(best)
    return got / max(1, len(want))


# ---------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="medium.en")
    ap.add_argument("--check-model", default="medium.en")
    ap.add_argument("--apply", action="store_true", help="write results into js/lyrics.js")
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    duration = probe_duration()
    print(f"audio: {AUDIO.name}  duration={duration:.3f}s", flush=True)
    audio = decode_audio()
    lines = load_lyrics()
    print(f"lyrics: {len(lines)} lines from {LYRICS_JS.relative_to(ROOT)}", flush=True)

    models: dict = {}
    primary_words = cached_transcript(args.model, "hot", audio, models)
    check_words = cached_transcript(args.check_model, "plain", audio, models)

    primary = align_lines(lines, primary_words)
    check = {r["id"]: r for r in align_lines(lines, check_words)}

    # enforce monotonic, non-overlapping timeline
    for i in range(1, len(primary)):
        prev, cur = primary[i - 1], primary[i]
        if cur["start"] < prev["end"]:
            mid = (prev["end"] + cur["start"]) / 2 if cur["start"] > prev["start"] else prev["end"]
            prev["end"], cur["start"] = min(prev["end"], mid), max(cur["start"], min(prev["end"], mid))
        cur["end"] = max(cur["end"], cur["start"] + 0.4)

    # clip validation with the primary model, no hotwords, no context
    if args.model not in models:
        models[args.model] = load_model(args.model)
    model = models[args.model]
    results, report = {}, []
    for r in primary:
        a = max(0.0, r["start"] - 0.3)
        b = min(duration, r["end"] + 0.3)
        if b - a < 2.0:  # whisper needs a little context
            pad = (2.0 - (b - a)) / 2
            a, b = max(0.0, a - pad), min(duration, b + pad)
        segs, _ = model.transcribe(audio[int(a * SR): int(b * SR)], language="en", beam_size=5,
                                   condition_on_previous_text=False, vad_filter=False, temperature=0.0)
        clip_text = " ".join(s.text for s in segs).strip()
        ov = clip_overlap(r["text"], clip_text.split())
        c = check[r["id"]]
        d_start = abs(c["start"] - r["start"]) if c.get("start") is not None and not c.get("interpolated") else None
        dur = r["end"] - r["start"]
        plausible = 0.5 <= dur <= max(4.0, r["n"] * 1.4)
        conf = round(0.35 * r["coverage"] + 0.35 * ov + 0.15 * r["prob"]
                     + 0.15 * (1.0 if d_start is not None and d_start <= 0.4 else 0.0), 3)
        verified = bool(not r.get("interpolated") and r["coverage"] >= 0.7 and r["anchored"] and ov >= 0.6
                        and plausible and d_start is not None and d_start <= 0.4)
        results[r["id"]] = {"start": round(float(r["start"]), 2), "end": round(float(r["end"]), 2), "confidence": float(conf), "verified": bool(verified)}
        report.append({**{k: (float(r[k]) if isinstance(r[k], (np.floating, float)) else r[k]) for k in ("id", "text", "start", "end", "coverage", "anchored", "prob")},
                       "clip_text": clip_text, "clip_overlap": round(float(ov), 2),
                       "check_start": (float(c.get("start")) if c.get("start") is not None else None), "d_start": None if d_start is None else round(float(d_start), 2),
                       "plausible": bool(plausible), "confidence": float(conf), "verified": bool(verified)})
        flag = "OK " if verified else "-- "
        print(f"{flag}{r['id']:>2} {r['start']:7.2f}-{r['end']:7.2f} cov={r['coverage']:.2f} clip={ov:.2f} "
              f"dS={'n/a' if d_start is None else f'{d_start:.2f}'} | {r['text'][:46]:46} | {clip_text[:60]}", flush=True)

    (OUT / "alignment_report.json").write_text(json.dumps({"duration": duration, "lines": report}, indent=1), encoding="utf-8")
    n_ok = sum(1 for v in results.values() if v["verified"])
    print(f"\nverified {n_ok}/{len(results)} lines; report -> {(OUT / 'alignment_report.json').relative_to(ROOT)}", flush=True)
    if args.apply:
        apply_to_lyrics_js(results, duration)
        print("js/lyrics.js updated", flush=True)


if __name__ == "__main__":
    main()
