// Algorithm AI strategy: rigid up/left alternation with a fixed fallback order.
//
// Mirrors the "Algorithm" mode from aj-r/2048-AI (js/basic_ai.js): it repeats
// the manual "swipe up, swipe left, swipe up, swipe left..." pattern many
// players use by hand, falling back to a fixed priority order (up, left,
// right, down) whenever the preferred move isn't legal. It does not evaluate
// the board at all beyond checking move legality, so it is a scripted policy
// rather than a search- or heuristic-based AI.

import { Direction } from "../../board.js";

const FALLBACK_PRIORITY = [Direction.UP, Direction.LEFT, Direction.RIGHT, Direction.DOWN];

export const description =
  "Repeats the manual “up, left, up, left...” pattern many players use by hand. If the preferred move isn't legal, it falls back to a fixed priority order (up, left, right, down). Not real AI: it never evaluates the board, it just follows a script.";

// Module-level state: remembers the previous move to keep alternating up/left.
let prevMove = null;

export function chooseMove(board) {
  let move = prevMove === Direction.UP ? Direction.LEFT : Direction.UP;
  if (!board.simulateMove(move)) {
    move = FALLBACK_PRIORITY.find((d) => board.simulateMove(d)) ?? null;
  }
  prevMove = move;
  return move;
}
