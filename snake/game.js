// Lógica del Snake, sin nada de pantalla. La serpiente se guarda con la cabeza primero.

export const SIZE = 20;
// Direcciones: 0 arriba, 1 derecha, 2 abajo, 3 izquierda
export const DIRS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export class Snake {
  constructor(size = SIZE, rng = Math.random) {
    this.size = size;
    this.rng = rng;
    this.reset();
  }

  reset() {
    const mid = Math.floor(this.size / 2);
    this.body = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    this.dir = 1;
    this.score = 0;
    this.over = false;
    this.won = false;
    this._placeFood();
  }

  _placeFood() {
    const taken = new Set(this.body.map((c) => c.y * this.size + c.x));
    const free = [];
    for (let i = 0; i < this.size * this.size; i++) if (!taken.has(i)) free.push(i);
    if (free.length === 0) {
      this.food = null;
      this.won = true;
      this.over = true;
      return;
    }
    const i = free[Math.floor(this.rng() * free.length)];
    this.food = { x: i % this.size, y: Math.floor(i / this.size) };
  }

  isReverse(dir) {
    return (dir + 2) % 4 === this.dir;
  }

  /** Casilla a la que iría la cabeza con esa dirección */
  next(dir) {
    const head = this.body[0];
    return { x: head.x + DIRS[dir].x, y: head.y + DIRS[dir].y };
  }

  isFood(cell) {
    return !!this.food && cell.x === this.food.x && cell.y === this.food.y;
  }

  /** ¿Chocaría con la pared o con ella misma? (la cola se aparta salvo que coma) */
  willDie(dir) {
    const n = this.next(dir);
    if (n.x < 0 || n.y < 0 || n.x >= this.size || n.y >= this.size) return true;
    const eating = this.isFood(n);
    const limit = eating ? this.body.length : this.body.length - 1;
    for (let i = 0; i < limit; i++) {
      if (this.body[i].x === n.x && this.body[i].y === n.y) return true;
    }
    return false;
  }

  /** Avanza una casilla. Una dirección contraria a la actual se ignora. */
  step(dir) {
    if (this.over) return;
    if (dir === undefined || this.isReverse(dir)) dir = this.dir;
    this.dir = dir;
    if (this.willDie(dir)) {
      this.over = true;
      return;
    }
    const n = this.next(dir);
    const eating = this.isFood(n);
    this.body.unshift(n);
    if (eating) {
      this.score += 1;
      this._placeFood();
    } else {
      this.body.pop();
    }
  }
}
