// Une la lógica del juego de memoria con la pantalla: cartas, clics y el jugador automático.

import { MemoryGame, SYMBOLS } from './game.js';
import { choose, MODES } from './ai.js';
import { createAutoPanel } from '../shared/autoplay.js';

const SPEEDS = { Slow: 600, Fast: 250, Full: 40 };
const RESOLVE_MS = 800; // cuánto se ven dos cartas distintas antes de taparlas, jugando a mano
const BEST_KEY = 'memoria.best';

class MemoriaApp {
  constructor() {
    this.game = new MemoryGame();
    this.demo = document.documentElement.classList.contains('demo');
    this.seen = []; // cartas que se han ido girando, en orden
    this.seconds = 0;
    this.clock = null;
    this.resolveTimer = null;
    this.usedAuto = false; // si la IA ha jugado, el resultado no cuenta para el récord
    this.best = this._loadBest();

    this.boardEl = document.getElementById('board');
    this.statusEl = document.getElementById('status');
    this.overlayEl = document.getElementById('game-over-overlay');
    this.messageEl = document.getElementById('game-over-message');

    this.autoPanel = createAutoPanel(document.getElementById('auto-panel'), {
      modes: MODES,
      defaultMode: 'Random',
      speeds: SPEEDS,
      defaultSpeed: this.demo ? 'Slow' : 'Fast',
      onStart: () => {
        this._cancelResolve();
        if (this.game.over) this._newGame();
        this.usedAuto = true;
        this.statusEl.textContent = '';
      },
      onStop: () => {
        // Si se para con dos cartas giradas, se resuelven como jugando a mano
        if (this.game.pending && !this.demo) this._scheduleResolve();
        if (!this.game.over && !this.demo) this.statusEl.textContent = 'En pausa. Sigue tú o pulsa Iniciar.';
      },
      step: (mode) => this._autoStep(mode),
    });

    this.cardEls = this.game.cards.map((_, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'card';
      el.dataset.i = String(i);
      this.boardEl.append(el);
      return el;
    });

    this._bindEvents();
    this._newGame();
    // Vista previa del menú: juega sola en Random, salvo que se pidan menos animaciones
    if (this.demo && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.autoPanel.start();
  }

  // ------------------------------------------------------------------ pantalla

  _renderCard(i) {
    const card = this.game.cards[i];
    const el = this.cardEls[i];
    const faceUp = card.state !== 'down';
    const symbol = SYMBOLS[card.symbol];
    el.className = 'card' + (faceUp ? ` ${card.state}` : '');
    el.textContent = faceUp ? symbol.glyph : '';
    el.setAttribute('aria-label', faceUp ? `Carta ${i + 1}: ${symbol.name}` : `Carta ${i + 1}, boca abajo`);
  }

  _renderCounters() {
    document.getElementById('moves').textContent = String(this.game.moves);
    document.getElementById('pairs').textContent = `${this.game.matched}/${this.game.pairs}`;
    document.getElementById('time').textContent = String(this.seconds);
    document.getElementById('best').textContent = this.best ? String(this.best) : '-';
  }

  _renderAll() {
    this.game.cards.forEach((_, i) => this._renderCard(i));
    this._renderCounters();
  }

  // ------------------------------------------------------------------- partida

  _reset() {
    this.autoPanel.stop();
    this._newGame();
  }

  _newGame() {
    this._stopClock();
    this._cancelResolve();
    this.game.reset();
    this.seen = [];
    this.seconds = 0;
    this.usedAuto = false;
    this.overlayEl.hidden = true;
    this.statusEl.textContent = this.demo ? '' : 'Gira una carta para empezar.';
    this._renderAll();
  }

  _startClock() {
    if (this.clock) return;
    this.clock = setInterval(() => {
      this.seconds += 1;
      document.getElementById('time').textContent = String(this.seconds);
    }, 1000);
  }

  _stopClock() {
    clearInterval(this.clock);
    this.clock = null;
  }

  _finish() {
    this._stopClock();
    this._cancelResolve();
    this.autoPanel.stop();
    const { moves } = this.game;
    if (!this.usedAuto && (!this.best || moves < this.best)) {
      this.best = moves;
      this._saveBest();
      this._renderCounters();
    }
    if (this.demo) {
      // En la vista previa se deja ver el tablero completo y se empieza otra partida
      setTimeout(() => {
        this._reset();
        this.autoPanel.start();
      }, 2500);
      return;
    }
    this.statusEl.textContent = '¡Todas las parejas!';
    this.messageEl.innerHTML = '';
    this.messageEl.append('¡Has encontrado todas las parejas!', document.createElement('br'), 'Intentos: ');
    const attempts = document.createElement('strong');
    attempts.textContent = String(moves);
    this.messageEl.append(attempts, document.createElement('br'), 'Tiempo: ');
    const time = document.createElement('strong');
    time.textContent = `${this.seconds} s`;
    this.messageEl.append(time);
    setTimeout(() => {
      if (this.game.over) this.overlayEl.hidden = false;
    }, 500);
  }

  // ------------------------------------------------------------------- jugadas

  /** Gira una carta */
  _flip(i) {
    if (!this.game.flip(i)) return false;
    this.seen.push({ index: i, symbol: this.game.cards[i].symbol });
    this._startClock();
    this._renderCard(i);
    return true;
  }

  /** Comprueba las dos cartas giradas */
  _resolve() {
    this._cancelResolve();
    const result = this.game.resolve();
    if (!result) return;
    result.cards.forEach((i) => this._renderCard(i));
    this._renderCounters();
    if (this.game.over) this._finish();
  }

  _scheduleResolve() {
    if (this.resolveTimer) return;
    this.resolveTimer = setTimeout(() => {
      this.resolveTimer = null;
      this._resolve();
    }, RESOLVE_MS);
  }

  _cancelResolve() {
    clearTimeout(this.resolveTimer);
    this.resolveTimer = null;
  }

  _canPlay() {
    return !this.demo && !this.autoPanel.isRunning() && !this.game.over;
  }

  /** Un paso de la IA: girar una carta, o comprobar las dos giradas */
  _autoStep(mode) {
    if (this.game.pending) this._resolve();
    else this._flip(choose(mode, this.game, this.seen));
    return !this.game.over;
  }

  // ------------------------------------------------------------------- eventos

  _bindEvents() {
    this.boardEl.addEventListener('click', (e) => {
      const el = e.target.closest('.card');
      if (!el || !this._canPlay()) return;
      if (this._flip(Number(el.dataset.i)) && this.game.pending) this._scheduleResolve();
      this.statusEl.textContent = '';
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

document.addEventListener('DOMContentLoaded', () => new MemoriaApp());
