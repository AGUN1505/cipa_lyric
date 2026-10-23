/**
 * ascii-lyrics.js — Ultra-luxury, high-definition ASCII typography engine.
 *
 * Implements genuine high-production ASCII typography:
 * 1. Slant (Default): Cyber-italic demoscene vector ASCII (/ \ _ |) — sleek, fast, ultra-legible.
 * 2. FIGlet Standard: Geometric upright outline typography.
 * 3. Smooth Block: Clean Unicode half-blocks (█ ▀ ▄) with 0 clunky wireframe feet.
 * 4. ANSI Shadow: Classic 3D beveled BBS block letters.
 * 5. Balanced lyrical line wrapping for cinematic center framing.
 * 6. Sequential reading-order progressive reveal (word-by-word or char-by-char).
 * 7. Audio-reactive micro-shimmer that never compromises letter silhouettes.
 */

import { hash } from "./lyric-engine.js";

/** 5-row Cyber-Italic / Aesthetic Slant Font (Verified 0 Row Mismatches) */
export const SLANT_FONT = {
  'A': ["   ___  ", "  /   | ", " / /| | ", "/ ___ | ", "/_/  |_|"],
  'B': [" ____  ", "/ __ ) ", "/ __  |", "/ /_/ /", "/_____/"],
  'C': [" ______ ", "/ ____/ ", "/ /     ", "/ /___  ", "\\____/  "],
  'D': [" ____  ", "/ __ \\ ", "/ / / /", "/ /_/ /", "/_____/"],
  'E': [" ______", "/ ____/", "/ __/  ", "/ /___ ", "/_____/"],
  'F': [" ______", "/ ____/", "/ __/  ", "/ /    ", "/_/    "],
  'G': [" ______ ", "/ ____/ ", "/ / __  ", "/ /_/ / ", "\\____/  "],
  'H': [" __  __", "/ / / /", "/ /_/ /", "/ __  /", "/_/ /_/"],
  'I': [" ____", "/  _/", " / / ", "_/ / ", "/___/"],
  'J': ["     __", "    / /", "__ / / ", "/ // / ", "\\___/  "],
  'K': [" __  __", "/ //_/ ", "/ ,<   ", "/ /| | ", "/_/ |_|"],
  'L': [" __    ", "/ /    ", "/ /    ", "/ /___ ", "/_____/"],
  'M': [" __  ___", "/  |/  /", "/ /|_/ /", "/ /  / /", "/_/  /_/"],
  'N': [" _   __", "/ | / /", "/  |/ /", "/ /|  /", "/_/ |_/"],
  'O': ["  ____  ", " / __ \\ ", "/ / / / ", "/ /_/ / ", "\\____/  "],
  'P': [" ____  ", "/ __ \\ ", "/ /_/ /", "/ ____/", "/_/    "],
  'Q': ["  ____  ", " / __ \\ ", "/ / / / ", "/ /_/ / ", "\\___\\_\\ "],
  'R': [" ____  ", "/ __ \\ ", "/ /_/ /", "/ _, _/", "/_/ |_|"],
  'S': [" _____", "/ ___/", "\\__ \\ ", "___/ /", "/____/"],
  'T': [" ______", "/_  __/", " / /   ", " / /   ", " /_/   "],
  'U': [" __  __", "/ / / /", "/ / / /", "/ /_/ /", "\\____/ "],
  'V': [" _    __", "| |  / /", "| | / / ", "| |/ /  ", "|___/   "],
  'W': [" _       __", "| |     / /", "| | /| / / ", "| |/ |/ /  ", "|__/|__/   "],
  'X': ["   _  __", "  | |/ /", "  |   / ", " /   |  ", "/_/|_|  "],
  'Y': [" __  __", " \\ \\/ /", "  \\  / ", "  / /  ", " /_/   "],
  'Z': [" _____", "/__  /", "  / / ", " / /_ ", "/___/ "],
  '0': ["  ____  ", " / __ \\ ", "/ / / / ", "/ /_/ / ", "\\____/  "],
  '1': ["   ___", "  <  /", "  / / ", " / /  ", "/_/   "],
  '2': ["   ___ ", "  |__ \\", "  __/ /", " / __/ ", "/____/ "],
  '3': ["   _____", "  |__  /", "   /_ < ", " ___/ / ", "/____/  "],
  '4': ["   __ __", "  / // /", " / // /_", "/__  __/", "  /_/   "],
  '5': ["   ______", "  / ____/", " /___ \\  ", "____/ /  ", "/_____/  "],
  '6': ["   _____ ", "  / ___/ ", " / __ \\  ", "/ /_/ /  ", "\\____/   "],
  '7': ["  ______", " /_  __/", "  / /   ", " / /    ", " /_/    "],
  '8': ["   ____ ", "  ( __ )", " / __  |", "/ /_/ / ", "\\____/  "],
  '9': ["   ____ ", "  / __ \\", " / /_/ /", " \\__, / ", "/____/  "],
  ' ': ["    ", "    ", "    ", "    ", "    "],
  '\'': [" __ ", "/ / ", "/_/ ", "    ", "    "],
  '"': [" __ __ ", "/ // / ", "/_//_/ ", "       ", "       "],
  ',': ["   ", "   ", "   ", " _ ", "/ /"],
  '.': ["   ", "   ", "   ", " _ ", "(_)"],
  '!': [" _ ", "/ /", "/ /", "/_/", "(_)"],
  '?': ["  ___  ", " /__ \\ ", "   / / ", "  /_/  ", "  (_)  "],
  '-': ["      ", " ____ ", "/___/ ", "      ", "      "],
  ':': ["   ", " _ ", "(_)", " _ ", "(_)"],
  ';': ["   ", " _ ", "(_)", " _ ", "/_/"],
  '(': ["  __", " / /", "/ / ", "/ / ", "\\_\\ "],
  ')': [" __  ", " \\ \\ ", "  \\ \\", "  / /", " /_/ "]
};

/** 5-row Classic FIGlet Standard Font */
export const FIGLET_STANDARD = {
  'A': ["    _    ", "   / \\   ", "  / _ \\  ", " / ___ \\ ", "/_/   \\_\\"],
  'B': [" ____  ", "| __ ) ", "|  _ \\ ", "| |_) |", "|____/ "],
  'C': ["  ____ ", " / ___|", "| |    ", "| |___ ", " \\____|"],
  'D': [" ____  ", "|  _ \\ ", "| | | |", "| |_| |", "|____/ "],
  'E': [" _____ ", "| ____|", "|  _|  ", "| |___ ", "|_____|"],
  'F': [" _____ ", "|  ___|", "| |_   ", "|  _|  ", "|_|    "],
  'G': ["  ____ ", " / ___|", "| |  _ ", "| |_| |", " \\____|"],
  'H': [" _   _ ", "| | | |", "| |_| |", "|  _  |", "|_| |_|"],
  'I': [" ___ ", "|_ _|", " | | ", " | | ", "|___|"],
  'J': ["     _ ", "    | |", " _  | |", "| |_| |", " \\___/ "],
  'K': [" _  __", "| |/ /", "| ' / ", "| . \\ ", "|_|\\_\\"],
  'L': [" _     ", "| |    ", "| |    ", "| |___ ", "|_____|"],
  'M': [" __  __ ", "|  \\/  |", "| |\\/| |", "| |  | |", "|_|  |_|"],
  'N': [" _   _ ", "| \\ | |", "|  \\| |", "| |\\  |", "|_| \\_|"],
  'O': ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\___/ "],
  'P': [" ____  ", "|  _ \\ ", "| |_) |", "|  __/ ", "|_|    "],
  'Q': ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\__\\_\\"],
  'R': [" ____  ", "|  _ \\ ", "| |_) |", "|  _ < ", "|_| \\_\\"],
  'S': [" ____  ", "/ ___| ", "\\___ \\ ", " ___) |", "|____/ "],
  'T': [" _____ ", "|_   _|", "  | |  ", "  | |  ", "  |_|  "],
  'U': [" _   _ ", "| | | |", "| | | |", "| |_| |", " \\___/ "],
  'V': ["__     __", "\\ \\   / /", " \\ \\ / / ", "  \\ V /  ", "   \\_/   "],
  'W': ["__        __", "\\ \\      / /", " \\ \\ /\\ / / ", "  \\ V  V /  ", "   \\_/\\_/   "],
  'X': ["__  __", "\\ \\/ /", " \\  / ", " /  \\ ", "/_/\\_\\"],
  'Y': ["__   __", "\\ \\ / /", " \\ V / ", "  | |  ", "  |_|  "],
  'Z': [" _____", "|__  /", "  / / ", " / /_ ", "/____|"],
  '0': ["  ___  ", " / _ \\ ", "| | | |", "| |_| |", " \\___/ "],
  '1': [" _ ", "/ |", "| |", "| |", "|_|"],
  '2': [" ____  ", "|___ \\ ", "  __) |", " / __/ ", "|_____|"],
  '3': [" _____ ", "|___ / ", "  |_ \\ ", " ___) |", "|____/ "],
  '4': [" _  _   ", "| || |  ", "| || |_ ", "|__   _|", "   |_|  "],
  '5': [" ____  ", "| ___| ", "|___ \\ ", " ___) |", "|____/ "],
  '6': ["  __   ", " / /_  ", "| '_ \\ ", "| (_) |", " \\___/ "],
  '7': [" _____ ", "|___  |", "   / / ", "  / /  ", " /_/   "],
  '8': ["  ___  ", " ( _ ) ", " / _ \\ ", "| (_) |", " \\___/ "],
  '9': ["  ___  ", " / _ \\ ", "| (_) |", " \\__, |", "   /_/ "],
  ' ': ["   ", "   ", "   ", "   ", "   "],
  ',': ["   ", "   ", "   ", " _ ", "(_)"],
  '\'': [" _ ", "(_)", "   ", "   ", "   "],
  '"': [" _ _ ", "(_|_)", "     ", "     ", "     "],
  '.': ["   ", "   ", "   ", " _ ", "(_)"],
  '!': [" _ ", "| |", "| |", "|_|", "(_)"],
  '?': [" ___ ", "|__ \\", "  / /", " |_| ", " (_)"],
  '-': ["      ", "      ", " ____ ", "|____|", "      "],
  ':': ["   ", " _ ", "(_)", " _ ", "(_)"]
};

/** 4-row Smooth Unicode Half-Block Font (No Wireframe Clutter) */
export const SMOOTH_BLOCK = {
  'A': [" ▄▀▀▄ ", " █▄▄█ ", " █  █ ", " ▀  ▀ "],
  'B': [" █▀▀▄ ", " █▀▀▄ ", " █▄▄▀ ", " ▀▀▀  "],
  'C': [" ▄▀▀▀ ", " █    ", " █▄▄▄ ", " ▀▀▀  "],
  'D': [" █▀▀▄ ", " █  █ ", " █▄▄▀ ", " ▀▀▀  "],
  'E': [" █▀▀▀ ", " █▀▀  ", " █▄▄▄ ", " ▀▀▀  "],
  'F': [" █▀▀▀ ", " █▀▀  ", " █    ", " ▀    "],
  'G': [" ▄▀▀▀ ", " █ ▀▄ ", " █▄▄█ ", " ▀▀▀  "],
  'H': [" █  █ ", " █▀▀█ ", " █  █ ", " ▀  ▀ "],
  'I': [" ▄█▄ ", "  █  ", " ▄█▄ ", " ▀▀▀ "],
  'J': ["   ▄█ ", "    █ ", " ▀▄▄█ ", "  ▀▀  "],
  'K': [" █ ▄▀ ", " █▀▄  ", " █  █ ", " ▀  ▀ "],
  'L': [" █    ", " █    ", " █▄▄▄ ", " ▀▀▀  "],
  'M': [" █▄▀▄█ ", " █ ▀ █ ", " █   █ ", " ▀   ▀ "],
  'N': [" █▀▄ █ ", " █ █ █ ", " █  ▀█ ", " ▀   ▀ "],
  'O': [" ▄▀▀▄ ", " █  █ ", " ▀▄▄▀ ", "  ▀▀  "],
  'P': [" █▀▀▄ ", " █▄▄▀ ", " █    ", " ▀    "],
  'Q': [" ▄▀▀▄ ", " █  █ ", " ▀▄▄█ ", "  ▀▀▀ "],
  'R': [" █▀▀▄ ", " █▄▄▀ ", " █  █ ", " ▀  ▀ "],
  'S': [" ▄▀▀▀ ", " ▀▀▄▄ ", " ▄▄▄▀ ", " ▀▀▀  "],
  'T': [" ▀█▀ ", "  █  ", "  █  ", "  ▀  "],
  'U': [" █  █ ", " █  █ ", " ▀▄▄▀ ", "  ▀▀  "],
  'V': [" █  █ ", " █  █ ", "  ▀▄▀  ", "   ▀   "],
  'W': [" █   █ ", " █ █ █ ", " ▀█▀█▀ ", "  ▀ ▀  "],
  'X': [" █  █ ", "  ▀▄▀  ", " █  █ ", " ▀  ▀ "],
  'Y': [" █  █ ", "  ▀▄█  ", "   █   ", "   ▀   "],
  'Z': [" ▀▀█▀ ", "  ▄▀  ", " █▄▄▄ ", " ▀▀▀  "],
  '0': [" ▄▀▀▄ ", " █ ▄█ ", " █▀ █ ", "  ▀▀  "],
  '1': ["  ▄█ ", "   █ ", "   █ ", "  ▀▀▀"],
  '2': [" ▀▀▄▄ ", " ▄▄▄█ ", " █▄▄▄ ", " ▀▀▀▀ "],
  '3': [" ▀▀▄▄ ", "  ▄▄█ ", " ▄▄▄█ ", " ▀▀▀▀ "],
  '4': [" █  █ ", " █▄▄█ ", "    █ ", "    ▀ "],
  '5': [" █▀▀▀ ", " █▀▀▄ ", " ▄▄▄▀ ", " ▀▀▀  "],
  '6': [" ▄▀▀▀ ", " █▀▀▄ ", " █▄▄▀ ", " ▀▀▀  "],
  '7': [" ▀▀▀█ ", "   █  ", "  █   ", "  ▀   "],
  '8': [" ▄▀▀▄ ", " ▄▀▀▄ ", " ▀▄▄▀ ", "  ▀▀  "],
  '9': [" ▄▀▀▄ ", " ▀▄▄█ ", "    █ ", "    ▀ "],
  ' ': ["   ", "   ", "   ", "   "],
  '\'': [" ▄ ", " ▀ ", "   ", "   "],
  '"': [" ▄ ▄ ", " ▀ ▀ ", "     ", "     "],
  ',': ["   ", "   ", " ▄ ", " ▀ "],
  '.': ["   ", "   ", " ▄ ", " ▀ "],
  '!': [" █ ", " █ ", " ▄ ", " ▀ "],
  '?': [" █▀▄ ", "  ▄▀ ", "  ▄  ", "  ▀  "],
  '-': ["     ", " ▄▄▄ ", "     ", "     "]
};

/** 6-row 3D Beveled ANSI Shadow Font */
export const ANSI_SHADOW = {
  'A': [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  'B': ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ "],
  'C': [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"],
  'D': ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
  'E': ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  'F': ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "██║     ", "╚═╝     "],
  'G': [" ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  'H': ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  'I': ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  'J': ["     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ "],
  'K': ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
  'L': ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"],
  'M': ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
  'N': ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"],
  'O': [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  'P': ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  'Q': [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ "],
  'R': ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  'S': ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  'T': ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
  'U': ["██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  'V': ["██╗   ██╗", "██║   ██║", "██║   ██║", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚═══╝  "],
  'W': ["██╗    ██╗", "██║    ██║", "██║ █╗ ██║", "██║███╗██║", "╚███╔███╔╝", " ╚══╝╚══╝ "],
  'X': ["██╗  ██╗", "╚██╗██╔╝", " ╚███╔╝ ", " ██╔██╗ ", "██╔╝ ██╗", "╚═╝  ╚═╝"],
  'Y': ["██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   "],
  'Z': ["███████╗", "╚══███╔╝", "  ███╔╝ ", " ███╔╝  ", "███████╗", "╚══════╝"],
  '0': [" ██████╗ ", "██╔═████╗", "██║██╔██║", "████╔╝██║", "╚██████╔╝", " ╚═════╝ "],
  '1': [" ██╗", "███║", "╚██║", " ██║", " ██║", " ╚═╝"],
  '2': ["██████╗ ", "╚════██╗", " █████╔╝", "██╔═══╝ ", "███████╗", "╚══════╝"],
  '3': ["██████╗ ", "╚════██╗", " █████╔╝", " ╚═══██╗", "██████╔╝", "╚═════╝ "],
  '4': ["██╗  ██╗", "██║  ██║", "███████║", "╚════██║", "     ██║", "     ╚═╝"],
  '5': ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  '6': [" ██████╗ ", "██╔════╝ ", "███████╗ ", "██╔═══██╗", "╚██████╔╝", " ╚═════╝ "],
  '7': ["████████╗", "╚════██╔╝", "    ██╔╝ ", "   ██╔╝  ", "   ██║   ", "   ╚═╝   "],
  '8': [" ██████╗ ", "██╔═══██╗", "╚██████╔╝", "██╔═══██╗", "╚██████╔╝", " ╚═════╝ "],
  '9': [" ██████╗ ", "██╔═══██╗", "╚███████║", " ╚════██║", " ██████╔╝", " ╚═════╝ "],
  ' ': ["    ", "    ", "    ", "    ", "    ", "    "],
  ',': ["   ", "   ", "   ", "   ", "██╗", "╚═╝"],
  '\'': ["██╗", "╚═╝", "   ", "   ", "   ", "   "],
  '"': ["██╗██╗", "╚═╝╚═╝", "      ", "      ", "      ", "      "],
  '.': ["   ", "   ", "   ", "   ", "██╗", "╚═╝"],
  '!': ["██╗", "██║", "██║", "╚═╝", "██╗", "╚═╝"],
  '?': ["██████╗ ", "╚════██╗", "  █████╔╝", "  ╚════╝ ", "  ██╗    ", "  ╚═╝    "],
  '-': ["      ", "      ", "██████", "╚═════", "      ", "      "],
  ':': ["   ", "██╗", "╚═╝", "██╗", "╚═╝", "   "]
};

export const ASCII_STYLES = {
  slant: { name: "slant", font: SLANT_FONT, height: 5, spacer: 1 },
  standard: { name: "standard", font: FIGLET_STANDARD, height: 5, spacer: 1 },
  blocks: { name: "blocks", font: SMOOTH_BLOCK, height: 4, spacer: 1 },
  shadow: { name: "shadow", font: ANSI_SHADOW, height: 6, spacer: 1 },
  cyber: { name: "cyber", font: SLANT_FONT, height: 5, spacer: 1 },
  minimal: { name: "minimal", font: FIGLET_STANDARD, height: 5, spacer: 1 }
};

const gridCache = new Map();

function getWordCols(w, FONT) {
  let cols = 0;
  for (const ch of w.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    cols += g[0].length;
  }
  return cols;
}

/**
 * Intelligent device-adaptive line wrapper for cinematic lyric typography.
 * Wraps words into balanced lines based on the exact column width of words in the active font.
 */
export function wrapForAscii(text, FONT, { isMobile = false, viewportWidth = 1200 } = {}) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= 1) return words;

  const spcCols = FONT[' '][0].length;

  // Max column threshold target based on device width
  let maxTargetCols = 130;
  if (viewportWidth <= 380) maxTargetCols = 52;
  else if (viewportWidth <= 540) maxTargetCols = 60;
  else if (viewportWidth <= 768) maxTargetCols = 80;
  else if (viewportWidth <= 1024) maxTargetCols = 100;

  // Adjust column threshold if font is naturally narrower
  if (FONT === SMOOTH_BLOCK) maxTargetCols = Math.round(maxTargetCols * 0.75);
  else if (FONT === FIGLET_STANDARD) maxTargetCols = Math.round(maxTargetCols * 0.85);

  const lines = [];
  let cur = [];
  let curWidth = 0;

  for (const w of words) {
    const ww = getWordCols(w, FONT);
    const wouldBe = cur.length === 0 ? ww : curWidth + spcCols + ww;

    if (cur.length > 0 && wouldBe > maxTargetCols) {
      lines.push(cur.join(" "));
      cur = [w];
      curWidth = ww;
    } else {
      cur.push(w);
      curWidth = wouldBe;
    }
  }
  if (cur.length) lines.push(cur.join(" "));
  return lines;
}

/**
 * Build the ASCII layout grid for `text`.
 * Returns row objects with precise column-to-character and column-to-word tracking.
 */
export function buildGrid(text, { style = "slant", isMobile = false, viewportWidth = 1200 } = {}) {
  const S = ASCII_STYLES[style] || ASCII_STYLES.slant;
  const FONT = S.font;
  const glyphH = S.height;

  // Adaptive bucket key for responsive grid caching
  const bucket = viewportWidth <= 380 ? "xs" : viewportWidth <= 540 ? "sm" : viewportWidth <= 768 ? "md" : viewportWidth <= 1024 ? "lg" : "xl";
  const key = `${text}|${S.name}|${bucket}`;
  const hit = gridCache.get(key);
  if (hit) return hit;

  const lines = wrapForAscii(text, FONT, { isMobile, viewportWidth });

  const rows = [];
  let charSeq = 0;
  let wordSeq = 0;
  let maxColWidth = 0;

  lines.forEach((lineText, lineIdx) => {
    const lineWords = lineText.split(" ");
    const lineRows = Array.from({ length: glyphH }, () => "");
    const colToCharSeq = Array.from({ length: glyphH }, () => []);
    const colToWordSeq = Array.from({ length: glyphH }, () => []);

    lineWords.forEach((word, wordIdx) => {
      const currentWordIdx = wordSeq++;
      for (const ch of word.toUpperCase()) {
        const glyph = FONT[ch] || FONT[' '];
        const currentChSeq = charSeq++;
        for (let r = 0; r < glyphH; r++) {
          const gStr = glyph[r];
          lineRows[r] += gStr;
          for (let k = 0; k < gStr.length; k++) {
            colToCharSeq[r].push(currentChSeq);
            colToWordSeq[r].push(currentWordIdx);
          }
        }
      }
      if (wordIdx < lineWords.length - 1) {
        // Space between words
        const spc = FONT[' '];
        for (let r = 0; r < glyphH; r++) {
          lineRows[r] += spc[r];
          for (let k = 0; k < spc[r].length; k++) {
            colToCharSeq[r].push(charSeq - 1);
            colToWordSeq[r].push(currentWordIdx);
          }
        }
      }
    });

    for (let r = 0; r < glyphH; r++) {
      const trimmed = lineRows[r].trimEnd();
      if (trimmed.length > maxColWidth) maxColWidth = trimmed.length;
      rows.push({
        text: trimmed,
        colChar: colToCharSeq[r],
        colWord: colToWordSeq[r],
        lineIdx,
        rowInGlyph: r,
        isSpacer: false
      });
    }

    // 1 empty spacer row between lines of text
    if (lineIdx < lines.length - 1) {
      rows.push({
        text: "",
        colChar: [],
        colWord: [],
        lineIdx,
        rowInGlyph: -1,
        isSpacer: true
      });
    }
  });

  const grid = {
    text,
    style: S.name,
    lines,
    rows,
    totalRows: rows.length,
    cols: Math.max(30, maxColWidth),
    totalChars: charSeq,
    totalWords: wordSeq
  };

  if (gridCache.size > 120) gridCache.delete(gridCache.keys().next().value);
  gridCache.set(key, grid);
  return grid;
}

/**
 * Print the grid with sequential reading-order reveal and audio-reactive micro-shimmer.
 */
export function printGrid(grid, { scramble = 0, reveal = 1, byWord = false, time = 0, seed = 0 } = {}) {
  const tick = Math.floor(time * 14);
  const out = [];

  // Cutoff in reading order: sequentially across characters or words
  const cutoff = reveal >= 1
    ? 999999
    : byWord
      ? Math.floor(reveal * (grid.totalWords + 0.1))
      : Math.floor(reveal * (grid.totalChars + 0.1));

  for (let rIdx = 0; rIdx < grid.rows.length; rIdx++) {
    const rowObj = grid.rows[rIdx];
    if (rowObj.isSpacer) {
      out.push("");
      continue;
    }

    const raw = rowObj.text;
    const len = raw.length;
    let rowStr = "";

    for (let c = 0; c < len; c++) {
      const idx = byWord ? rowObj.colWord[c] : rowObj.colChar[c];
      if (idx !== undefined && idx > cutoff) {
        rowStr += " ";
        continue;
      }

      let ch = raw[c];
      if (ch === " ") {
        rowStr += " ";
        continue;
      }

      // Audio-reactive beat / glitch micro-swaps on punctuation or accent characters
      if (scramble > 0.08) {
        const cellHash = hash(c * 19.3 + rIdx * 37.1 + seed * 5.3 + tick);
        if (cellHash < Math.min(0.04, scramble * 0.05)) {
          if (ch === "/") ch = "\\";
          else if (ch === "\\") ch = "/";
          else if (ch === "_") ch = "-";
          else if (ch === "|") ch = "/";
        }
      }

      rowStr += ch;
    }

    out.push(rowStr.replace(/\s+$/g, ""));
  }

  // Trim trailing empty rows
  while (out.length && !out[out.length - 1].trim()) out.pop();

  return out.join("\n");
}
