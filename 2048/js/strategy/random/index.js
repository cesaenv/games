// Picks a uniformly random move among the currently valid ones. Not AI-driven:
// it never looks at the board beyond checking which moves are legal.

import { Direction } from "../../board.js";

export const description =
  "Picks a random valid direction on every turn. It never evaluates the board, so it serves as a baseline against the strategies that actually reason about the game state.";

export function chooseMove(board) {
  const validMoves = Object.values(Direction).filter((d) => board.simulateMove(d));
  if (validMoves.length === 0) return null;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}
