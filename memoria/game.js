// Lógica del juego de memoria, sin nada de pantalla.

export const SYMBOLS = [
  { glyph: '★', name: 'estrella' },
  { glyph: '♥', name: 'corazón' },
  { glyph: '♦', name: 'rombo' },
  { glyph: '♣', name: 'trébol' },
  { glyph: '♠', name: 'pica' },
  { glyph: '☀', name: 'sol' },
  { glyph: '☾', name: 'luna' },
  { glyph: '✿', name: 'flor' },
];

export class MemoryGame {
  constructor(pairs = SYMBOLS.length, rng = Math.random) {
    this.pairs = pairs;
    this.rng = rng;
    this.reset();
  }

  reset() {
    const deck = [];
    for (let s = 0; s < this.pairs; s++) deck.push(s, s);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // state: 'down' (boca abajo), 'up' (boca arriba, sin resolver) o 'matched'
    this.cards = deck.map((symbol) => ({ symbol, state: 'down' }));
    this.flipped = [];
    this.moves = 0;
    this.matched = 0;
  }

  get over() {
    return this.matched === this.pairs;
  }

  /** Hay dos cartas boca arriba esperando a resolverse */
  get pending() {
    return this.flipped.length === 2;
  }

  /** Da la vuelta a una carta. Devuelve false si no se puede. */
  flip(i) {
    const card = this.cards[i];
    if (this.over || this.pending || card.state !== 'down') return false;
    card.state = 'up';
    this.flipped.push(i);
    return true;
  }

  /** Comprueba las dos cartas boca arriba: se quedan si son pareja, y si no se vuelven a tapar */
  resolve() {
    if (!this.pending) return null;
    const [a, b] = this.flipped;
    this.flipped = [];
    this.moves += 1;
    const match = this.cards[a].symbol === this.cards[b].symbol;
    this.cards[a].state = match ? 'matched' : 'down';
    this.cards[b].state = match ? 'matched' : 'down';
    if (match) this.matched += 1;
    return { match, cards: [a, b] };
  }
}
