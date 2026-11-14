// Registry of AI strategies available to play the game automatically.

import { chooseMove as algorithmMove, description as algorithmDescription } from "./algorithm/index.js";
import { chooseMove as randomMove, description as randomDescription } from "./random/index.js";
import { chooseMove as smartMove, description as smartDescription } from "./smart/index.js";

export const STRATEGIES = {
  Random: randomMove,
  Algorithm: algorithmMove,
  Smart: smartMove,
};

export const STRATEGY_DESCRIPTIONS = {
  Random: randomDescription,
  Algorithm: algorithmDescription,
  Smart: smartDescription,
};
