// Jugadores automáticos del Buscaminas. Cada uno mira solo lo que ve un jugador
// (casillas destapadas, números y banderas) y devuelve UNA acción: { type, index }.

const reveal = (index) => ({ type: 'reveal', index });
const flag = (index) => ({ type: 'flag', index });
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Casillas que no están ni destapadas ni marcadas */
function unknown(game) {
  const out = [];
  game.cells.forEach((c, i) => {
    if (!c.revealed && !c.flagged) out.push(i);
  });
  return out;
}

/** Para un número destapado: sus vecinas sin destapar ni marcar y cuántas minas le faltan */
function look(game, i) {
  const hidden = [];
  let flagged = 0;
  for (const j of game.neighbors(i)) {
    const c = game.cells[j];
    if (c.flagged) flagged += 1;
    else if (!c.revealed) hidden.push(j);
  }
  return { hidden, left: game.cells[i].n - flagged };
}

/** Random: destapa una casilla cualquiera de las que quedan */
export function random(game) {
  return reveal(pick(unknown(game)));
}

/** Regla básica: si a un número le faltan tantas minas como casillas tiene, todas son minas;
 * si ya no le falta ninguna, el resto son seguras. */
function basic(game) {
  for (let i = 0; i < game.size; i++) {
    if (!game.cells[i].revealed || game.cells[i].n === 0) continue;
    const { hidden, left } = look(game, i);
    if (!hidden.length) continue;
    if (left === hidden.length) return flag(hidden[0]);
    if (left === 0) return reveal(hidden[0]);
  }
  return null;
}

function firstMove(game) {
  const mid = Math.floor(game.rows / 2) * game.cols + Math.floor(game.cols / 2);
  return reveal(mid);
}

/** Algorithm: la regla básica y, si no hay nada seguro, adivina */
export function algorithm(game) {
  if (game.state === 'ready') return firstMove(game);
  return basic(game) ?? reveal(pick(unknown(game)));
}

// ---------------------------------------------------------------- Smart

/** Si las casillas de un número están dentro de las de otro, la diferencia se puede deducir */
function subsets(game) {
  const numbers = [];
  game.cells.forEach((c, i) => {
    if (!c.revealed || c.n === 0) return;
    const { hidden, left } = look(game, i);
    if (hidden.length) numbers.push({ i, hidden, left });
  });
  for (const a of numbers) {
    for (const b of numbers) {
      if (a === b || a.hidden.length >= b.hidden.length) continue;
      if (!a.hidden.every((j) => b.hidden.includes(j))) continue;
      const rest = b.hidden.filter((j) => !a.hidden.includes(j));
      const mines = b.left - a.left;
      if (mines === 0) return reveal(rest[0]);
      if (mines === rest.length) return flag(rest[0]);
    }
  }
  return null;
}

const NODE_LIMIT = 200000;
const MAX_GROUP = 30;

/**
 * Prueba todas las formas posibles de colocar las minas en un grupo de casillas que comparten
 * números. Devuelve, para cada casilla, en qué fracción de las formas hay mina.
 */
function chances(cells, rules) {
  const where = new Map(cells.map((c, k) => [c, k]));
  const ruleOf = cells.map(() => []);
  const parts = rules.map((r, k) => {
    r.cells.forEach((c) => ruleOf[where.get(c)].push(k));
    return { need: r.need, cells: r.cells.map((c) => where.get(c)), set: 0, free: r.cells.length };
  });
  const value = new Array(cells.length).fill(-1);
  const count = new Array(cells.length).fill(0);
  let total = 0;
  let nodes = 0;

  function go(k) {
    if (++nodes > NODE_LIMIT) return false;
    if (k === cells.length) {
      total += 1;
      value.forEach((v, c) => {
        if (v === 1) count[c] += 1;
      });
      return true;
    }
    for (const v of [0, 1]) {
      let ok = true;
      for (const r of ruleOf[k]) {
        const p = parts[r];
        p.free -= 1;
        p.set += v;
      }
      for (const r of ruleOf[k]) {
        const p = parts[r];
        if (p.set > p.need || p.set + p.free < p.need) ok = false;
      }
      value[k] = v;
      if (ok && !go(k + 1)) return false;
      value[k] = -1;
      for (const r of ruleOf[k]) {
        const p = parts[r];
        p.free += 1;
        p.set -= v;
      }
    }
    return true;
  }

  if (!go(0) || total === 0) return null;
  return count.map((n) => n / total);
}

/** Smart: reglas, deducción entre números y, si hace falta, la casilla con menos riesgo */
export function smart(game) {
  if (game.state === 'ready') return firstMove(game);
  const easy = basic(game) ?? subsets(game);
  if (easy) return easy;

  // Casillas del borde y qué exige cada número
  const rules = [];
  const edge = new Set();
  game.cells.forEach((c, i) => {
    if (!c.revealed || c.n === 0) return;
    const { hidden, left } = look(game, i);
    if (!hidden.length) return;
    rules.push({ cells: hidden, need: left });
    hidden.forEach((j) => edge.add(j));
  });

  // Grupos de casillas unidas por algún número
  const groups = [];
  const seen = new Set();
  for (const start of edge) {
    if (seen.has(start)) continue;
    const cells = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const c = queue.pop();
      cells.push(c);
      for (const r of rules) {
        if (!r.cells.includes(c)) continue;
        for (const o of r.cells) {
          if (!seen.has(o)) {
            seen.add(o);
            queue.push(o);
          }
        }
      }
    }
    groups.push({ cells, rules: rules.filter((r) => r.cells.some((c) => cells.includes(c))) });
  }

  const risk = new Map();
  let expected = 0;
  for (const g of groups) {
    if (g.cells.length > MAX_GROUP) continue;
    const p = chances(g.cells, g.rules);
    if (!p) continue;
    g.cells.forEach((c, k) => {
      risk.set(c, p[k]);
      expected += p[k];
    });
  }

  for (const [c, p] of risk) if (p === 0) return reveal(c);
  for (const [c, p] of risk) if (p === 1) return flag(c);

  // Sin nada seguro: adivina con el menor riesgo, mirando también las casillas lejos del borde
  const others = unknown(game).filter((i) => !edge.has(i));
  const minesLeft = game.mines - game.flags;
  const density = others.length ? Math.max(0, minesLeft - expected) / others.length : 1;
  let best = null;
  let bestRisk = Infinity;
  for (const [c, p] of risk) {
    if (p < bestRisk || (p === bestRisk && Math.random() < 0.5)) {
      bestRisk = p;
      best = c;
    }
  }
  if (best !== null && bestRisk <= density) return reveal(best);
  if (others.length) return reveal(pick(others));
  return reveal(best ?? pick(unknown(game)));
}

export const STRATEGIES = { Random: random, Algorithm: algorithm, Smart: smart };
