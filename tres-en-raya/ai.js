// Jugadores automáticos del tres en raya. Cada uno recibe la partida y devuelve una casilla.
// Juegan por el jugador al que le toca (game.turn).

import { emptyCells, winnerOf } from './game.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const other = (p) => (p === 'X' ? 'O' : 'X');

/** Random: una casilla libre cualquiera */
export function random(game) {
  return pick(emptyCells(game.board));
}

/** Casilla con la que `player` completaría una línea, si la hay */
function completing(board, player) {
  for (const i of emptyCells(board)) {
    const test = board.slice();
    test[i] = player;
    if (winnerOf(test)) return i;
  }
  return null;
}

/** Algorithm: gana si puede, si no bloquea, y si no centro, esquina o lado */
export function algorithm(game) {
  const me = game.turn;
  const win = completing(game.board, me);
  if (win !== null) return win;
  const block = completing(game.board, other(me));
  if (block !== null) return block;
  const free = emptyCells(game.board);
  if (free.includes(4)) return 4;
  const corners = [0, 2, 6, 8].filter((i) => free.includes(i));
  if (corners.length) return pick(corners);
  return pick(free);
}

/** Valor de la partida para `me`: gana +, pierde -, y cuanto antes se gane mejor */
function minimax(board, turn, me, depth, alpha, beta) {
  const win = winnerOf(board);
  if (win) return win.player === me ? 10 - depth : depth - 10;
  const free = emptyCells(board);
  if (!free.length) return 0;
  const maximizing = turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const i of free) {
    board[i] = turn;
    const score = minimax(board, other(turn), me, depth + 1, alpha, beta);
    board[i] = null;
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/** Smart: minimax, mira todas las partidas posibles y nunca pierde */
export function smart(game) {
  const me = game.turn;
  const board = game.board.slice();
  let best = -Infinity;
  let moves = [];
  for (const i of emptyCells(board)) {
    board[i] = me;
    const score = minimax(board, other(me), me, 1, -Infinity, Infinity);
    board[i] = null;
    if (score > best) {
      best = score;
      moves = [i];
    } else if (score === best) {
      moves.push(i);
    }
  }
  // Entre las igual de buenas, primero el centro, luego las esquinas y al final los lados
  for (const tier of [[4], [0, 2, 6, 8], [1, 3, 5, 7]]) {
    const choice = moves.filter((i) => tier.includes(i));
    if (choice.length) return pick(choice);
  }
  return pick(moves);
}

export const STRATEGIES = { Random: random, Algorithm: algorithm, Smart: smart };
