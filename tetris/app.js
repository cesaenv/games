// Une la lógica del Tetris con la pantalla: dibujo, teclado, botones táctiles y el jugador automático.

import { Tetris, COLS, ROWS, cellsOf } from './game.js';
import { STRATEGIES } from './ai.js';
import { createAutoPanel } from '../shared/autoplay.js';

const SPEEDS = { Slow: 70, Fast: 30, Full: 8 };
const BEST_KEY = 'tetris.best';

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'rotate',
  x: 'rotate',
  z: 'rotateBack',
  ' ': 'drop',
  p: 'pause',
};

class TetrisApp {
  constructor() {
    this.game = new Tetris();
    this.demo = document.documentElement.classList.contains('demo');
    this.state = 'idle'; // idle (sin empezar), running o paused
    this.gravity = null;
    this.plan = null; // dónde va a colocar la IA la pieza actual
    this.planFor = -1;
    this.usedAuto = false; // si la IA ha jugado, la puntuación no cuenta para el récord
    this.best = this._loadBest();

    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.nextCtx = document.getElementById('next').getContext('2d');
    this.statusEl = document.getElementById('status');
    this.overlayEl = document.getElementById('game-over-overlay');
    this.messageEl = document.getElementById('game-over-message');

    this.autoPanel = createAutoPanel(document.getElementById('auto-panel'), {
      modes: Object.keys(STRATEGIES),
      defaultMode: 'Random',
      speeds: SPEEDS,
      defaultSpeed: this.demo ? 'Slow' : 'Fast',
      onStart: () => {
        this._stopGravity();
        if (this.game.over) this._newGame();
        this.state = 'running';
        this.usedAuto = true;
        this.statusEl.textContent = '';
      },
      onStop: () => {
        if (!this.game.over && !this.demo) {
          this.state = 'paused';
          this.statusEl.textContent = 'En pausa. Pulsa una tecla para seguir.';
        }
      },
      step: (mode) => this._autoStep(mode),
    });

    this._refreshColors();
    this._bindEvents();
    this._newGame();
    // Vista previa del menú: juega sola en Random, salvo que se pidan menos animaciones
    if (this.demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.autoPanel.start();
  }

  // ------------------------------------------------------------------ colores

  // Los colores salen del tema de la web; se vuelven a leer si cambia
  _refreshColors() {
    const css = getComputedStyle(document.documentElement);
    const get = (name) => css.getPropertyValue(name).trim();
    this.colors = {
      cell: get('--surface'),
      grid: get('--border'),
      I: get('--piece-i'),
      O: get('--piece-o'),
      T: get('--piece-t'),
      S: get('--piece-s'),
      Z: get('--piece-z'),
      J: get('--piece-j'),
      L: get('--piece-l'),
    };
  }

  // -------------------------------------------------------------------- dibujo

  _block(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  }

  _draw() {
    const { ctx, game, colors } = this;
    const size = this.canvas.width / COLS;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.cell;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = colors.grid;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * size + 0.5, 0);
      ctx.lineTo(x * size + 0.5, this.canvas.height);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * size + 0.5);
      ctx.lineTo(this.canvas.width, y * size + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    game.grid.forEach((row, y) =>
      row.forEach((type, x) => {
        if (type) this._block(ctx, x, y, size, colors[type]);
      }),
    );

    if (game.over) return;
    const p = game.piece;
    // Sombra: dónde caerá la pieza
    const ghost = game.ghostY;
    ctx.globalAlpha = 0.3;
    for (const [cx, cy] of cellsOf(p.type, p.rot)) this._block(ctx, p.x + cx, ghost + cy, size, colors[p.type]);
    ctx.globalAlpha = 1;
    for (const [cx, cy] of cellsOf(p.type, p.rot)) {
      if (p.y + cy >= 0) this._block(ctx, p.x + cx, p.y + cy, size, colors[p.type]);
    }
  }

  _drawNext() {
    const ctx = this.nextCtx;
    const size = 30;
    ctx.clearRect(0, 0, 120, 120);
    const type = this.game.next;
    const cells = cellsOf(type, 0);
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const w = Math.max(...xs) - Math.min(...xs) + 1;
    const h = Math.max(...ys) - Math.min(...ys) + 1;
    const ox = (120 - w * size) / 2 / size - Math.min(...xs);
    const oy = (120 - h * size) / 2 / size - Math.min(...ys);
    for (const [cx, cy] of cells) this._block(ctx, cx + ox, cy + oy, size, this.colors[type]);
  }

  _render() {
    this._draw();
    this._drawNext();
    document.getElementById('score').textContent = String(this.game.score);
    document.getElementById('lines').textContent = String(this.game.lines);
    document.getElementById('level').textContent = String(this.game.level);
  }

  // ------------------------------------------------------------------- partida

  _reset() {
    this.autoPanel.stop();
    this._newGame();
  }

  _newGame() {
    this._stopGravity();
    this.game.reset();
    this.state = 'idle';
    this.plan = null;
    this.planFor = -1;
    this.usedAuto = false;
    this.overlayEl.hidden = true;
    this.statusEl.textContent = this.demo ? '' : 'Pulsa una tecla para empezar.';
    this._render();
  }

  _afterAction() {
    this._render();
    if (this.game.over) this._finish();
  }

  _finish() {
    this._stopGravity();
    this.autoPanel.stop();
    this.state = 'idle';
    const { score, lines } = this.game;
    if (!this.usedAuto && score > this.best) {
      this.best = score;
      this._saveBest();
    }
    if (this.demo) {
      // En la vista previa se deja ver cómo ha acabado y se empieza otra partida
      setTimeout(() => {
        this._reset();
        this.autoPanel.start();
      }, 2000);
      return;
    }
    this.statusEl.textContent = 'Fin de la partida.';
    this.messageEl.innerHTML = '';
    this.messageEl.append('Te has quedado sin sitio.', document.createElement('br'), 'Puntos: ');
    const points = document.createElement('strong');
    points.textContent = String(score);
    this.messageEl.append(points, document.createElement('br'), 'Líneas: ');
    const rows = document.createElement('strong');
    rows.textContent = String(lines);
    this.messageEl.append(rows);
    if (!this.usedAuto) {
      this.messageEl.append(document.createElement('br'), 'Récord: ');
      const best = document.createElement('strong');
      best.textContent = String(this.best);
      this.messageEl.append(best);
    }
    setTimeout(() => {
      if (this.game.over) this.overlayEl.hidden = false;
    }, 400);
  }

  // ------------------------------------------------------------- jugar a mano

  _scheduleGravity() {
    clearTimeout(this.gravity);
    this.gravity = setTimeout(() => {
      if (this.state !== 'running') return;
      this.game.down();
      this._afterAction();
      if (!this.game.over) this._scheduleGravity();
    }, this.game.tickMs);
  }

  _stopGravity() {
    clearTimeout(this.gravity);
    this.gravity = null;
  }

  _act(action) {
    const { game } = this;
    if (this.demo || this.autoPanel.isRunning() || game.over) return;

    if (action === 'pause') {
      if (this.state === 'running') {
        this.state = 'paused';
        this._stopGravity();
        this.statusEl.textContent = 'En pausa. Pulsa P para seguir.';
      } else if (this.state === 'paused') {
        this.state = 'running';
        this.statusEl.textContent = '';
        this._scheduleGravity();
      }
      return;
    }

    // Cualquier otra tecla empieza o reanuda la partida
    if (this.state !== 'running') {
      this.state = 'running';
      this.statusEl.textContent = '';
      this._scheduleGravity();
    }

    if (action === 'left') game.move(-1);
    else if (action === 'right') game.move(1);
    else if (action === 'rotate') game.rotate(1);
    else if (action === 'rotateBack') game.rotate(-1);
    else if (action === 'down') {
      if (game.down() === 'moved') game.score += 1;
      this._scheduleGravity();
    } else if (action === 'drop') {
      game.hardDrop();
      this._scheduleGravity();
    }
    this._afterAction();
  }

  // -------------------------------------------------------------------- la IA

  /** Un paso de la IA: un giro o un desplazamiento hacia donde ha decidido, y baja una fila */
  _autoStep(mode) {
    const { game } = this;
    if (this.planFor !== game.pieces) {
      this.plan = STRATEGIES[mode](game);
      this.planFor = game.pieces;
    }
    const p = game.piece;
    if (p.rot !== this.plan.rot) game.rotate(1);
    else if (p.x !== this.plan.x) game.move(Math.sign(this.plan.x - p.x));
    game.down();
    this._afterAction();
    return !game.over;
  }

  // ------------------------------------------------------------------- eventos

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.overlayEl.hidden = true;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = KEYS[e.key] ?? KEYS[e.key.toLowerCase?.()];
      if (!action) return;
      // Las flechas y el espacio no deben mover la página
      e.preventDefault();
      this._act(action);
    });

    document.getElementById('touch').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) this._act(action);
    });

    document.getElementById('new-game').addEventListener('click', () => this._reset());
    document.getElementById('game-over-new-game').addEventListener('click', () => this._reset());
    document.getElementById('game-over-close').addEventListener('click', () => {
      this.overlayEl.hidden = true;
    });
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.overlayEl.hidden = true;
    });

    // Si cambia el tema (aquí o en otra página), se vuelve a pintar con los colores nuevos
    const repaint = () => {
      this._refreshColors();
      this._render();
    };
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('load', repaint);
  }

  // -------------------------------------------------------------------- récord

  _loadBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  _saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(this.best));
    } catch {
      // Sin almacenamiento: el récord dura hasta recargar
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new TetrisApp());
