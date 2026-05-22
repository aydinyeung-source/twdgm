import { CARD_DEFS, ALL_CARD_IDS, HAND_SIZE, RACE_DEFS } from './data.js';
import { cardThumbCanvas } from './cardart.js';

// ── Deck (rotating cycle) ──────────────────────────────────
export class Deck {
  constructor(cardIds) {
    this._source = cardIds && cardIds.length >= 4 ? cardIds : ALL_CARD_IDS;
    this.cycle = [];
    this.reset();
  }

  reset() {
    this.cycle = [...this._source].sort(() => Math.random() - 0.5);
    this._pos = 0;
  }

  peek()     { return this.cycle[this._pos % this.cycle.length]; }
  draw()     { const id = this.peek(); this._pos++; return id; }
}

// ── Card Hand ──────────────────────────────────────────────
export class Hand {
  constructor(economy, deckCardIds, onPlay, opts = {}) {
    this.economy      = economy;
    this.onPlay       = onPlay;
    this.cards        = [];
    this.nextId       = null;
    this.selected     = -1;
    this._deck        = new Deck(deckCardIds);
    this._getLevel    = opts.getLevel    ?? null;
    this._onCardInfo  = opts.onCardInfo  ?? null;
    this._onDragStart = opts.onDragStart ?? null;
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

  tryDeploy(lane, target = null) {
    if (this.selected < 0) return false;
    const def = CARD_DEFS[this.cards[this.selected]];
    if (!this.economy.spend(def.cost)) return false;

    const playedId = this.cards[this.selected];
    this.cards.splice(this.selected, 1);
    this.cards.push(this._deck.draw());
    this.nextId = this._deck.peek();
    this.selected = -1;
    this._render();
    this.onPlay(playedId, lane, target);
    return true;
  }

  _render() {
    const container = document.getElementById('card-hand');
    if (!container) return;
    container.innerHTML = '';

    this.cards.forEach((id, i) => {
      const def   = CARD_DEFS[id];
      const level = this._getLevel ? this._getLevel(id) : 1;
      const el    = document.createElement('div');
      const typeBadge = def.type === 'enemy' ? 'ATK' : def.type === 'spell' ? 'SPELL' : 'DEF';
      el.className = [
        'card',
        `type-${def.type}`,
        i === this.selected ? 'selected' : '',
        !this.economy.canAfford(def.cost) ? 'unaffordable' : '',
      ].filter(Boolean).join(' ');
      el.style.setProperty('--card-bg', _hexToRgba(def.color, 0.12));
      const raceColor = RACE_DEFS[def.race]?.color ?? '#888';
      el.style.setProperty('--race-color', raceColor);
      el.innerHTML = `
        <div class="card-cost">${def.cost}</div>
        <div class="card-type-badge">${typeBadge}</div>
        ${level > 1 ? `<div class="card-level-badge">Lv${level}</div>` : ''}
        <div class="card-icon"></div>
        <div class="card-name">${def.name}</div>
        <div class="card-race">${RACE_DEFS[def.race]?.name ?? ''}</div>
      `;
      el.querySelector('.card-icon').appendChild(cardThumbCanvas(id, 44));
      if (this._onDragStart) {
        el.addEventListener('pointerdown', e => {
          e.preventDefault();
          this._onDragStart(i, e.clientX, e.clientY);
        });
      } else {
        el.addEventListener('click', () => this.select(i));
      }
      container.appendChild(el);
    });

    // Next card preview
    if (this.nextId) {
      const nd = CARD_DEFS[this.nextId];
      const costEl = document.getElementById('next-card-cost');
      const bodyEl = document.getElementById('next-card-body');
      if (costEl) costEl.textContent = nd.cost;
      if (bodyEl) { bodyEl.innerHTML = ''; bodyEl.appendChild(cardThumbCanvas(this.nextId, 32)); }
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
