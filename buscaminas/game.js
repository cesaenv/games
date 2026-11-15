// Lógica del Buscaminas, sin nada de pantalla.
// Las minas se colocan en la primera casilla que se destapa, para que nunca sea una mina.

export const COLS = 16;
export const ROWS = 16;
export const MINES = 40;

export class Minesweeper {
  constructor(cols = COLS, rows = ROWS, mines = MINES, rng = Math.random) {
    this.cols = cols;
    this.rows = rows;
    this.mines = mines;
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.cells = Array.from({ length: this.cols * this.rows }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      n: 0, // minas alrededor
    }));
    this.state = 'ready'; // ready, playing, won, lost
    this.placed = false;
    this.opened = 0;
    this.flags = 0;
    this.boom = -1; // casilla de la mina que explotó
  }

  get size() {
    return this.cols * this.rows;
  }

  get over() {
    return this.state === 'won' || this.state === 'lost';
  }

  neighbors(i) {
    const x = i % this.cols;
    const y = Math.floor(i / this.cols);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows) out.push(ny * this.cols + nx);
      }
    }
    return out;
  }

  _place(safe) {
    const banned = new Set([safe, ...this.neighbors(safe)]);
    const free = [];
    for (let i = 0; i < this.size; i++) if (!banned.has(i)) free.push(i);
    for (let k = 0; k < this.mines; k++) {
      const j = k + Math.floor(this.rng() * (free.length - k));
      [free[k], free[j]] = [free[j], free[k]];
      this.cells[free[k]].mine = true;
    }
    this.cells.forEach((c, i) => {
      c.n = this.neighbors(i).filter((j) => this.cells[j].mine).length;
    });
    this.placed = true;
  }

  /** Destapa una casilla. Devuelve las casillas que han cambiado. */
  reveal(i) {
    const cell = this.cells[i];
    if (this.over || cell.flagged || cell.revealed) return [];
    if (!this.placed) this._place(i);
    this.state = 'playing';

    if (cell.mine) {
      cell.revealed = true;
      this.boom = i;
      this.state = 'lost';
      return [i];
    }

    const changed = [];
    const stack = [i];
    while (stack.length) {
      const k = stack.pop();
      const c = this.cells[k];
      if (c.revealed || c.flagged) continue;
      c.revealed = true;
      this.opened += 1;
      changed.push(k);
      if (c.n === 0) stack.push(...this.neighbors(k));
    }
    if (this.opened === this.size - this.mines) this._win(changed);
    return changed;
  }

  _win(changed) {
    this.state = 'won';
    this.cells.forEach((c, i) => {
      if (c.mine && !c.flagged) {
        c.flagged = true;
        this.flags += 1;
        changed.push(i);
      }
    });
  }

  toggleFlag(i) {
    const cell = this.cells[i];
    if (this.over || cell.revealed) return [];
    cell.flagged = !cell.flagged;
    this.flags += cell.flagged ? 1 : -1;
    return [i];
  }

  /** Sobre un número ya destapado con tantas banderas como minas: destapa el resto de vecinas */
  chord(i) {
    const cell = this.cells[i];
    if (this.over || !cell.revealed || cell.n === 0) return [];
    const around = this.neighbors(i);
    if (around.filter((j) => this.cells[j].flagged).length !== cell.n) return [];
    const changed = [];
    for (const j of around) changed.push(...this.reveal(j));
    return changed;
  }
}
