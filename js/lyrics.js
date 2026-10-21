/**
 * Lyric timeline — single source of truth for lyric text and timing.
 *
 * Song:   Merry Christmas, Please Don't Call — Bleachers
 * Audio:  assets/audio/merry-christmas-please-dont-call.mp3
 *
 * Timestamps are measured against actual recording playback (`audio.currentTime`).
 * Lines marked `verified: true` have passed double-model cross-checking and clip
 * re-transcription validation. Lines marked `verified: false` are aligned to their
 * vocal phrases and can be fine-tuned or reviewed in the timeline editor (index.html?editor).
 */

export const SONG = {
  title: "Merry Christmas, Please Don't Call",
  artist: "Bleachers",
  src: "assets/audio/merry-christmas-please-dont-call.mp3",
  duration: 202.150,
};

export const SECTIONS = {
  intro: { label: "intro", tone: "cold" },
  verse1: { label: "verse i", tone: "cold" },
  pre1: { label: "pre-chorus", tone: "warm" },
  chorus1: { label: "chorus", tone: "red" },
  verse2: { label: "verse ii", tone: "cold" },
  pre2: { label: "pre-chorus", tone: "warm" },
  chorus2: { label: "chorus", tone: "red" },
  bridge: { label: "bridge", tone: "blue" },
  chorus3: { label: "chorus", tone: "red" },
  outro: { label: "outro", tone: "ghost" },
};

export const lyrics = [
  // Verse 1
  { id: 1, start: 3.80, end: 6.80, text: "To the tempo of your uptight", section: "verse1", animation: "letters", confidence: 0.70, verified: false },
  { id: 2, start: 6.80, end: 9.80, text: "Is the flicker of a streetlight", section: "verse1", animation: "flicker", confidence: 0.75, verified: false },
  { id: 3, start: 9.80, end: 12.72, text: "You know this moment, don't you?", section: "verse1", animation: "fade", confidence: 0.70, verified: false },
  { id: 4, start: 12.72, end: 16.10, text: "And time is strangely calm now", section: "verse1", animation: "spread", confidence: 0.82, verified: false },
  { id: 5, start: 16.10, end: 17.74, text: "'Cause everybody's gone", section: "verse1", animation: "blur", confidence: 0.85, verified: false },
  { id: 6, start: 17.74, end: 21.76, text: "It's just you and your anger", section: "verse1", animation: "glitch", confidence: 0.88, verified: false },

  // Pre-Chorus 1
  { id: 7, start: 21.76, end: 26.44, text: "Oh, golden boy, don't act like you were kind", section: "pre1", animation: "words", confidence: 0.90, verified: false },
  { id: 8, start: 27.84, end: 30.64, text: "You were mine, but you were awful every time", section: "pre1", animation: "words", confidence: 0.89, verified: false },
  { id: 9, start: 30.90, end: 32.88, text: "So don't tell them what you told me", section: "pre1", animation: "rise", confidence: 0.94, verified: false },
  { id: 10, start: 33.10, end: 35.38, text: "Don't hold me like you know me", section: "pre1", animation: "rise", confidence: 0.93, verified: true },
  { id: 11, start: 35.96, end: 38.68, text: "I would rather burn forever", section: "pre1", animation: "glitch", confidence: 0.80, verified: false },

  // Chorus 1
  { id: 12, start: 38.68, end: 43.60, text: "But you should know that I died slow", section: "chorus1", animation: "spread", confidence: 0.84, verified: true },
  { id: 13, start: 43.92, end: 47.72, text: "Running through the halls of your haunted home", section: "chorus1", animation: "words", confidence: 0.98, verified: true },
  { id: 14, start: 48.02, end: 51.88, text: "And the toughest part is that we both know", section: "chorus1", animation: "rise", confidence: 0.99, verified: true },
  { id: 15, start: 51.88, end: 54.04, text: "What happened to you", section: "chorus1", animation: "blur", confidence: 0.98, verified: true },
  { id: 16, start: 54.44, end: 56.60, text: "Why you're out on your own", section: "chorus1", animation: "fade", confidence: 0.93, verified: true },
  { id: 17, start: 57.14, end: 60.32, text: "Merry Christmas, please don't call", section: "chorus1", animation: "impact", confidence: 0.89, verified: true },

  // Verse 2
  { id: 18, start: 64.00, end: 67.20, text: "You really left me on the line, kid", section: "verse2", animation: "letters", confidence: 0.72, verified: false },
  { id: 19, start: 67.20, end: 70.00, text: "Holding all your baggage", section: "verse2", animation: "fade", confidence: 0.75, verified: false },
  { id: 20, start: 70.00, end: 73.42, text: "You know I'm not your father", section: "verse2", animation: "glitch", confidence: 0.88, verified: false },
  { id: 21, start: 73.42, end: 76.20, text: "Who says, \"Welcome to your uptight\"", section: "verse2", animation: "spread", confidence: 0.82, verified: false },
  { id: 22, start: 76.20, end: 79.50, text: "While it flickers like a streetlight", section: "verse2", animation: "flicker", confidence: 0.75, verified: false },
  { id: 23, start: 79.50, end: 82.50, text: "He flickers through your damage", section: "verse2", animation: "flicker", confidence: 0.75, verified: false },

  // Pre-Chorus 2
  { id: 24, start: 82.50, end: 86.20, text: "Oh, golden boy, you shined a light on your home", section: "pre2", animation: "words", confidence: 0.78, verified: false },
  { id: 25, start: 86.20, end: 89.70, text: "And at your best, you were magic, we were sold", section: "pre2", animation: "words", confidence: 0.80, verified: false },
  { id: 26, start: 89.70, end: 92.78, text: "But don't tell 'em what you told me", section: "pre2", animation: "rise", confidence: 0.86, verified: false },
  { id: 27, start: 92.78, end: 95.40, text: "Don't even tell 'em that you know me", section: "pre2", animation: "rise", confidence: 0.85, verified: false },
  { id: 28, start: 95.76, end: 98.70, text: "I would rather burn forever", section: "pre2", animation: "glitch", confidence: 0.75, verified: true },

  // Chorus 2
  { id: 29, start: 99.30, end: 103.50, text: "But you should know that I died slow", section: "chorus2", animation: "spread", confidence: 0.82, verified: false },
  { id: 30, start: 104.18, end: 107.64, text: "Running through the halls of your haunted home", section: "chorus2", animation: "words", confidence: 0.92, verified: true },
  { id: 31, start: 108.24, end: 111.86, text: "And the toughest part is that we both know", section: "chorus2", animation: "rise", confidence: 0.85, verified: false },
  { id: 32, start: 111.86, end: 114.00, text: "What happened to you", section: "chorus2", animation: "blur", confidence: 0.99, verified: true },
  { id: 33, start: 114.34, end: 116.98, text: "Why you're out on your own", section: "chorus2", animation: "fade", confidence: 0.88, verified: false },
  { id: 34, start: 117.02, end: 120.70, text: "Merry Christmas, please don't call", section: "chorus2", animation: "impact", confidence: 0.86, verified: false },

  // Bridge
  { id: 35, start: 123.16, end: 128.40, text: "Just one ticket out of your heavy gaze", section: "bridge", animation: "letters", confidence: 0.88, verified: false },
  { id: 36, start: 128.40, end: 132.50, text: "I want one ticket off of your carousel", section: "bridge", animation: "words", confidence: 0.85, verified: false },
  { id: 37, start: 132.50, end: 137.40, text: "I want one ticket out of your heavy gaze", section: "bridge", animation: "blur", confidence: 0.85, verified: false },
  { id: 38, start: 137.40, end: 141.92, text: "I want one ticket off of your carousel", section: "bridge", animation: "glitch", confidence: 0.85, verified: false },

  // Chorus 3
  { id: 39, start: 141.92, end: 146.36, text: "But you should know that I die slow", section: "chorus3", animation: "spread", confidence: 0.88, verified: false },
  { id: 40, start: 146.86, end: 150.62, text: "Running through the halls of your haunted home", section: "chorus3", animation: "words", confidence: 0.89, verified: false },
  { id: 41, start: 150.62, end: 154.68, text: "And the toughest part is that we both know", section: "chorus3", animation: "rise", confidence: 0.90, verified: false },
  { id: 42, start: 154.68, end: 156.86, text: "What happened to you", section: "chorus3", animation: "blur", confidence: 0.97, verified: true },
  { id: 43, start: 156.86, end: 159.58, text: "Why you're out on your own", section: "chorus3", animation: "fade", confidence: 0.91, verified: false },
  { id: 44, start: 159.58, end: 163.40, text: "Merry Christmas, please don't call", section: "chorus3", animation: "impact", confidence: 0.86, verified: false },

  // Outro
  { id: 45, start: 163.40, end: 168.28, text: "Merry Christmas, I'm not yours at all", section: "outro", animation: "spread", confidence: 0.90, verified: false },
  { id: 46, start: 168.28, end: 173.36, text: "Merry Christmas, please don't call me", section: "outro", animation: "impact", confidence: 0.92, verified: false },
  { id: 47, start: 174.12, end: 178.06, text: "Please don't call me", section: "outro", animation: "echo", confidence: 0.95, verified: false },
  { id: 48, start: 178.50, end: 182.80, text: "Please don't call me", section: "outro", animation: "echo", confidence: 0.88, verified: false },
  { id: 49, start: 183.00, end: 187.80, text: "Please don't call me", section: "outro", animation: "fade", confidence: 0.88, verified: false },
];
