// Wires the Board/strategy logic to the DOM: rendering, animations, input and the AI loop.

import { Board } from "./board.js";
import { STRATEGIES, STRATEGY_DESCRIPTIONS } from "./strategy/index.js";
import {
  AI_MODES,
  AI_SPEEDS,
  CELL_GAP,
  CELL_SIZE,
  DEFAULT_AI_MODE,
  DEFAULT_AI_SPEED,
  DEFAULT_TILE_COLOR,
  KEY_TO_DIRECTION,
  POP_MS,
  SLIDE_MS,
  TILE_COLORS,
} from "./config.js";
import { createAutoPanel } from "../../shared/autoplay.js";

class Game2048 {
  constructor() {
    this.board = new Board();
    this.tiles = []; // { el, row, col, value }
    this.animating = false;
    this.gameOverShown = false;
    this._onTurnEnd = null;
    this.demo = document.documentElement.classList.contains("demo");

    this.boardEl = document.getElementById("board");
    this.scoreEl = document.getElementById("score");
    this.statusEl = document.getElementById("status");
    this.newGameButton = document.getElementById("new-game");
    this.modesGuideListEl = document.getElementById("modes-guide-list");
    this.gameOverOverlayEl = document.getElementById("game-over-overlay");
    this.gameOverMessageEl = document.getElementById("game-over-message");
    this.gameOverCloseButton = document.getElementById("game-over-close");
    this.gameOverNewGameButton = document.getElementById("game-over-new-game");

    this.cellSize = CELL_SIZE;

    this._buildBoard();
    this.autoPanel = createAutoPanel(document.getElementById("auto-panel"), {
      labels: { title: "AI Player", mode: "Mode", speed: "Speed", start: "Start AI", stop: "Stop AI" },
      modes: AI_MODES,
      defaultMode: DEFAULT_AI_MODE,
      speeds: AI_SPEEDS,
      defaultSpeed: this.demo ? "Slow" : DEFAULT_AI_SPEED,
      onModeChange: () => this._highlightActiveMode(),
      step: (mode, { instant }) => this._aiStep(mode, instant),
    });
    this._buildModesGuide();
    this._bindEvents();
    this._renderInstant();
    // Vista previa del menú: juega sola en Random, salvo que se pidan menos animaciones
    if (this.demo && !matchMedia("(prefers-reduced-motion: reduce)").matches) this.autoPanel.start();

    window.addEventListener("resize", () => this._resizeBoard());
  }

  // ---------------------------------------------------------------- layout

  _resizeBoard() {
    const size = this.board.size;
    const available = this.boardEl.parentElement.clientWidth;
    const fitted = Math.floor((available - (size + 1) * CELL_GAP) / size);
    this.cellSize = Math.max(1, Math.min(CELL_SIZE, fitted));
    const px = size * this.cellSize + (size + 1) * CELL_GAP;
    this.boardEl.style.width = `${px}px`;
    this.boardEl.style.height = `${px}px`;

    const cells = this.boardEl.querySelectorAll(".cell");
    let i = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const [x, y] = this._cellXY(r, c);
        cells[i].style.left = `${x}px`;
        cells[i].style.top = `${y}px`;
        cells[i].style.width = `${this.cellSize}px`;
        cells[i].style.height = `${this.cellSize}px`;
        i += 1;
      }
    }
    this._renderInstant();
  }

  _buildBoard() {
    const size = this.board.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        this.boardEl.appendChild(cell);
      }
    }
    this._resizeBoard();
  }

  /** Static reference list of every AI mode with its description, */
  _buildModesGuide() {
    this.modesGuideListEl.innerHTML = "";
    AI_MODES.forEach((mode) => {
      const item = document.createElement("div");
      item.className = "mode-guide-item";
      item.dataset.mode = mode;

      const name = document.createElement("h3");
      name.className = "mode-guide-name";
      name.textContent = mode;

      const description = document.createElement("p");
      description.className = "mode-guide-description";
      description.textContent = STRATEGY_DESCRIPTIONS[mode] ?? "";

      item.append(name, description);
      this.modesGuideListEl.appendChild(item);
    });
    this._highlightActiveMode();
  }

  _highlightActiveMode() {
    this.modesGuideListEl.querySelectorAll(".mode-guide-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.mode === this.autoPanel.getMode());
    });
  }

  _bindEvents() {
    document.addEventListener("keydown", (e) => this._onKeyDown(e));
    this.newGameButton.addEventListener("click", () => this._newGame());

    this.gameOverCloseButton.addEventListener("click", () => this._hideGameOverModal());
    this.gameOverNewGameButton.addEventListener("click", () => {
      this._hideGameOverModal();
      this._newGame();
    });
    this.gameOverOverlayEl.addEventListener("click", (e) => {
      if (e.target === this.gameOverOverlayEl) this._hideGameOverModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!this.gameOverOverlayEl.hidden) this._hideGameOverModal();
    });

  }

  _cellXY(row, col) {
    const x = CELL_GAP + col * (this.cellSize + CELL_GAP);
    const y = CELL_GAP + row * (this.cellSize + CELL_GAP);
    return [x, y];
  }

  // ----------------------------------------------------------------- tiles

  _createTileEl(row, col, value) {
    const [x, y] = this._cellXY(row, col);
    const [bg, fg] = TILE_COLORS[value] || DEFAULT_TILE_COLOR;
    const el = document.createElement("div");
    el.className = "tile";
    el.style.background = bg;
    el.style.color = fg;
    el.style.width = `${this.cellSize}px`;
    el.style.height = `${this.cellSize}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = this.cellSize < 70 ? (value < 1000 ? "22px" : "16px") : value < 1000 ? "32px" : "24px";
    el.textContent = String(value);
    this.boardEl.appendChild(el);
    return { el, row, col, value };
  }

  _clearTiles() {
    this.tiles.forEach((t) => t.el.remove());
    this.tiles = [];
  }

  /** Fully redraws every tile from the current board state (no sliding). */
  _renderInstant() {
    this._clearTiles();
    for (let r = 0; r < this.board.size; r++) {
      for (let c = 0; c < this.board.size; c++) {
        const value = this.board.grid[r][c];
        if (value !== 0) this.tiles.push(this._createTileEl(r, c, value));
      }
    }
    this.scoreEl.textContent = String(this.board.score);
  }

  // ------------------------------------------------------------- new game

  _newGame() {
    if (this.animating) return;
    this.autoPanel.stop();
    this.board.reset();
    this.gameOverShown = false;
    this.statusEl.textContent = "";
    this._renderInstant();
  }

  // ------------------------------------------------------------- controls

  _onKeyDown(e) {
    const direction = KEY_TO_DIRECTION[e.key];
    if (!direction || this.demo) return;
    // Always stop arrow keys from scrolling the page, even while animating,
    // while the AI is playing, or once the game is over.
    e.preventDefault();
    if (this.animating || this.autoPanel.isRunning() || this.board.isGameOver()) return;
    this._applyMove(direction);
  }

  _applyMove(direction) {
    const oldTilesByPos = new Map();
    this.tiles.forEach((t) => oldTilesByPos.set(`${t.row},${t.col}`, t));
    const { changed, moves, newTilePos } = this.board.moveWithAnimation(direction);
    if (!changed) return false;
    this.animating = true;
    this._animateSlide(oldTilesByPos, moves, newTilePos);
    return true;
  }

  // ---------------------------------------------------------- animations

  _animateSlide(oldTilesByPos, moves, newTilePos) {
    const mergeTargets = new Set();
    moves.forEach((m) => {
      const tile = oldTilesByPos.get(`${m.from[0]},${m.from[1]}`);
      if (!tile) return;
      const [x, y] = this._cellXY(m.to[0], m.to[1]);
      tile.el.style.transition = `left ${SLIDE_MS}ms ease, top ${SLIDE_MS}ms ease`;
      tile.el.style.left = `${x}px`;
      tile.el.style.top = `${y}px`;
      if (m.merged) mergeTargets.add(`${m.to[0]},${m.to[1]}`);
    });

    setTimeout(() => {
      const popCells = new Set(mergeTargets);
      if (newTilePos) popCells.add(`${newTilePos[0]},${newTilePos[1]}`);
      this._renderInstant();
      this._popCells(popCells);
    }, SLIDE_MS);
  }

  _popCells(popCells) {
    const popTiles = this.tiles.filter((t) => popCells.has(`${t.row},${t.col}`));
    if (popTiles.length === 0) {
      this._endTurn();
      return;
    }
    popTiles.forEach((t) => {
      t.el.style.transition = "none";
      t.el.style.transform = "scale(0.6)";
    });
    requestAnimationFrame(() => {
      popTiles.forEach((t) => {
        t.el.style.transition = `transform ${POP_MS}ms ease`;
        t.el.style.transform = "scale(1)";
      });
    });
    setTimeout(() => this._endTurn(), POP_MS);
  }

  _endTurn() {
    this.animating = false;
    if (this.board.won && !this.statusEl.textContent.includes("2048")) {
      this.statusEl.textContent = "You reached 2048! Keep going or start a new game.";
    }

    const over = this.board.isGameOver();
    if (over) {
      this.statusEl.textContent = "Game over! No more moves available.";
      this.autoPanel.stop();
      if (!this.gameOverShown) {
        this.gameOverShown = true;
        if (this.demo) {
          // En la vista previa no hay aviso: se empieza otra partida sola
          setTimeout(() => {
            this._newGame();
            this.autoPanel.start();
          }, 1500);
        } else {
          setTimeout(() => this._showGameOverModal(this.board.score), 50);
        }
      }
    }

    // Avisa a la IA (si está jugando) de que la jugada ha terminado
    const done = this._onTurnEnd;
    this._onTurnEnd = null;
    if (done) done(!over);
  }

  // -------------------------------------------------------------------- AI

  /** Hace una jugada de la IA para el panel de shared/. Devuelve false cuando la partida acaba. */
  async _aiStep(mode, instant) {
    if (this.animating) {
      // Hay una animación de una jugada manual en curso: se espera a que acabe
      await new Promise((resolve) => setTimeout(resolve, SLIDE_MS + POP_MS));
      return true;
    }

    if (this.board.isGameOver()) {
      this._endTurn();
      return false;
    }

    const direction = STRATEGIES[mode](this.board);
    if (!direction) {
      this._endTurn();
      return false;
    }

    if (!instant) return this._playMove(direction);

    this.board.move(direction);
    this._renderInstant();
    if (this.board.isGameOver()) {
      this._endTurn();
      return false;
    }
    return true;
  }

  /** Como _applyMove, pero devuelve una promesa que se cumple al acabar la animación. */
  _playMove(direction) {
    return new Promise((resolve) => {
      if (!this._applyMove(direction)) return resolve(false);
      this._onTurnEnd = resolve;
    });
  }

  // --------------------------------------------------------------------- UI

  _showGameOverModal(score) {
    this.gameOverMessageEl.innerHTML = "";
    this.gameOverMessageEl.append("No more moves left.", document.createElement("br"), "Final score: ");
    const strong = document.createElement("strong");
    strong.textContent = String(score);
    this.gameOverMessageEl.append(strong);
    this.gameOverOverlayEl.hidden = false;
  }

  _hideGameOverModal() {
    this.gameOverOverlayEl.hidden = true;
  }
}

document.addEventListener("DOMContentLoaded", () => new Game2048());
