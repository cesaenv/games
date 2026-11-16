// Lógica del Tetris, sin nada de pantalla.

export const COLS = 10;
export const ROWS = 20;
export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const BASE = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

function turn(matrix) {
  const n = matrix.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[x][n - 1 - y] = matrix[y][x];
  return out;
}

/** Para cada pieza, sus cuatro giros como listas de casillas [x, y] */
const SHAPES = {};
for (const type of TYPES) {
  SHAPES[type] = [];
  let m = BASE[type];
  for (let r = 0; r < 4; r++) {
    const cells = [];
    m.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y])));
    SHAPES[type].push(cells);
    m = turn(m);
  }
}

export const cellsOf = (type, rot) => SHAPES[type][rot];

export const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

/** ¿La pieza choca con las paredes, el suelo o lo ya colocado? (por encima del tablero no) */
export function collides(grid, type, rot, x, y) {
  for (const [cx, cy] of SHAPES[type][rot]) {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
    if (gy >= 0 && grid[gy][gx]) return true;
  }
  return false;
}

const LINE_POINTS = [0, 100, 300, 500, 800];

export class Tetris {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.grid = emptyGrid();
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.over = false;
    this.pieces = 0; // piezas que han salido, para saber si la actual ha cambiado
    this.next = this._draw();
    this._spawn();
  }

  /** Las piezas salen de una bolsa con las siete, barajadas, para que no se repitan demasiado */
  _draw() {
    if (!this.bag.length) {
      this.bag = TYPES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  _spawn() {
    const type = this.next;
    this.next = this._draw();
    this.pieces += 1;
    this.piece = { type, rot: 0, x: type === 'O' ? 4 : 3, y: type === 'I' ? -1 : 0 };
    if (collides(this.grid, type, 0, this.piece.x, this.piece.y)) this.over = true;
  }

  /** Milisegundos entre cada caída de una fila, según el nivel */
  get tickMs() {
    return Math.max(100, 800 - (this.level - 1) * 70);
  }

  move(dx) {
    const p = this.piece;
    if (this.over || collides(this.grid, p.type, p.rot, p.x + dx, p.y)) return false;
    p.x += dx;
    return true;
  }

  /** Gira la pieza, probando a empujarla un poco si choca con una pared */
  rotate(dir = 1) {
    const p = this.piece;
    if (this.over) return false;
    const rot = (p.rot + dir + 4) % 4;
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(this.grid, p.type, rot, p.x + kick, p.y)) {
        p.rot = rot;
        p.x += kick;
        return true;
      }
    }
    return false;
  }

  /** Baja una fila. Si no puede, la pieza se queda donde está y sale la siguiente. */
  down() {
    const p = this.piece;
    if (this.over) return 'locked';
    if (!collides(this.grid, p.type, p.rot, p.x, p.y + 1)) {
      p.y += 1;
      return 'moved';
    }
    this._lock();
    return 'locked';
  }

  /** Fila a la que llegaría la pieza si se dejara caer */
  get ghostY() {
    const p = this.piece;
    let y = p.y;
    while (!collides(this.grid, p.type, p.rot, p.x, y + 1)) y += 1;
    return y;
  }

  hardDrop() {
    if (this.over) return;
    const rows = this.ghostY - this.piece.y;
    this.piece.y = this.ghostY;
    this.score += rows * 2;
    this._lock();
  }

  _lock() {
    const p = this.piece;
    for (const [cx, cy] of SHAPES[p.type][p.rot]) {
      const gy = p.y + cy;
      if (gy < 0) {
        this.over = true;
        return;
      }
      this.grid[gy][p.x + cx] = p.type;
    }
    const kept = this.grid.filter((row) => row.some((c) => !c));
    const cleared = ROWS - kept.length;
    if (cleared) {
      this.grid = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept];
      this.score += LINE_POINTS[cleared] * this.level;
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / 10);
    }
    this._spawn();
  }
}
