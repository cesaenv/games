// Une la lógica del Snake con la pantalla: dibujo, teclado, táctil y el jugador automático.

import { Snake, SIZE } from './game.js';
import { STRATEGIES } from './ai.js';
import { createAutoPanel } from '../shared/autoplay.js';

const MANUAL_MS = 120; // tiempo entre pasos jugando a mano
const SPEEDS = { Slow: 160, Fast: 70, Full: 12 };
const BEST_KEY = 'snake.best';

const KEYS = {
  ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
  w: 0, d: 1, s: 2, a: 3,
};

class SnakeApp {
  constructor() {
    this.game = new Snake();
    this.demo = document.documentElement.classList.contains('demo');
    this.queue = []; // giros pendientes
    this.timer = null;
    this.usedAuto = false; // si la IA ha tocado la partida no cuenta para el récord
    this.best = this._loadBest();

    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.bestEl = document.getElementById('best');
    this.statusEl = document.getElementById('status');
    this.overlayEl = document.getElementById('game-over-overlay');
    this.messageEl = document.getElementById('game-over-message');

    this.autoPanel = createAutoPanel(document.getElementById('auto-panel'), {
      modes: Object.keys(STRATEGIES),
      defaultMode: 'Random',
      speeds: SPEEDS,
      defaultSpeed: this.demo ? 'Slow' : 'Fast',
      onStart: () => {
        this._stopManual();
        if (this.game.over) this._newGame();
        this.usedAuto = true;
        this.statusEl.textContent = '';
      },
      onStop: () => {
        if (!this.game.over && !this.demo) this.statusEl.textContent = 'En pausa. Pulsa una flecha para seguir.';
      },
      step: (mode) => this._autoStep(mode),
    });

    this._refreshColors();
    this._bindEvents();
    this._reset();
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
      snake: get('--accent'),
      eye: get('--accent-contrast'),
      food: get('--text'),
    };
  }

  // -------------------------------------------------------------------- dibujo

  _draw() {
    const { ctx, game, colors } = this;
    const cell = this.canvas.width / SIZE;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.cell;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let i = 1; i < SIZE; i++) {
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, this.canvas.height);
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(this.canvas.width, i * cell + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (game.food) {
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc((game.food.x + 0.5) * cell, (game.food.y + 0.5) * cell, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    const pad = 2;
    const last = game.body.length - 1;
    ctx.fillStyle = colors.snake;
    for (let i = last; i >= 0; i--) {
      const c = game.body[i];
      // De la cola a la cabeza se va haciendo más opaca
      ctx.globalAlpha = i === 0 ? 1 : 0.45 + 0.4 * (1 - i / last);
      ctx.fillRect(c.x * cell + pad, c.y * cell + pad, cell - pad * 2, cell - pad * 2);
    }
    ctx.globalAlpha = 1;

    // Ojos: dos puntos hacia donde mira
    const head = game.body[0];
    const hx = (head.x + 0.5) * cell;
    const hy = (head.y + 0.5) * cell;
    const fx = [0, 1, 0, -1][game.dir];
    const fy = [-1, 0, 1, 0][game.dir];
    ctx.fillStyle = colors.eye;
    for (const side of [-1, 1]) {
      const ex = hx + fx * cell * 0.18 - fy * side * cell * 0.2;
      const ey = hy + fy * cell * 0.18 + fx * side * cell * 0.2;
      ctx.beginPath();
      ctx.arc(ex, ey, cell * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _render() {
    this._draw();
    this.scoreEl.textContent = String(this.game.score);
    this.bestEl.textContent = String(this.best);
  }

  // ------------------------------------------------------------------- partida

  _reset() {
    this.autoPanel.stop();
    this._newGame();
  }

  _newGame() {
    this._stopManual();
    this.game.reset();
    this.queue = [];
    this.usedAuto = false;
    this.overlayEl.hidden = true;
    this.statusEl.textContent = this.demo ? '' : 'Pulsa una flecha para empezar.';
    this._render();
  }

  _afterStep() {
    this._render();
    if (this.game.over) this._finish();
  }

  _finish() {
    this._stopManual();
    this.autoPanel.stop();
    const { score, won } = this.game;
    if (!this.usedAuto && score > this.best) {
      this.best = score;
      this._saveBest();
      this.bestEl.textContent = String(this.best);
    }

    if (this.demo) {
      // En la vista previa se empieza otra partida sola
      setTimeout(() => {
        this._reset();
        this.autoPanel.start();
      }, 1500);
      return;
    }
    this.statusEl.textContent = won ? '¡Has llenado el tablero!' : 'Fin de la partida.';
    this.messageEl.innerHTML = '';
    this.messageEl.append(won ? '¡Has llenado todo el tablero!' : 'Has chocado.', document.createElement('br'), 'Puntos: ');
    const strong = document.createElement('strong');
    strong.textContent = String(score);
    this.messageEl.append(strong);
    setTimeout(() => {
      if (this.game.over) this.overlayEl.hidden = false;
    }, 250);
  }

  // ------------------------------------------------------------- jugar a mano

  _queueDirection(dir) {
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.game.dir;
    if (dir === last || (dir + 2) % 4 === last) return;
    if (this.queue.length < 2) this.queue.push(dir);
  }

  _startManual() {
    if (this.timer) return;
    this.statusEl.textContent = '';
    this.timer = setInterval(() => {
      this.game.step(this.queue.shift());
      this._afterStep();
    }, MANUAL_MS);
  }

  _stopManual() {
    clearInterval(this.timer);
    this.timer = null;
  }

  _onDirection(dir) {
    if (this.demo || this.autoPanel.isRunning() || this.game.over) return;
    this._queueDirection(dir);
    this._startManual();
  }

  // -------------------------------------------------------------------- la IA

  _autoStep(mode) {
    this.game.step(STRATEGIES[mode](this.game));
    this._afterStep();
    return !this.game.over;
  }

  // ------------------------------------------------------------------- eventos

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.overlayEl.hidden = true;
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase?.()];
      if (dir === undefined || e.metaKey || e.ctrlKey || e.altKey) return;
      // Las flechas no deben mover la página
      e.preventDefault();
      this._onDirection(dir);
    });

    // Táctil: deslizar sobre el tablero
    let start = null;
    this.canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      start = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    this.canvas.addEventListener('touchend', (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      this._onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
    }, { passive: true });

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
      this._draw();
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

document.addEventListener('DOMContentLoaded', () => new SnakeApp());
