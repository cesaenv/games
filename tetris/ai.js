// Jugadores automáticos del Tetris. Cada uno decide dónde colocar la pieza que está cayendo
// y devuelve { rot, x }: cuántos giros y en qué columna debe quedar.

import { COLS, ROWS, cellsOf, collides } from './game.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Todas las formas de colocar una pieza sobre un tablero: giro, columna y cómo queda después */
function placements(grid, type) {
  const out = [];
  const seen = new Set();
  for (let rot = 0; rot < 4; rot++) {
    const cells = cellsOf(type, rot);
    // Giros que dan la misma figura (O, I, S, Z) no se repiten
    const shape = new Set(cells.map(([x, y]) => `${x - Math.min(...cells.map((c) => c[0]))},${y - Math.min(...cells.map((c) => c[1]))}`));
    const key = [...shape].sort().join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    for (let x = -3; x < COLS; x++) {
      if (collides(grid, type, rot, x, -2)) continue;
      let y = -2;
      while (!collides(grid, type, rot, x, y + 1)) y += 1;
      if (cells.some(([, cy]) => y + cy < 0)) continue;
      const next = grid.map((row) => row.slice());
      for (const [cx, cy] of cells) next[y + cy][x + cx] = type;
      const kept = next.filter((row) => row.some((c) => !c));
      const cleared = ROWS - kept.length;
      const result = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept];
      out.push({ rot, x, grid: result, cleared });
    }
  }
  return out;
}

/** Datos del tablero que se usan para puntuar una colocación */
function features(grid, cleared) {
  const heights = Array(COLS).fill(0);
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let top = -1;
    for (let y = 0; y < ROWS; y++) {
      if (grid[y][x]) {
        if (top < 0) top = y;
      } else if (top >= 0) {
        holes += 1;
      }
    }
    heights[x] = top < 0 ? 0 : ROWS - top;
  }
  let bumpiness = 0;
  for (let x = 0; x < COLS - 1; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);
  return { height: heights.reduce((a, b) => a + b, 0), holes, bumpiness, lines: cleared };
}

// Cuánto pesa cada dato: menos altura, menos huecos, superficie lisa y más líneas completas
const WEIGHTS = { height: -0.51, holes: -0.36, bumpiness: -0.18, lines: 0.76 };

function score(grid, cleared, weights) {
  const f = features(grid, cleared);
  return f.height * weights.height + f.holes * weights.holes + f.bumpiness * weights.bumpiness + f.lines * weights.lines;
}

/** Random: una colocación válida cualquiera */
export function random(game) {
  const p = pick(placements(game.grid, game.piece.type));
  return p ? { rot: p.rot, x: p.x } : { rot: 0, x: game.piece.x };
}

/** Algorithm: la colocación que deja el mejor tablero, mirando solo la pieza actual */
export function algorithm(game) {
  let best = null;
  let bestScore = -Infinity;
  for (const p of placements(game.grid, game.piece.type)) {
    const s = score(p.grid, p.cleared, WEIGHTS) + Math.random() * 1e-6;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best ? { rot: best.rot, x: best.x } : { rot: 0, x: game.piece.x };
}

/** Smart: igual que Algorithm, pero mirando también dónde iría la pieza siguiente */
export function smart(game) {
  let best = null;
  let bestScore = -Infinity;
  for (const p of placements(game.grid, game.piece.type)) {
    let s = -Infinity;
    for (const q of placements(p.grid, game.next)) {
      s = Math.max(s, score(q.grid, q.cleared + p.cleared, WEIGHTS));
    }
    if (s === -Infinity) s = score(p.grid, p.cleared, WEIGHTS) - 1000;
    s += Math.random() * 1e-6;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best ? { rot: best.rot, x: best.x } : { rot: 0, x: game.piece.x };
}

export const STRATEGIES = { Random: random, Algorithm: algorithm, Smart: smart };
