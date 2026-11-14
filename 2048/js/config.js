// Configuration constants for the web UI and the AI controls.

import { Direction } from "./board.js";

// ------------------------------------------------------------------ colors
//
// Each entry is [background, foreground] and points to CSS variables
// (--tile-N, defined in style.css) so it follows the site theme.

const tile = (value, fg = "var(--text)") => [`var(--tile-${value})`, fg];
const MID_FG = "var(--tile-mid-fg)";
const HIGH_FG = "var(--accent-contrast)";

export const TILE_COLORS = {
  0: ["var(--empty-cell)", "var(--empty-cell)"],
  2: tile(2),
  4: tile(4),
  8: tile(8),
  16: tile(16),
  32: tile(32, MID_FG),
  64: tile(64, MID_FG),
  128: tile(128, HIGH_FG),
  256: tile(256, HIGH_FG),
  512: tile(512, HIGH_FG),
  1024: tile(1024, HIGH_FG),
  2048: tile(2048, HIGH_FG),
};
export const DEFAULT_TILE_COLOR = tile(2048, HIGH_FG);

// -------------------------------------------------------------------- sizes

export const CELL_SIZE = 100;
export const CELL_GAP = 10;

// --------------------------------------------------------------- animation

export const SLIDE_MS = 120;
export const POP_MS = 100;

// ------------------------------------------------------------------ input

export const KEY_TO_DIRECTION = {
  ArrowLeft: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  ArrowUp: Direction.UP,
  ArrowDown: Direction.DOWN,
  a: Direction.LEFT,
  d: Direction.RIGHT,
  w: Direction.UP,
  s: Direction.DOWN,
};

// ------------------------------------------------------------------------ AI

export const AI_MODES = ["Random", "Algorithm", "Smart"];
export const DEFAULT_AI_MODE = "Random";

// Delay in ms between AI moves. "Full" runs with no animation and no delay.
export const AI_SPEEDS = {
  Slow: 400,
  Fast: 120,
  Full: 0,
};
export const DEFAULT_AI_SPEED = "Fast";
