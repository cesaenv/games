// Lógica del tres en raya, sin nada de pantalla. El tablero son 9 casillas: 'X', 'O' o null.

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** Devuelve { player, line } si alguien ha completado una línea */
export function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { player: board[a], line };
  }
  return null;
}

export function emptyCells(board) {
  const out = [];
  board.forEach((v, i) => {
    if (!v) out.push(i);
  });
  return out;
}

export class TicTacToe {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array(9).fill(null);
    this.turn = 'X';
    this.result = null; // null mientras se juega, luego 'X', 'O' o 'draw'
    this.line = null;
  }

  get over() {
    return this.result !== null;
  }

  /** Juega el turno actual en una casilla. Devuelve false si no se puede. */
  play(i) {
    if (this.over || this.board[i]) return false;
    this.board[i] = this.turn;
    const win = winnerOf(this.board);
    if (win) {
      this.result = win.player;
      this.line = win.line;
    } else if (emptyCells(this.board).length === 0) {
      this.result = 'draw';
    } else {
      this.turn = this.turn === 'X' ? 'O' : 'X';
    }
    return true;
  }
}
