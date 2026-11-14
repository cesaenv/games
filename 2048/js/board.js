// Pure game logic for 2048 (no DOM dependencies). Mirrors src/game2048/board.py.

export const Direction = Object.freeze({
  LEFT: "left",
  RIGHT: "right",
  UP: "up",
  DOWN: "down",
});

export class Board {
  constructor(size = 4) {
    this.size = size;
    this.grid = Array.from({ length: size }, () => Array(size).fill(0));
    this.score = 0;
    this.won = false;
    this.spawnRandomTile();
    this.spawnRandomTile();
  }

  /** Builds a Board wrapping an existing grid, without spawning tiles. Used by AI lookahead. */
  static fromGrid(grid, size, score) {
    const board = Object.create(Board.prototype);
    board.size = size;
    board.grid = grid.map((row) => row.slice());
    board.score = score;
    board.won = false;
    return board;
  }

  /** Places a new tile (2 with 90% chance, 4 with 10% chance) on an empty cell. */
  spawnRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return false;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  /** Slides and merges a single line to the left. Returns [newLine, moves, gained]. */
  static _processLine(line) {
    const positions = [];
    const values = [];
    line.forEach((v, i) => {
      if (v !== 0) {
        positions.push(i);
        values.push(v);
      }
    });
    const result = new Array(line.length).fill(0);
    const moves = [];
    let gained = 0;
    let writeIndex = 0;
    let i = 0;
    while (i < values.length) {
      if (i + 1 < values.length && values[i] === values[i + 1]) {
        const mergedValue = values[i] * 2;
        moves.push({ from: positions[i], to: writeIndex, value: values[i], merged: true });
        moves.push({ from: positions[i + 1], to: writeIndex, value: values[i + 1], merged: true });
        result[writeIndex] = mergedValue;
        gained += mergedValue;
        i += 2;
      } else {
        moves.push({ from: positions[i], to: writeIndex, value: values[i], merged: false });
        result[writeIndex] = values[i];
        i += 1;
      }
      writeIndex += 1;
    }
    return [result, moves, gained];
  }

  /**
   * Computes the result of sliding `grid` in `direction`, without mutating it.
   * Returns { newGrid, moves, gained, changed }.
   */
  static _computeMove(grid, size, direction) {
    const moves = [];
    let totalGained = 0;
    const newGrid = Array.from({ length: size }, () => Array(size).fill(0));

    if (direction === Direction.LEFT || direction === Direction.RIGHT) {
      for (let r = 0; r < size; r++) {
        let line = grid[r].slice();
        if (direction === Direction.RIGHT) line.reverse();
        const [newLine, lineMoves, gained] = Board._processLine(line);
        totalGained += gained;
        for (const m of lineMoves) {
          const fromC = direction === Direction.LEFT ? m.from : size - 1 - m.from;
          const toC = direction === Direction.LEFT ? m.to : size - 1 - m.to;
          moves.push({ from: [r, fromC], to: [r, toC], value: m.value, merged: m.merged });
        }
        if (direction === Direction.RIGHT) newLine.reverse();
        newGrid[r] = newLine;
      }
    } else {
      for (let c = 0; c < size; c++) {
        let col = [];
        for (let r = 0; r < size; r++) col.push(grid[r][c]);
        if (direction === Direction.DOWN) col.reverse();
        const [newCol, lineMoves, gained] = Board._processLine(col);
        totalGained += gained;
        for (const m of lineMoves) {
          const fromR = direction === Direction.UP ? m.from : size - 1 - m.from;
          const toR = direction === Direction.UP ? m.to : size - 1 - m.to;
          moves.push({ from: [fromR, c], to: [toR, c], value: m.value, merged: m.merged });
        }
        if (direction === Direction.DOWN) newCol.reverse();
        for (let r = 0; r < size; r++) newGrid[r][c] = newCol[r];
      }
    }

    const changed = JSON.stringify(newGrid) !== JSON.stringify(grid);
    return { newGrid, moves, gained: totalGained, changed };
  }

  /**
   * Executes a move and reports how each tile travelled, for animation.
   * Returns { changed, moves, newTilePos }, where each move is
   * { from: [row, col], to: [row, col], value, merged }.
   */
  moveWithAnimation(direction) {
    const { newGrid, moves, gained, changed } = Board._computeMove(this.grid, this.size, direction);

    let newTilePos = null;
    if (changed) {
      this.grid = newGrid;
      this.score += gained;
      if (this.grid.some((row) => row.includes(2048))) this.won = true;
      const beforeSpawn = this.grid.map((row) => row.slice());
      this.spawnRandomTile();
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (beforeSpawn[r][c] === 0 && this.grid[r][c] !== 0) newTilePos = [r, c];
        }
      }
    }
    return { changed, moves, newTilePos };
  }

  /** Executes a move. Returns true if the board changed. */
  move(direction) {
    return this.moveWithAnimation(direction).changed;
  }

  /** Checks whether a move in `direction` would change the board, without mutating it. */
  simulateMove(direction) {
    return this.simulateFullMove(direction).changed;
  }

  /**
   * Computes the full result of `direction` without mutating this board or spawning a tile.
   * Returns { changed, newGrid, gained }. Used by AI strategies that need to look ahead.
   */
  simulateFullMove(direction) {
    const { newGrid, gained, changed } = Board._computeMove(this.grid, this.size, direction);
    return { changed, newGrid, gained };
  }

  /** Checks whether any move is still possible (empty cell or adjacent merge). */
  canMove() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return true;
        if (c + 1 < this.size && this.grid[r][c] === this.grid[r][c + 1]) return true;
        if (r + 1 < this.size && this.grid[r][c] === this.grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  isGameOver() {
    return !this.canMove();
  }

  reset() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.score = 0;
    this.won = false;
    this.spawnRandomTile();
    this.spawnRandomTile();
  }
}
