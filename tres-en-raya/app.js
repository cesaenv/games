// Une la lógica del tres en raya con la pantalla: tablero, clics y el jugador automático.

import { TicTacToe } from './game.js';
import { STRATEGIES } from './ai.js';
import { createAutoPanel } from '../shared/autoplay.js';

const SPEEDS = { Slow: 700, Fast: 300, Full: 60 };
const REPLY_MS = 450; // lo que tarda la máquina en contestar cuando juegas tú

class TicTacToeApp {
  constructor() {
    this.game = new TicTacToe();
    this.demo = document.documentElement.classList.contains('demo');
    this.tally = { X: 0, O: 0, draw: 0 };
    this.timer = null;
    this.usedAuto = false; // si la máquina ha jugado las dos partes

    this.boardEl = document.getElementById('board');
    this.statusEl = document.getElementById('status');

    this.autoPanel = createAutoPanel(document.getElementById('auto-panel'), {
      modes: Object.keys(STRATEGIES),
      defaultMode: 'Random',
      speeds: SPEEDS,
      defaultSpeed: this.demo ? 'Slow' : 'Fast',
      onStart: () => {
        this._cancelReply();
        if (this.game.over) this._newGame();
        this.usedAuto = true;
        this._render();
      },
      onStop: () => {
        // Si se para con el turno de la máquina, que conteste ella
        this._render();
        this._scheduleReply();
      },
      step: (mode) => this._autoStep(mode),
    });

    this.cellEls = Array.from({ length: 9 }, (_, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cell';
      el.dataset.i = String(i);
      this.boardEl.append(el);
      return el;
    });

    this._bindEvents();
    this._newGame();
    // Vista previa del menú: juegan solas en Random, salvo que se pidan menos animaciones
    if (this.demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.autoPanel.start();
  }

  // ------------------------------------------------------------------ pantalla

  _render() {
    const { game } = this;
    game.board.forEach((v, i) => {
      const el = this.cellEls[i];
      const win = game.line?.includes(i);
      el.className = 'cell' + (v ? ` taken ${v.toLowerCase()}` : '') + (win ? ' win' : '');
      el.textContent = v ?? '';
      el.setAttribute('aria-label', `Casilla ${i + 1}, ${v ? v : 'vacía'}`);
    });
    document.getElementById('score-x').textContent = String(this.tally.X);
    document.getElementById('score-draw').textContent = String(this.tally.draw);
    document.getElementById('score-o').textContent = String(this.tally.O);
    if (this.demo) return;

    if (game.over) return;
    if (this.autoPanel.isRunning()) this.statusEl.textContent = `Juega la máquina (${game.turn})`;
    else this.statusEl.textContent = game.turn === 'X' ? 'Tu turno (X).' : 'Piensa la máquina (O)…';
  }

  // ------------------------------------------------------------------- partida

  _reset() {
    this.autoPanel.stop();
    this._newGame();
  }

  _newGame() {
    this._cancelReply();
    this.game.reset();
    this.usedAuto = false;
    this._render();
  }

  _finish() {
    const { result } = this.game;
    this.tally[result] += 1;
    this._cancelReply();
    this.autoPanel.stop();
    this._render();
    if (this.demo) {
      // En la vista previa se deja ver cómo ha acabado y se empieza otra partida
      setTimeout(() => {
        this._reset();
        this.autoPanel.start();
      }, 1500);
      return;
    }
    if (result === 'draw') this.statusEl.textContent = 'Empate.';
    else if (this.usedAuto) this.statusEl.textContent = `Gana ${result}.`;
    else this.statusEl.textContent = result === 'X' ? '¡Has ganado!' : 'Ha ganado la máquina.';
  }

  _play(i) {
    if (!this.game.play(i)) return false;
    this._render();
    if (this.game.over) this._finish();
    return true;
  }

  // ------------------------------------------------------------- jugar a mano

  _canPlay() {
    return !this.demo && !this.autoPanel.isRunning() && !this.game.over && this.game.turn === 'X';
  }

  _scheduleReply() {
    if (this.timer || this.demo || this.autoPanel.isRunning() || this.game.over || this.game.turn !== 'O') return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.autoPanel.isRunning() || this.game.over) return;
      this._play(STRATEGIES[this.autoPanel.getMode()](this.game));
    }, REPLY_MS);
  }

  _cancelReply() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  // -------------------------------------------------------------------- la IA

  _autoStep(mode) {
    this._play(STRATEGIES[mode](this.game));
    return !this.game.over;
  }

  // ------------------------------------------------------------------- eventos

  _bindEvents() {
    this.boardEl.addEventListener('click', (e) => {
      const el = e.target.closest('.cell');
      if (!el || !this._canPlay()) return;
      if (this._play(Number(el.dataset.i))) this._scheduleReply();
    });
    document.getElementById('new-game').addEventListener('click', () => this._reset());
  }
}

document.addEventListener('DOMContentLoaded', () => new TicTacToeApp());
