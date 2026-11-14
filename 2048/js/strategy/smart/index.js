// Smart AI strategy: heuristic search with limited lookahead.
//
// Ported from the "Smart" mode of aj-r/2048-AI (js/smart_ai.js): for every
// legal direction, it simulates the plausible tile spawns a few moves ahead
// and scores each resulting board with a heuristic (row/column monotonicity
// plus the number of empty cells). Assuming the worst-case spawn at each
// step, it picks the move that loses the least "quality" relative to the
// current board.
//
// Unlike Random/Algorithm, this strategy actually evaluates board states
// before deciding, making it the first genuinely AI-driven mode here (a
// simplified expectimax with a hand-tuned evaluation function, rather than a
// scripted rule).

import { Board, Direction } from "../../board.js";

const LOOKAHEAD_DEPTH = 3;
const EMPTY_CELL_WEIGHT = 8;

export const description =
  "For every legal direction, it simulates the possible spawn cells for the next tile up to 3 moves ahead, and scores each resulting board by row/column monotonicity and the number of empty cells. Assuming the worst case at every step, it picks the move that loses the least score. This is the first strategy that actually reasons about the board before deciding.";

export function chooseMove(board) {
  const originalQuality = gridQuality(board.grid, board.size);
  const results = planAhead(board, LOOKAHEAD_DEPTH, originalQuality);
  const best = chooseBest(results);
  return best ? best.direction : null;
}

/** Tries every direction and returns, for each legal one, the worst-case
 * quality loss assuming the tile spawns in the least favorable plausible cell. */
function planAhead(board, numMoves, originalQuality) {
  const results = [];
  for (const direction of Object.values(Direction)) {
    const { changed, newGrid } = board.simulateFullMove(direction);
    if (!changed) continue;

    const candidates = spawnCandidates(newGrid, board.size);
    const result = { quality: null, probability: 1, qualityLoss: 0, direction };

    if (candidates.length === 0) {
      result.quality = gridQuality(newGrid, board.size);
      result.qualityLoss = Math.max(originalQuality - result.quality, 0);
      results.push(result);
      continue;
    }

    for (const [r, c] of candidates) {
      const spawnedGrid = newGrid.map((row) => row.slice());
      spawnedGrid[r][c] = 2;

      let tileResult;
      if (numMoves > 1) {
        const subBoard = Board.fromGrid(spawnedGrid, board.size, board.score);
        const subResults = planAhead(subBoard, numMoves - 1, originalQuality);
        tileResult = chooseBest(subResults) ?? {
          quality: gridQuality(spawnedGrid, board.size),
          probability: 1,
          qualityLoss: 0,
        };
      } else {
        const tileQuality = gridQuality(spawnedGrid, board.size);
        tileResult = {
          quality: tileQuality,
          probability: 1,
          qualityLoss: Math.max(originalQuality - tileQuality, 0),
        };
      }

      if (result.quality === null || tileResult.quality < result.quality) {
        result.quality = tileResult.quality;
        result.probability = tileResult.probability / candidates.length;
      } else if (tileResult.quality === result.quality) {
        result.probability += tileResult.probability / candidates.length;
      }
      result.qualityLoss += tileResult.qualityLoss / candidates.length;
    }

    results.push(result);
  }
  return results;
}

/** Prefers the least quality loss; ties broken by best quality, then lowest probability. */
function chooseBest(results) {
  let best = null;
  for (const result of results) {
    if (!best || isBetter(result, best)) best = result;
  }
  return best;
}

function isBetter(candidate, best) {
  if (candidate.qualityLoss !== best.qualityLoss) return candidate.qualityLoss < best.qualityLoss;
  if (candidate.quality !== best.quality) return candidate.quality > best.quality;
  return candidate.probability < best.probability;
}

/** Empty cells adjacent to an existing tile: the plausible worst-case spawn points. */
function spawnCandidates(grid, size) {
  const candidates = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      if (hasAdjacentTile(grid, size, r, c)) candidates.push([r, c]);
    }
  }
  return candidates;
}

function hasAdjacentTile(grid, size, r, c) {
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  return deltas.some(([dr, dc]) => {
    const rr = r + dr;
    const cc = c + dc;
    return rr >= 0 && rr < size && cc >= 0 && cc < size && grid[rr][cc] !== 0;
  });
}

/** Row/column monotonicity (whichever direction scores higher) plus an empty-cell bonus. */
function gridQuality(grid, size) {
  let monoScore = 0;
  for (let c = 0; c < size; c++) {
    const column = [];
    for (let r = 0; r < size; r++) column.push(grid[r][c]);
    monoScore += lineMonotonicity(column);
  }
  for (let r = 0; r < size; r++) monoScore += lineMonotonicity(grid[r]);

  let emptyCells = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) emptyCells++;
    }
  }

  return monoScore + emptyCells * EMPTY_CELL_WEIGHT;
}

function lineMonotonicity(line) {
  let incScore = 0;
  let decScore = 0;
  let prevValue = -1;
  for (const value of line) {
    incScore += value;
    if (value <= prevValue || prevValue === -1) {
      decScore += value;
      if (value < prevValue) incScore -= prevValue;
    }
    prevValue = value;
  }
  return Math.max(incScore, decScore);
}
