import { CARD_DEFS, ALL_CARD_IDS, HAND_SIZE } from './data.js';

// ── Deck (rotating cycle) ──────────────────────────────────
export class Deck {
  constructor() {
    this.cycle = [];
    this.reset();
  }

  reset() {
    // Shuffle all card IDs into a cycle
    this.cycle = [...ALL_CARD_IDS].sort(() => Math.random() - 0.5);
    this._pos = 0;
  }

  peek()     { return this.cycle[this._pos % this.cycle.length]; }
  draw()     { const id = this.peek(); this._pos++; return id; }
}

// ── Card Hand ──────────────────────────────────────────────
export class Hand {
  constructor(economy, onPlay) {
    this.economy  = economy;
    this.onPlay   = onPlay;   // (cardId, lane) => void
    this.cards    = [];       // array of cardId strings
    this.nextId   = null;
    this.selected = -1;
    this._deck    = new Deck();
  }

  deal() {
    this.cards = [];
    for (let i = 0; i < HAND_SIZE; i++) {
      this.cards.push(this._deck.draw());
    }
    this.nextId = this._deck.peek();
    this.selected = -1;
    this._render();
  }

  select(index) {
    if (index < 0 || index >= this.cards.length) return;
    const def = CARD_DEFS[this.cards[index]];
    if (!this.economy.canAfford(def.cost)) return;
    this.selected = this.selected === index ? -1 : index;
    this._render();
    return this.selected !== -1;
  }

  selectById(cardId) {
    const idx = this.cards.indexOf(cardId);
    if (idx !== -1) this.select(idx);
  }

  hasSelected() { return this.selected >= 0; }

  selectedDef() {
    return this.selected >= 0 ? CARD_DEFS[this.cards[this.selected]] : null;
  }

  // Called when player taps a deploy zone
  tryDeploy(lane) {
    if (this.selected < 0) return false;
    const def = CARD_DEFS[this.cards[this.selected]];
    if (!this.economy.spend(def.cost)) return false;

    const playedId = this.cards[this.selected];
    this.cards.splice(this.selected, 1);
    this.cards.push(this._deck.draw());
    this.nextId = this._deck.peek();
    this.selected = -1;
    this._render();
    this.onPlay(playedId, lane);
    return true;
  }

  _render() {
    const container = document.getElementById('card-hand');
    if (!container) return;
    container.innerHTML = '';

    this.cards.forEach((id, i) => {
      const def = CARD_DEFS[id];
      const el  = document.createElement('div');
      el.className = [
        'card',
        `type-${def.type}`,
        i === this.selected ? 'selected' : '',
        !this.economy.canAfford(def.cost) ? 'unaffordable' : '',
      ].filter(Boolean).join(' ');
      el.style.setProperty('--card-bg', _hexToRgba(def.color, 0.12));
      el.innerHTML = `
        <div class="card-cost">${def.cost}</div>
        <div class="card-type-badge">${def.type}</div>
        <div class="card-icon">${def.icon}</div>
        <div class="card-name">${def.name}</div>
      `;
      el.addEventListener('click', () => this.select(i));
      container.appendChild(el);
    });

    // Next card preview
    if (this.nextId) {
      const nd = CARD_DEFS[this.nextId];
      const costEl = document.getElementById('next-card-cost');
      const bodyEl = document.getElementById('next-card-body');
      if (costEl) costEl.textContent = nd.cost;
      if (bodyEl) bodyEl.innerHTML   = `<span>${nd.icon}</span>`;
    }
  }

  updateAffordability() {
    this._render();
  }
}

function _hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
