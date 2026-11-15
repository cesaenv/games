// Une la lógica del Buscaminas con la pantalla: tablero, ratón, teclado y el jugador automático.

import { Minesweeper } from './game.js';
import { STRATEGIES } from './ai.js';
import { createAutoPanel } from '../shared/autoplay.js';

const SPEEDS = { Slow: 300, Fast: 120, Full: 40 };
const BEST_KEY = 'buscaminas.best';

class MinesApp {
  constructor() {
    this.game = new Minesweeper();
    this.demo = document.documentElement.classList.contains('demo');
    this.flagMode = false;
    this.cursor = 0;
    this.seconds = 0;
    this.clock = null;
    this.usedAuto = false; // si la IA ha jugado, el tiempo no cuenta para el récord
    this.best = this._loadBest();

    this.boardEl = document.getElementById('board');
    this.minesEl = document.getElementById('mines');
    this.timeEl = document.getElementById('time');
    this.bestEl = document.getElementById('best');
    this.statusEl = document.getElementById('status');
    this.infoEl = document.getElementById('cursor-info');
    this.flagButton = document.getElementById('flag-mode');
    this.overlayEl = document.getElementById('game-over-overlay');
    this.messageEl = document.getElementById('game-over-message');

    this.autoPanel = createAutoPanel(document.getElementById('auto-panel'), {
      modes: Object.keys(STRATEGIES),
      defaultMode: 'Random',
      speeds: SPEEDS,
      defaultSpeed: this.demo ? 'Slow' : 'Fast',
      onStart: () => {
        if (this.game.over) this._newGame();
        this.usedAuto = true;
        this.statusEl.textContent = '';
      },
      onStop: () => {
        if (!this.game.over && !this.demo) this.statusEl.textContent = 'En pausa. Sigue tú o pulsa Iniciar.';
      },
      step: (mode) => this._autoStep(mode),
    });

    this._buildBoard();
    this._bindEvents();
    this._newGame();
    // Vista previa del menú: juega sola en Random, salvo que se pidan menos animaciones
    if (this.demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.autoPanel.start();
  }

  // ------------------------------------------------------------------ tablero

  _buildBoard() {
    this.boardEl.style.setProperty('--cols', String(this.game.cols));
    this.boardEl.style.setProperty('--rows', String(this.game.rows));
    this.boardEl.innerHTML = '';
    this.cellEls = this.game.cells.map((_, i) => {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.i = String(i);
      this.boardEl.append(el);
      return el;
    });
  }

  _renderCell(i) {
    const { game } = this;
    const c = game.cells[i];
    const el = this.cellEls[i];
    const lost = game.state === 'lost';
    el.className = 'cell';
    el.removeAttribute('data-n');
    el.textContent = '';
    if (c.revealed && !c.mine) {
      el.classList.add('open');
      if (c.n > 0) {
        el.dataset.n = String(c.n);
        el.textContent = String(c.n);
      }
    } else if (lost && c.mine && !c.flagged) {
      el.classList.add('open', 'mine');
      if (i === game.boom) el.classList.add('boom');
    } else if (lost && c.flagged && !c.mine) {
      el.classList.add('open', 'wrong');
    } else if (c.flagged) {
      el.classList.add('flag');
    }
    if (i === this.cursor) el.classList.add('cursor');
  }

  _renderAll() {
    this.game.cells.forEach((_, i) => this._renderCell(i));
    this._renderCounters();
  }

  _renderCounters() {
    this.minesEl.textContent = String(this.game.mines - this.game.flags);
    this.timeEl.textContent = String(this.seconds);
    this.bestEl.textContent = this.best ? String(this.best) : '-';
  }

  /** Dibuja solo lo que ha cambiado (o todo, si la partida ha acabado) */
  _afterAction(changed) {
    if (this.game.over) this._renderAll();
    else changed.forEach((i) => this._renderCell(i));
    this._renderCounters();
    if (this.game.state === 'playing') this._startClock();
    if (this.game.over) this._finish();
  }

  // ------------------------------------------------------------------ partida

  _reset() {
    this.autoPanel.stop();
    this._newGame();
  }

  _newGame() {
    this._stopClock();
    this.game.reset();
    this.seconds = 0;
    this.usedAuto = false;
    this.overlayEl.hidden = true;
    this.statusEl.textContent = this.demo ? '' : 'Destapa una casilla para empezar.';
    this._renderAll();
  }

  _startClock() {
    if (this.clock) return;
    this.clock = setInterval(() => {
      this.seconds += 1;
      this.timeEl.textContent = String(this.seconds);
    }, 1000);
  }

  _stopClock() {
    clearInterval(this.clock);
    this.clock = null;
  }

  _finish() {
    this._stopClock();
    this.autoPanel.stop();
    const won = this.game.state === 'won';
    if (won && !this.usedAuto && (!this.best || this.seconds < this.best)) {
      this.best = this.seconds;
      this._saveBest();
      this._renderCounters();
    }

    if (this.demo) {
      // En la vista previa se deja ver cómo ha acabado y luego se empieza otra partida
      setTimeout(() => {
        this._reset();
        this.autoPanel.start();
      }, 2500);
      return;
    }
    this.statusEl.textContent = won ? '¡Despejado!' : '¡Has pisado una mina!';
    this.messageEl.innerHTML = '';
    if (won) {
      this.messageEl.append('¡Has despejado el tablero!', document.createElement('br'), 'Tiempo: ');
      const strong = document.createElement('strong');
      strong.textContent = `${this.seconds} s`;
      this.messageEl.append(strong);
    } else {
      this.messageEl.append('Has pisado una mina.');
    }
    setTimeout(() => {
      if (this.game.over) this.overlayEl.hidden = false;
    }, 600);
  }

  // ------------------------------------------------------------------- acciones

  _open(i) {
    const cell = this.game.cells[i];
    const changed = cell.revealed ? this.game.chord(i) : this.game.reveal(i);
    this._afterAction(changed);
  }

  _flag(i) {
    this._afterAction(this.game.toggleFlag(i));
  }

  _autoStep(mode) {
    const action = STRATEGIES[mode](this.game);
    const changed = action.type === 'flag' ? this.game.toggleFlag(action.index) : this.game.reveal(action.index);
    this._afterAction(changed);
    return !this.game.over;
  }

  /** Solo juega el usuario si no hay demo, ni IA jugando, ni partida terminada */
  _canPlay() {
    return !this.demo && !this.autoPanel.isRunning() && !this.game.over;
  }

  // -------------------------------------------------------------------- eventos

  _cellOf(event) {
    const el = event.target.closest?.('.cell');
    return el ? Number(el.dataset.i) : -1;
  }

  _moveCursor(i) {
    const old = this.cursor;
    this.cursor = i;
    this._renderCell(old);
    this._renderCell(i);
    const c = this.game.cells[i];
    const row = Math.floor(i / this.game.cols) + 1;
    const col = (i % this.game.cols) + 1;
    const what = c.flagged ? 'bandera' : !c.revealed ? 'sin destapar' : c.n ? `${c.n}` : 'vacía';
    this.infoEl.textContent = `Fila ${row}, columna ${col}: ${what}`;
  }

  _bindEvents() {
    this.boardEl.addEventListener('click', (e) => {
      const i = this._cellOf(e);
      if (i < 0 || !this._canPlay()) return;
      this._moveCursor(i);
      if (this.flagMode) this._flag(i);
      else this._open(i);
    });

    // Clic derecho (o pulsación larga en muchos móviles): bandera
    this.boardEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const i = this._cellOf(e);
      if (i < 0 || !this._canPlay()) return;
      this._moveCursor(i);
      this._flag(i);
    });

    this.boardEl.addEventListener('keydown', (e) => {
      const { cols, rows } = this.game;
      const x = this.cursor % cols;
      const y = Math.floor(this.cursor / cols);
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[e.key]) {
        e.preventDefault();
        const nx = Math.min(cols - 1, Math.max(0, x + moves[e.key][0]));
        const ny = Math.min(rows - 1, Math.max(0, y + moves[e.key][1]));
        this._moveCursor(ny * cols + nx);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this._canPlay()) this._open(this.cursor);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (this._canPlay()) this._flag(this.cursor);
      }
    });

    this.flagButton.addEventListener('click', () => {
      this.flagMode = !this.flagMode;
      this.flagButton.setAttribute('aria-pressed', String(this.flagMode));
    });
    document.getElementById('new-game').addEventListener('click', () => this._reset());
    document.getElementById('game-over-new-game').addEventListener('click', () => this._reset());
    document.getElementById('game-over-close').addEventListener('click', () => {
      this.overlayEl.hidden = true;
    });
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.overlayEl.hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.overlayEl.hidden = true;
    });
  }

  // --------------------------------------------------------------------- récord

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

document.addEventListener('DOMContentLoaded', () => new MinesApp());
