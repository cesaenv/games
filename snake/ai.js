// Jugadores automáticos del Snake. Cada uno recibe la partida y devuelve una dirección.

import { DIRS } from './game.js';

const key = (c, size) => c.y * size + c.x;

function safeMoves(game) {
  return [0, 1, 2, 3].filter((d) => !game.isReverse(d) && !game.willDie(d));
}

/** Random: una de las direcciones en las que no choca al momento, al azar */
export function random(game) {
  const safe = safeMoves(game);
  const pool = safe.length ? safe : [game.dir];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Casillas a las que se puede llegar desde una casilla sin cruzar el cuerpo */
function reachable(game, start) {
  const { size } = game;
  const blocked = new Set(game.body.slice(0, -1).map((c) => key(c, size)));
  const seen = new Set([key(start, size)]);
  const queue = [start];
  while (queue.length) {
    const c = queue.pop();
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) continue;
      const k = key(n, size);
      if (seen.has(k) || blocked.has(k)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen.size;
}

/** Algorithm: camino más corto a la comida; si no hay, la salida con más espacio */
export function algorithm(game) {
  const { size } = game;
  const head = game.body[0];
  const blocked = new Set(game.body.slice(0, -1).map((c) => key(c, size)));
  const first = new Map(); // casilla -> primera dirección del camino hasta ella
  const queue = [];
  for (let d = 0; d < 4; d++) {
    if (game.isReverse(d) || game.willDie(d)) continue;
    const n = game.next(d);
    first.set(key(n, size), d);
    queue.push(n);
  }
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    const dir = first.get(key(c, size));
    if (game.isFood(c)) return dir;
    for (const v of DIRS) {
      const n = { x: c.x + v.x, y: c.y + v.y };
      if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) continue;
      const k = key(n, size);
      if (first.has(k) || blocked.has(k) || (n.x === head.x && n.y === head.y)) continue;
      first.set(k, dir);
      queue.push(n);
    }
  }
  // Sin camino a la comida: la salida desde la que se llega a más casillas
  let best = game.dir;
  let bestArea = -1;
  for (const d of safeMoves(game)) {
    const area = reachable(game, game.next(d));
    if (area > bestArea) {
      bestArea = area;
      best = d;
    }
  }
  return best;
}

// Smart: un recorrido que pasa por todas las casillas formando un ciclo (hace falta un
// lado par). Seguirlo siempre nunca choca; se salta trozos cuando sobra hueco hasta la cola.
const cycles = new Map();

function cycleIndex(size) {
  if (cycles.has(size)) return cycles.get(size);
  const order = [];
  for (let x = 0; x < size; x++) order.push([x, 0]);
  for (let y = 1; y < size; y++) {
    if (y % 2 === 1) for (let x = size - 1; x >= 1; x--) order.push([x, y]);
    else for (let x = 1; x < size; x++) order.push([x, y]);
  }
  for (let y = size - 1; y >= 1; y--) order.push([0, y]);
  const index = new Array(size * size);
  order.forEach(([x, y], i) => {
    index[y * size + x] = i;
  });
  cycles.set(size, index);
  return index;
}

export function smart(game) {
  const { size } = game;
  const total = size * size;
  const index = cycleIndex(size);
  const at = (c) => index[key(c, size)];
  const head = game.body[0];
  const tail = game.body[game.body.length - 1];
  const hi = at(head);
  const toTail = (at(tail) - hi + total) % total;
  const toFood = game.food ? (at(game.food) - hi + total) % total : 1;
  // Cuando la serpiente ocupa casi todo el tablero no se arriesga: solo sigue el ciclo
  const maxJump = game.body.length > total * 0.6 ? 1 : Math.max(1, Math.min(toFood, toTail - 2));

  let best = null;
  let bestLeft = Infinity;
  for (let d = 0; d < 4; d++) {
    if (game.isReverse(d) || game.willDie(d)) continue;
    const n = game.next(d);
    const jump = (at(n) - hi + total) % total;
    if (jump < 1 || jump > maxJump) continue;
    const left = game.food ? (at(game.food) - at(n) + total) % total : 0;
    if (left < bestLeft) {
      bestLeft = left;
      best = d;
    }
  }
  if (best !== null) return best;
  // Por si acaso: la casilla siguiente del ciclo
  for (let d = 0; d < 4; d++) {
    const n = game.next(d);
    if (n.x >= 0 && n.y >= 0 && n.x < size && n.y < size && (at(n) - hi + total) % total === 1) return d;
  }
  return game.dir;
}

export const STRATEGIES = { Random: random, Algorithm: algorithm, Smart: smart };
