// Jugadores automáticos del juego de memoria. Se diferencian en cuántas cartas recuerdan:
// Random ninguna, Algorithm las últimas 2 que ha visto y Smart todas.
// `seen` es el historial de cartas que se han ido girando: [{ index, symbol }].

const MEMORY = { Random: 0, Algorithm: 2, Smart: Infinity };
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Cartas boca abajo que se recuerdan: índice -> símbolo (las más recientes primero) */
function remembered(game, seen, capacity) {
  const known = new Map();
  for (let k = seen.length - 1; k >= 0 && known.size < capacity; k--) {
    const { index, symbol } = seen[k];
    if (game.cards[index].state === 'down' && !known.has(index)) known.set(index, symbol);
  }
  return known;
}

/** Devuelve la carta que hay que girar ahora */
export function choose(mode, game, seen) {
  const down = [];
  game.cards.forEach((c, i) => {
    if (c.state === 'down') down.push(i);
  });
  const known = remembered(game, seen, MEMORY[mode]);
  const unknown = down.filter((i) => !known.has(i));

  // Segunda carta: si se recuerda su pareja, esa; si no, una que no se haya visto
  if (game.flipped.length === 1) {
    const first = game.flipped[0];
    const symbol = game.cards[first].symbol;
    for (const [i, s] of known) if (s === symbol && i !== first) return i;
    return pick(unknown.length ? unknown : down);
  }

  // Primera carta: si se recuerda alguna pareja completa, una de ellas; si no, una sin ver
  const bySymbol = new Map();
  for (const [i, s] of known) {
    if (bySymbol.has(s)) return bySymbol.get(s);
    bySymbol.set(s, i);
  }
  return pick(unknown.length ? unknown : down);
}

export const MODES = Object.keys(MEMORY);
