import { CARD_DEFS, MATCH_DURATION, CW, CHEST_DEFS, STARTER_DECK, RACE_DEFS, ARENA_TIERS, getArena, LANE_LEFT, LANE_RIGHT } from './data.js';
import { cardThumbCanvas }         from './cardart.js';
import { GameLoop, Particles, dist } from './engine.js';
import { Unit, Tower, Projectile, buildTowers } from './entities.js';
import { Economy }                 from './economy.js';
import { Hand }                    from './cards.js';
import { Renderer }                from './renderer.js';
import { UI }                      from './ui.js';
import { Account }                 from './account.js';
import { LocalBot, MSG } from './network.js';

// ── Game state container ──────────────────────────────────
class State {
  constructor() {
    this.units        = [];
    this.projectiles  = [];
    this.towers       = buildTowers();
    this.timeLeft     = MATCH_DURATION;
    this.overtime     = false;
    this.oppName      = '';
    this.stats        = { units: 0, damage: 0, towers: 0 };
    this.activeSpells = [];
  }
}

// ── Main Game class ────────────────────────────────────────
class Game {
  constructor() {
    this.canvas   = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.ui       = new UI();
    this.account  = new Account();
    this.economy  = new Economy();
    this.particles= new Particles();
    this.loop     = new GameLoop(dt => this._update(dt), () => this._render());
    this.net      = null;
    this.hand     = null;
    this.state    = null;
    this._active  = false;

    this._editDeck          = null;
    this._modalCardId       = null;
    this._wrPeriod          = 'all';
    this._coinMode          = 1;
    this._lobbyParticlesId  = null;

    this._wireAuthUI();
    this._wireMenuUI();
    this._wireMatchmakingUI();
    this._wireGameInput();
    this._wireResultUI();
    this._wireCanvasDeploy();
    this._wireCardModal();
    this._wireArenaModal();
    this._wireFriendsPanel();
    this._wireModes();

    this.ui.show('loading');
    setTimeout(() => {
      if (this.account.isLoggedIn()) this._showMenu();
      else this.ui.show('auth');
    }, 600);

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  // ── Auth ──────────────────────────────────────────────────
  _wireAuthUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === 'auth-' + btn.dataset.tab));
        this.ui.clearAuthError();
      });
    });
    document.getElementById('btn-login')?.addEventListener('click',    () => this._doLogin());
    document.getElementById('btn-register')?.addEventListener('click', () => this._doRegister());
    document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._doLogin(); });
    document.getElementById('reg-confirm')?.addEventListener('keydown',    e => { if (e.key === 'Enter') this._doRegister(); });
  }

  async _doLogin() {
    const user = document.getElementById('login-username')?.value.trim();
    const pass = document.getElementById('login-password')?.value;
    if (!user || !pass) { this.ui.setAuthError('Fill in all fields.'); return; }
    try { await this.account.login(user, pass); this._showMenu(); }
    catch (e) { this.ui.setAuthError(e.message); }
  }

  async _doRegister() {
    const user    = document.getElementById('reg-username')?.value.trim();
    const pass    = document.getElementById('reg-password')?.value;
    const confirm = document.getElementById('reg-confirm')?.value;
    if (!user || !pass) { this.ui.setAuthError('Fill in all fields.'); return; }
    if (pass.length < 6)  { this.ui.setAuthError('Password must be 6+ characters.'); return; }
    if (pass !== confirm) { this.ui.setAuthError('Passwords do not match.'); return; }
    try { await this.account.register(user, pass); this._showMenu(); }
    catch (e) { this.ui.setAuthError(e.message); }
  }

  // ── Menu ──────────────────────────────────────────────────
  _showMenu() {
    const u = this.account.getUser();
    if (u) this.ui.updateProfile(u);
    this._updateCoinDisplay();
    this._updateBattleTab();
    document.querySelectorAll('.menu-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'battle'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-battle'));
    this.ui.show('menu');
    this._updateFriendsBadge();
    this._updateModeDisplay();
    this._startLobbyParticles();
  }

  _updateBattleTab() {
    const u = this.account.getUser();
    if (!u) return;
    const tagEl = document.getElementById('menu-player-tag');
    if (tagEl) tagEl.textContent = u.playerTag ?? '#------';

    const trophies   = u.trophies ?? 0;
    const arenaInfo  = getArena(trophies);
    const nameEl     = document.getElementById('arena-name');
    const rangeEl    = document.getElementById('arena-range');
    if (nameEl) nameEl.textContent = arenaInfo.name;
    if (rangeEl) rangeEl.textContent = arenaInfo.max === Infinity
      ? `${arenaInfo.min}+ trophies`
      : `${arenaInfo.min} – ${arenaInfo.max} trophies`;

    const deck    = u.deck ?? [];
    const enemies = deck.filter(id => CARD_DEFS[id]?.type === 'enemy').length;
    const troops  = deck.filter(id => CARD_DEFS[id]?.type === 'troop').length;
    const valid   = deck.length === 12 && enemies >= 2 && troops >= 2;
    const warning = document.getElementById('battle-deck-warning');
    if (warning) warning.classList.toggle('hidden', valid);
  }

  _wireMenuUI() {
    document.querySelectorAll('.menu-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.menu-tab').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
        if (tab === 'profile') this._renderProfileTab();
        if (tab === 'deck')    this._renderDeckTab();
        if (tab === 'shop')    this._renderShopTab();
        if (tab === 'battle')  this._updateBattleTab();
      });
    });

    document.getElementById('btn-battle')?.addEventListener('click', () => this._startMatchmaking());
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      this._stopLobbyParticles();
      this.account.logout();
      this.ui.show('auth');
    });

    // Arena tiers button on battle tab
    document.getElementById('btn-arena-tiers')?.addEventListener('click', () => this._openArenaModal());
    // Profile tab arena click
    document.getElementById('pstat-arena-box')?.addEventListener('click', () => this._openArenaModal());
  }

  _updateCoinDisplay() {
    const u = this.account.getUser();
    const el = document.getElementById('coin-count');
    if (el) el.textContent = u?.coins ?? 0;
  }

  // ── Profile tab ───────────────────────────────────────────
  _renderProfileTab() {
    const u = this.account.getUser();
    if (!u) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('profile-username', u.username);
    set('profile-tag', u.playerTag ?? '#------');
    set('pstat-trophies', u.trophies ?? 0);
    set('pstat-games', (u.wins ?? 0) + (u.losses ?? 0));

    const t = u.trophies ?? 0;
    set('pstat-arena', getArena(t).name);

    this._updateWinRate();

    const av = document.getElementById('profile-avatar');
    if (av) av.textContent = (u.username?.[0] ?? '?').toUpperCase();

    // Win rate dropdown
    const wrBox = document.getElementById('pstat-wr-box');
    if (wrBox) {
      wrBox.onclick = (e) => {
        e.stopPropagation();
        const dd = document.getElementById('wr-dropdown');
        if (dd) dd.classList.toggle('hidden');
      };
    }
    document.querySelectorAll('.wr-opt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._wrPeriod = btn.dataset.period;
        document.querySelectorAll('.wr-opt').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('wr-dropdown')?.classList.add('hidden');
        this._updateWinRate();
      });
    });
    document.addEventListener('click', () => {
      document.getElementById('wr-dropdown')?.classList.add('hidden');
    }, { once: true });
  }

  _updateWinRate() {
    const u = this.account.getUser();
    if (!u) return;
    const wr = this.account.getWinrate(this._wrPeriod);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('pstat-wins',   wr.wins);
    set('pstat-losses', wr.losses);
    set('pstat-games',  wr.games);
    set('pstat-wr', wr.games > 0 ? wr.rate : '--');
  }

  // ── Deck tab ──────────────────────────────────────────────
  _renderDeckTab() {
    const u = this.account.getUser();
    if (!u) return;
    const unlocked = new Set(u.unlockedCards ?? []);
    this._editDeck = new Set(u.deck ?? STARTER_DECK);
    this._redrawDeckTab(unlocked);
  }

  _redrawDeckTab(unlocked) {
    const deckArr = [...this._editDeck];
    const enemies = deckArr.filter(id => CARD_DEFS[id]?.type === 'enemy');
    const troops  = deckArr.filter(id => CARD_DEFS[id]?.type === 'troop');
    const defense = deckArr.filter(id => ['troop','spell','building'].includes(CARD_DEFS[id]?.type));
    const valid   = deckArr.length === 12 && enemies.length >= 2 && troops.length >= 2;

    // Autosave when valid
    if (valid) this.account.saveDeck(deckArr);

    const deckCountEl = document.getElementById('deck-count');
    if (deckCountEl) deckCountEl.textContent = `${deckArr.length}/12 · ${enemies.length} enemies · ${defense.length} defense`;

    const slotsEl = document.getElementById('deck-slots');
    if (slotsEl) {
      slotsEl.innerHTML = '';
      const makeRow = (label, arr, maxSlots) => {
        const sec = document.createElement('div');
        sec.className = 'deck-section';
        sec.innerHTML = `<div class="deck-section-label">${label}</div>`;
        const row = document.createElement('div');
        row.className = 'deck-section-row';
        const slotCount = Math.max(arr.length + 1, 4);
        for (let i = 0; i < Math.min(slotCount, maxSlots); i++) {
          const slot = document.createElement('div');
          slot.className = 'deck-slot';
          if (arr[i]) {
            const cardId = arr[i];
            const def = CARD_DEFS[cardId];
            const lvl = this.account.getCardLevel(cardId);
            slot.classList.add('filled');
            slot.innerHTML = `
              <div class="dc-icon"></div>
              <div class="dc-name">${def.name}</div>
              ${lvl > 1 ? `<div class="dc-level">Lv${lvl}</div>` : ''}
            `;
            slot.querySelector('.dc-icon').appendChild(cardThumbCanvas(cardId, 32));
            slot.addEventListener('click', () => {
              this._editDeck.delete(cardId);
              this._redrawDeckTab(unlocked);
            });
          } else {
            slot.innerHTML = `<div class="dc-empty">+</div>`;
          }
          row.appendChild(slot);
        }
        sec.appendChild(row);
        return sec;
      };
      slotsEl.appendChild(makeRow('ENEMIES', enemies, 10));
      slotsEl.appendChild(makeRow('TROOPS & DEFENSE', defense, 10));
    }

    const makeCollGrid = (gridId, filterFn) => {
      const collEl = document.getElementById(gridId);
      if (!collEl) return;
      collEl.innerHTML = '';
      for (const [id, def] of Object.entries(CARD_DEFS)) {
        if (!filterFn(def)) continue;
        const isUnlocked = unlocked.has(id);
        const isInDeck   = this._editDeck.has(id);
        const lvl        = this.account.getCardLevel(id);
        const el = document.createElement('div');
        el.className = ['coll-card', `rarity-${def.rarity}`, isInDeck ? 'in-deck' : '', !isUnlocked ? 'locked' : ''].filter(Boolean).join(' ');
        const raceCol = RACE_DEFS[def.race]?.color ?? '#888';
        el.style.setProperty('--race-color', raceCol);
        el.innerHTML = `
          <div class="cc-cost">${def.cost}</div>
          ${lvl > 1 ? `<div class="cc-level-badge">Lv${lvl}</div>` : ''}
          <div class="cc-icon"></div>
          <div class="cc-name">${def.name}</div>
          <div class="cc-race">${RACE_DEFS[def.race]?.name ?? (def.type === 'spell' ? 'SPELL' : def.type === 'building' ? 'STRUCTURE' : '')}</div>
          ${!isUnlocked ? '<div class="cc-lock">&#128274;</div>' : ''}
          ${isInDeck    ? '<div class="cc-check">&#10003;</div>' : ''}
        `;
        el.querySelector('.cc-icon').appendChild(cardThumbCanvas(id, 32));
        if (isUnlocked) el.addEventListener('click', () => this._openCardModal(id, unlocked));
        collEl.appendChild(el);
      }
    };
    makeCollGrid('card-collection-enemies', d => d.type === 'enemy');
    makeCollGrid('card-collection-defense', d => ['troop','spell','building'].includes(d.type));
  }

  // ── Card Modal ────────────────────────────────────────────
  _wireCardModal() {
    document.getElementById('card-modal-backdrop')?.addEventListener('click', () => this._closeCardModal());
    document.getElementById('modal-close')?.addEventListener('click', () => this._closeCardModal());
    document.getElementById('modal-equip-btn')?.addEventListener('click', () => this._modalEquip());
    document.getElementById('modal-upgrade-btn')?.addEventListener('click', () => this._modalUpgrade());
  }

  _openCardModal(cardId, unlocked) {
    this._modalCardId = cardId;
    this._modalUnlocked = unlocked ?? new Set(this.account.getUser()?.unlockedCards ?? []);
    const def  = CARD_DEFS[cardId];
    if (!def) return;

    const modal = document.getElementById('card-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Art
    const artEl = document.getElementById('modal-art');
    if (artEl) { artEl.innerHTML = ''; artEl.appendChild(cardThumbCanvas(cardId, 96)); }

    // Name
    const nameEl = document.getElementById('modal-name');
    if (nameEl) nameEl.textContent = def.name;

    // Badges
    const typeB = document.getElementById('modal-type-badge');
    const raceB = document.getElementById('modal-race-badge');
    const rarB  = document.getElementById('modal-rarity-badge');
    if (typeB) { typeB.textContent = def.type === 'enemy' ? 'ATTACK' : 'DEFENSE'; typeB.className = 'modal-type-badge' + (def.type === 'enemy' ? ' enemy' : ''); }
    if (raceB) {
      const raceDef = RACE_DEFS[def.race];
      raceB.textContent = raceDef?.name ?? def.race;
      raceB.style.setProperty('--race-color', raceDef?.color ?? '#888');
    }
    if (rarB) { rarB.textContent = def.rarity.toUpperCase(); rarB.className = `modal-rarity-badge rarity-${def.rarity}`; }

    this._refreshModalLevelSection(cardId);

    // Stats
    const lvl = this.account.getCardLevel(cardId);
    const mult = 1 + (lvl - 1) * 0.1;
    const hp = Math.round(def.hp * mult);
    const dmg = Math.round(def.dmg * mult);
    const statsEl = document.getElementById('modal-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="ms-box"><div class="ms-val">${hp}</div><div class="ms-lbl">HP</div></div>
        <div class="ms-box"><div class="ms-val">${dmg}</div><div class="ms-lbl">DMG</div></div>
        <div class="ms-box"><div class="ms-val">${def.speed}</div><div class="ms-lbl">SPD</div></div>
        <div class="ms-box"><div class="ms-val">${def.cost}</div><div class="ms-lbl">Cost</div></div>
        <div class="ms-box"><div class="ms-val">${(def.rate / 1000).toFixed(1)}s</div><div class="ms-lbl">ATK SPD</div></div>
        <div class="ms-box"><div class="ms-val">${def.rarity[0].toUpperCase()}</div><div class="ms-lbl">Rarity</div></div>
      `;
    }

    // Desc
    const descEl = document.getElementById('modal-desc');
    if (descEl) descEl.textContent = def.desc ?? '';

    // Counter row (for enemy cards)
    const counterEl = document.getElementById('modal-counter-row');
    if (counterEl) {
      if (def.counters?.length) {
        const names = def.counters.map(id => CARD_DEFS[id]?.name ?? id).join(', ');
        counterEl.innerHTML = `Countered by: <span>${names}</span>`;
      } else { counterEl.textContent = ''; }
    }

    // Equip button
    this._refreshModalEquipBtn(cardId);
  }

  _refreshModalLevelSection(cardId) {
    const info = this.account.getLevelInfo(cardId);
    const lvlLbl = document.getElementById('modal-level-lbl');
    const fill   = document.getElementById('modal-copies-fill');
    const copLbl = document.getElementById('modal-copies-lbl');
    const upgBtn = document.getElementById('modal-upgrade-btn');
    if (!lvlLbl || !fill || !copLbl || !upgBtn) return;

    lvlLbl.textContent = `Level ${info.level}`;

    if (info.maxed) {
      fill.style.width = '100%';
      copLbl.textContent = 'MAX';
      upgBtn.disabled = true;
      upgBtn.textContent = 'MAX';
    } else {
      const progress = Math.min(info.copies / info.req.copies, 1);
      fill.style.width = `${progress * 100}%`;
      copLbl.textContent = `${info.copies}/${info.req.copies}`;
      upgBtn.disabled = !info.canLevel;
      upgBtn.textContent = info.canLevel
        ? `Upgrade · ${info.req.coins}C`
        : `Need ${info.req.copies - info.copies} more`;
    }
  }

  _refreshModalEquipBtn(cardId) {
    const def    = CARD_DEFS[cardId];
    // Use _editDeck (in-progress deck) if available, otherwise fall back to saved deck
    const deckSet = this._editDeck ?? new Set(this.account.getUser()?.deck ?? []);
    const inDeck  = deckSet.has(cardId);
    const btn     = document.getElementById('modal-equip-btn');
    if (!btn) return;
    btn.disabled  = false;
    if (inDeck) {
      btn.textContent = 'Remove';
      btn.className   = 'modal-equip-btn remove';
    } else {
      const canAdd = deckSet.size < 12;
      btn.textContent = canAdd ? 'Equip' : 'Deck Full (12)';
      btn.className   = 'modal-equip-btn';
      btn.disabled    = !canAdd;
    }
  }

  _modalEquip() {
    const id = this._modalCardId;
    if (!id) return;
    const def = CARD_DEFS[id];
    const u   = this.account.getUser();
    if (!u) return;

    // Ensure _editDeck is initialized (even if not on deck tab)
    if (!this._editDeck) this._editDeck = new Set(u.deck ?? []);

    if (this._editDeck.has(id)) {
      this._editDeck.delete(id);
    } else {
      if (this._editDeck.size >= 12) return;
      this._editDeck.add(id);
    }

    // Auto-save when deck is complete
    const arr     = [...this._editDeck];
    const eCnt    = arr.filter(id => CARD_DEFS[id]?.type === 'enemy').length;
    const tCnt    = arr.filter(id => CARD_DEFS[id]?.type === 'troop').length;
    if (arr.length === 12 && eCnt >= 2 && tCnt >= 2) this.account.saveDeck(arr);

    this._refreshModalEquipBtn(id);
    this._updateBattleTab();
    const unlocked = new Set(u.unlockedCards ?? []);
    this._redrawDeckTab(unlocked);
  }

  _modalUpgrade() {
    const id = this._modalCardId;
    if (!id) return;
    const result = this.account.levelUpCard(id);
    if (result.ok) {
      this._updateCoinDisplay();
      this._refreshModalLevelSection(id);
      // Re-render stats for new level
      const def  = CARD_DEFS[id];
      const lvl  = this.account.getCardLevel(id);
      const mult = 1 + (lvl - 1) * 0.1;
      const statsEl = document.getElementById('modal-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="ms-box"><div class="ms-val">${Math.round(def.hp * mult)}</div><div class="ms-lbl">HP</div></div>
          <div class="ms-box"><div class="ms-val">${Math.round(def.dmg * mult)}</div><div class="ms-lbl">DMG</div></div>
          <div class="ms-box"><div class="ms-val">${def.speed}</div><div class="ms-lbl">SPD</div></div>
          <div class="ms-box"><div class="ms-val">${def.cost}</div><div class="ms-lbl">Cost</div></div>
          <div class="ms-box"><div class="ms-val">${(def.rate / 1000).toFixed(1)}s</div><div class="ms-lbl">ATK SPD</div></div>
          <div class="ms-box"><div class="ms-val">${def.rarity[0].toUpperCase()}</div><div class="ms-lbl">Rarity</div></div>
        `;
      }
      // Redraw deck tab if open
      const unlocked = new Set(this.account.getUser()?.unlockedCards ?? []);
      this._redrawDeckTab(unlocked);
    }
  }

  _closeCardModal() {
    document.getElementById('card-modal')?.classList.add('hidden');
    this._modalCardId = null;
  }

  // ── Arena Modal ───────────────────────────────────────────
  _wireArenaModal() {
    document.getElementById('arena-modal-backdrop')?.addEventListener('click', () => this._closeArenaModal());
    document.getElementById('arena-modal-close')?.addEventListener('click', () => this._closeArenaModal());
  }

  _openArenaModal() {
    const modal = document.getElementById('arena-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const trophies = this.account.getUser()?.trophies ?? 0;
    const list = document.getElementById('arena-tiers-list');
    if (!list) return;
    list.innerHTML = '';

    ARENA_TIERS.forEach(tier => {
      const unlocked = trophies >= tier.min;
      const current  = trophies >= tier.min && (tier.max === Infinity || trophies <= tier.max);
      const row = document.createElement('div');
      row.className = ['arena-tier-row', current ? 'current' : '', unlocked ? 'unlocked' : ''].filter(Boolean).join(' ');

      const iconCanvas = _drawArenaIconCanvas(tier.arenaType, tier.color, 28);

      const info = document.createElement('div');
      info.className = 'arena-tier-info';
      info.innerHTML = `
        <div class="arena-tier-name" style="color:${tier.color}">${tier.name}</div>
        <div class="arena-tier-range">${tier.max === Infinity ? `${tier.min}+ trophies` : `${tier.min} – ${tier.max}`}</div>
      `;
      const badge = document.createElement('div');
      badge.className = `arena-tier-badge ${current ? 'current-lbl' : 'locked-lbl'}`;
      badge.textContent = current ? 'CURRENT' : unlocked ? 'CLEARED' : 'LOCKED';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'arena-tier-icon';
      iconWrap.appendChild(iconCanvas);

      row.appendChild(iconWrap);
      row.appendChild(info);
      row.appendChild(badge);
      list.appendChild(row);
    });
  }

  _closeArenaModal() {
    document.getElementById('arena-modal')?.classList.add('hidden');
  }

  // ── Shop tab ──────────────────────────────────────────────
  _renderShopTab() {
    const u = this.account.getUser();
    if (!u) return;
    this._updateCoinDisplay();

    const now = new Date(), midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight - now;
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    const timerEl = document.getElementById('daily-timer');
    if (timerEl) timerEl.textContent = `Resets in ${h}h ${m}m`;

    const track = document.getElementById('chest-swipe-track');
    const dotsEl = document.getElementById('chest-swipe-dots');
    if (track) {
      track.innerHTML = '';
      if (dotsEl) dotsEl.innerHTML = '';
      const trophies = u.trophies ?? 0;
      CHEST_DEFS.forEach((chest, idx) => {
        const arenaLocked = trophies < (chest.arenaMin ?? 0);
        const canAfford   = !arenaLocked && (u.coins ?? 0) >= chest.cost;
        const aLevel      = chest.arenaLevel ?? 0;

        // Cards available in this chest
        const possibleCards = Object.values(CARD_DEFS).filter(d =>
          (d.arenaUnlock ?? 0) === aLevel || ((d.arenaUnlock ?? 0) < aLevel && !Object.values(CARD_DEFS).some(d2 => (d2.arenaUnlock ?? 0) === aLevel))
        );
        const arenaCards = Object.values(CARD_DEFS).filter(d => (d.arenaUnlock ?? 0) === aLevel);
        const showCards  = arenaCards.length > 0 ? arenaCards : possibleCards;

        const item = document.createElement('div');
        item.className = 'chest-swipe-item';

        const card = document.createElement('div');
        card.className = 'chest-card';
        card.style.setProperty('border-color', arenaLocked ? 'rgba(255,255,255,0.08)' : `${chest.glow}55`);

        // Chest icon canvas
        const iconCanvas = _drawChestIcon(chest, 64);

        // Possible cards grid
        const possibleHtml = showCards.map(d => `
          <div class="chest-possible-card">
            <div class="chest-possible-card-thumb" data-cardid="${d.id}"></div>
            <div class="chest-possible-card-name">${d.name}</div>
          </div>
        `).join('');

        card.innerHTML = `
          <div class="chest-name" style="color:${chest.glow}">${chest.name} Chest</div>
          <div class="chest-arena-badge">${arenaLocked ? '🔒 ' + chest.arenaMin + ' trophies req.' : 'Arena unlocked'}</div>
          <div class="chest-desc">${chest.desc ?? ''}</div>
          <div class="chest-slots">${chest.slots.map(r => `<span class="rarity-dot rarity-${r[0]}">${r[0][0].toUpperCase()}</span>`).join('')}</div>
          ${showCards.length ? `
            <div class="chest-possible-cards">
              <div class="chest-possible-label">Possible cards</div>
              <div class="chest-possible-grid">${possibleHtml}</div>
            </div>` : ''}
          <button class="chest-buy-btn ${canAfford ? '' : 'disabled'}">
            ${arenaLocked ? 'Locked' : `Buy · ${chest.cost} coins`}
          </button>
        `;

        card.prepend(iconCanvas);

        // Attach card thumbnails
        card.querySelectorAll('.chest-possible-card-thumb').forEach(el => {
          const cid = el.dataset.cardid;
          if (cid) el.appendChild(cardThumbCanvas(cid, 36));
        });

        card.querySelector('.chest-buy-btn')?.addEventListener('click', () => {
          if (!canAfford || arenaLocked) return;
          const result = this.account.openChest(chest.id);
          if (result.ok) {
            this._showChestResult(result.results);
            this._renderShopTab();
          }
        });

        item.appendChild(card);
        track.appendChild(item);

        // Dot indicator
        if (dotsEl) {
          const dot = document.createElement('div');
          dot.className = 'chest-swipe-dot' + (idx === 0 ? ' active' : '');
          dotsEl.appendChild(dot);
        }
      });

      // Update active dot on scroll
      track.addEventListener('scroll', () => {
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dotsEl?.querySelectorAll('.chest-swipe-dot').forEach((d, i) =>
          d.classList.toggle('active', i === idx));
      }, { passive: true });
    }

    const dailyGrid = document.getElementById('daily-shop-grid');
    if (dailyGrid) {
      dailyGrid.innerHTML = '';
      for (const item of this.account.getDailyShop()) {
        const canAfford = (u.coins ?? 0) >= item.price;
        const el = document.createElement('div');
        el.className = ['shop-card', `rarity-${item.def.rarity}`, item.owned ? 'owned' : '', item.bought ? 'bought' : ''].filter(Boolean).join(' ');
        const scRaceCol = RACE_DEFS[item.def.race]?.color ?? '#888';
        el.style.setProperty('--race-color', scRaceCol);
        el.innerHTML = `
          <div class="sc-cost">${item.def.cost}</div>
          <div class="sc-icon"></div>
          <div class="sc-name">${item.def.name}</div>
          <div class="sc-race">${RACE_DEFS[item.def.race]?.name ?? ''}</div>
          ${item.bought ? '<div class="sc-status">Bought</div>' :
            item.owned  ? '<div class="sc-status owned-lbl">Get Copy</div>' :
            `<button class="sc-buy-btn ${canAfford ? '' : 'no-coins'}">C ${item.price}</button>`}
        `;
        el.querySelector('.sc-icon').appendChild(cardThumbCanvas(item.id, 40));
        el.querySelector('.sc-buy-btn')?.addEventListener('click', () => {
          if (!canAfford) return;
          const result = this.account.buyShopCard(item.id);
          if (result.ok) { this._updateCoinDisplay(); this._renderShopTab(); }
        });
        dailyGrid.appendChild(el);
      }
    }
  }

  _showChestResult(results) {
    const copyLines = results
      .filter(r => r.type === 'card')
      .map(r => `+1 ${CARD_DEFS[r.id]?.name ?? r.id} copy`);
    const coins = results.filter(r => r.type === 'coins').reduce((a, r) => a + r.amount, 0);
    let msg = copyLines.join('\n');
    if (coins) msg += (msg ? '\n' : '') + `Coin refund: ${coins}`;
    if (!msg)  msg = 'Chest opened!';
    setTimeout(() => alert(msg), 50);
  }

  // ── Matchmaking ───────────────────────────────────────────
  _startMatchmaking() {
    const u = this.account.getUser();
    if (!u) return;
    const deck    = u.deck ?? [];
    const enemies = deck.filter(id => CARD_DEFS[id]?.type === 'enemy').length;
    const troops  = deck.filter(id => CARD_DEFS[id]?.type === 'troop').length;
    if (deck.length !== 12 || enemies < 2 || troops < 2) {
      const warning = document.getElementById('battle-deck-warning');
      if (warning) { warning.classList.remove('hidden'); setTimeout(() => warning.classList.add('hidden'), 3000); }
      return;
    }

    this._stopLobbyParticles();
    this.ui.show('matchmaking');
    this.ui.startMatchmakingTimer();

    this.net = new LocalBot();
    this.net
      .on(MSG.MATCH_FOUND,  msg => this._onMatchFound(msg))
      .on(MSG.OPP_DEPLOY,   msg => this._onOppDeploy(msg))
      .on(MSG.GAME_OVER,    msg => this._onGameOver(msg))
      .on(MSG.DISCONNECTED, ()  => this._onDisconnect());
    this.net.findMatch();
  }

  _wireMatchmakingUI() {
    document.getElementById('btn-cancel-match')?.addEventListener('click', () => {
      this.net?.cancelMatch();
      this.ui.stopMatchmakingTimer();
      this.ui.show('menu');
    });
  }

  _onMatchFound(msg) {
    this.ui.stopMatchmakingTimer();
    this._beginGame(msg.oppName ?? 'Opponent');
  }

  // ── Game lifecycle ─────────────────────────────────────────
  _beginGame(oppName) {
    this.state        = new State();
    this.state.oppName = oppName;
    this._active      = true;

    this.economy.reset();
    this.economy.onChange = () => this.hand?.updateAffordability();

    const deckIds = this.account.getUser()?.deck ?? STARTER_DECK;
    this.hand = new Hand(
      this.economy, deckIds,
      (cardId, lane, target) => {
        const def = CARD_DEFS[cardId];
        if (def?.type === 'spell') {
          this._castSpell(cardId, target);
        } else {
          this._spawnUnit(cardId, 'ply', lane);
          this.net?.deploy(cardId, lane);
          this.state.stats.units++;
        }
      },
      { getLevel: id => this.account.getCardLevel(id) }
    );
    this.hand.deal();

    this.ui.setOpponentName(oppName);
    this.ui.show('game');
    this._resize();
    this.loop.start();
  }

  async _endGame(won) {
    this._active = false;
    this.loop.stop();

    const s = this.state.stats;
    const plyTowersDead = Object.values(this.state.towers).filter(t => t.owner === 'ply' && t.dead).length;
    const oppTowersDead = Object.values(this.state.towers).filter(t => t.owner === 'opp' && t.dead).length;

    await this.account.updateStats(won, this._coinMode);
    this._updateCoinDisplay();
    this.ui.updateProfile(this.account.getUser());
    this.ui.showResult({
      won, crownsFor: oppTowersDead, crownsAgainst: plyTowersDead,
      units: s.units, damage: Math.round(s.damage), towers: oppTowersDead,
    });
  }

  // ── Result ─────────────────────────────────────────────────
  _wireResultUI() {
    document.getElementById('btn-result-battle')?.addEventListener('click', () => this._startMatchmaking());
    document.getElementById('btn-result-menu')?.addEventListener('click',   () => this._showMenu());
  }

  // ── Network events ─────────────────────────────────────────
  _onOppDeploy(msg) {
    if (!this._active) return;
    this._spawnUnit(msg.cardId, 'opp', msg.lane);
  }

  _onGameOver(msg) {
    if (!this._active) return;
    this._endGame(msg.winner === 'ply');
  }

  _onDisconnect() {
    if (!this._active) return;
    this._endGame(false);
    alert('Lost connection to server.');
  }

  // ── Spell casting ─────────────────────────────────────────
  _castSpell(cardId, target) {
    const def = CARD_DEFS[cardId];
    if (!def || def.type !== 'spell') return;
    const s  = def.special;
    const cx = target?.x ?? CW / 2;
    const cy = target?.y ?? 560;

    if (s.type === 'spell_aoe') {
      for (const u of this.state.units) {
        if (u.dead || u.owner === 'ply') continue;
        if (dist(cx, cy, u.x, u.y) <= s.radius) {
          const dmg = u.takeDamage(s.dmg);
          this.state.stats.damage += dmg;
          this.particles.burst(u.x, u.y, 5, { color: def.color, speedLo: 40, speedHi: 120 });
        }
      }
      for (const t of Object.values(this.state.towers)) {
        if (t.owner !== 'opp' || t.dead) continue;
        if (dist(cx, cy, t.x, t.y) <= s.radius) {
          const destroyed = t.takeDamage(s.dmg);
          this._onTowerHit(t, s.dmg, destroyed);
        }
      }
      this.particles.burst(cx, cy, 30, { color: def.color, speedLo: 80, speedHi: 300, rLo: 4, rHi: 11 });
    }

    else if (s.type === 'spell_stun') {
      for (const u of this.state.units) {
        if (u.dead || u.owner === 'ply') continue;
        if (dist(cx, cy, u.x, u.y) <= s.radius) {
          if (s.dmg) { const dmg = u.takeDamage(s.dmg); this.state.stats.damage += dmg; }
          u.stun(s.stunMs);
          this.particles.burst(u.x, u.y, 4, { color: def.color, speedLo: 20, speedHi: 80 });
        }
      }
      this.particles.burst(cx, cy, 18, { color: def.color, speedLo: 60, speedHi: 200, rLo: 3, rHi: 8 });
    }

    else if (s.type === 'spell_tornado') {
      this.state.activeSpells.push({
        type: 'tornado', x: cx, y: cy,
        radius: s.radius, strength: s.strength,
        duration: s.duration, elapsed: 0,
        dmgPerSec: s.dmg, color: def.color,
      });
      this.particles.burst(cx, cy, 22, { color: def.color, speedLo: 60, speedHi: 180, rLo: 2, rHi: 6 });
    }
  }

  _updateActiveSpells(dt) {
    const spells = this.state.activeSpells;
    for (let i = spells.length - 1; i >= 0; i--) {
      const sp = spells[i];
      sp.elapsed += dt * 1000;
      if (sp.type === 'tornado') {
        for (const u of this.state.units) {
          if (u.dead || u.owner === 'ply') continue;
          const d = dist(sp.x, sp.y, u.x, u.y);
          if (d <= sp.radius) {
            const dx = (sp.x - u.x) / (d || 1);
            const dy = (sp.y - u.y) / (d || 1);
            u.x += dx * sp.strength * dt;
            u.y += dy * sp.strength * dt;
            if (sp.dmgPerSec) {
              const dmg = u.takeDamage(sp.dmgPerSec * dt);
              this.state.stats.damage += dmg;
            }
          }
        }
        if (Math.random() < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * sp.radius * 0.7;
          this.particles.burst(sp.x + Math.cos(angle) * r, sp.y + Math.sin(angle) * r,
            2, { color: sp.color, speedLo: 20, speedHi: 60, rLo: 1, rHi: 3 });
        }
      }
      if (sp.elapsed >= sp.duration) spells.splice(i, 1);
    }
  }

  // ── Spawn unit ─────────────────────────────────────────────
  _spawnUnit(cardId, owner, lane) {
    const def = CARD_DEFS[cardId];
    if (!def) return;

    const levelMult = owner === 'ply' ? this.account.getLevelMult(cardId) : 1;

    if (def.special?.type === 'pack') {
      const count = def.special.count;
      for (let i = 0; i < count; i++) {
        const u = new Unit(cardId, owner, lane, levelMult);
        u.x += (i - Math.floor(count / 2)) * (u.r * 2.2);
        this.state.units.push(u);
      }
    } else {
      this.state.units.push(new Unit(cardId, owner, lane, levelMult));
    }
  }

  // ── Main update ────────────────────────────────────────────
  _update(dt) {
    if (!this._active || !this.state) return;

    this.renderer.tickTime(dt);
    this.economy.tick(dt, this.state.overtime);
    this.particles.update(dt);
    this.account.tickPlaytime(dt * 1000);

    this.state.timeLeft -= dt;
    if (this.state.timeLeft <= 0 && !this.state.overtime) {
      this.state.timeLeft = 0;
      this._checkTimeoutWinner();
      return;
    }
    if (this.state.overtime) this.state.timeLeft = Math.min(this.state.timeLeft + dt, 30);

    this._updateActiveSpells(dt);
    this._updateAuras();
    this._updateUnits(dt);
    this._updateTowers(dt);
    this._updateProjectiles(dt);
    this._cleanDead();
  }

  _updateAuras() {
    for (const u of this.state.units) {
      u.shielded = false; u.healRate = 0; u.dmgMult = 1; u.spdMult = 1;
    }
    for (const src of this.state.units) {
      if (src.dead || !src.special) continue;
      const { type } = src.special;
      if (!['shield_aura', 'heal_aura', 'boost_aura'].includes(type)) continue;
      for (const tgt of this.state.units) {
        if (tgt.dead || tgt.owner !== src.owner || tgt === src) continue;
        if (dist(src.x, src.y, tgt.x, tgt.y) > src.special.auraR) continue;
        if (type === 'shield_aura') tgt.shielded = true;
        if (type === 'heal_aura')   tgt.healRate += src.special.hps;
        if (type === 'boost_aura')  { tgt.dmgMult *= src.special.dmgMult; tgt.spdMult *= src.special.spdMult; }
      }
    }
    for (const u of this.state.units) {
      if (!u.dead && u.healRate > 0) u.hp = Math.min(u.maxHp, u.hp + u.healRate * 0.016);
    }
  }

  _updateUnits(dt) {
    for (const u of this.state.units) {
      if (u.dead) continue;
      if (u.special?.type === 'income' && u.owner === 'ply') {
        u.incomeTimer += dt * 1000;
        if (u.incomeTimer >= u.special.intervalMs) {
          u.incomeTimer -= u.special.intervalMs;
          this.economy.add(u.special.elixirRate);
        }
      }
      const result = u.update(dt, this.state.units, this.state.towers);
      if (!result) continue;
      if (result.action === 'attack') {
        this._processAttack(u, result.target);
      } else if (result.action === 'spawn_minion') {
        const minion = new Unit(result.defId, u.owner, u.lane);
        minion.x = u.x + u.dir * (u.r + minion.r + 4);
        minion.y = u.y;
        this.state.units.push(minion);
      }
    }
  }

  _processAttack(attacker, target) {
    const s = attacker.special;
    if (s?.type === 'kamikaze') {
      for (const u of this.state.units) {
        if (u.dead || u.owner === attacker.owner) continue;
        if (dist(attacker.x, attacker.y, u.x, u.y) <= s.blastR) {
          const dmg = u.takeDamage(s.blastDmg * attacker.dmgMult ?? 1);
          u.stun(s.stunMs);
          if (attacker.owner === 'ply') this.state.stats.damage += dmg;
        }
      }
      this.particles.burst(attacker.x, attacker.y, 22, { color: '#fbbf24', speedLo: 80, speedHi: 220 });
      attacker.dead = true;
      return;
    }
    if (s?.type === 'splash') {
      const hitSet = new Set();
      for (const u of this.state.units) {
        if (u.dead || u.owner === attacker.owner) continue;
        if (dist(target.x, target.y, u.x, u.y) <= s.splashR) hitSet.add(u);
      }
      if (target instanceof Tower && !target.dead) {
        const destroyed = target.takeDamage(attacker.dmg);
        if (attacker.owner === 'ply') this._onTowerHit(target, attacker.dmg, destroyed);
        this.particles.burst(target.x, target.y, 5, { color: '#22d3ee', speedLo: 40, speedHi: 120 });
      }
      for (const u of hitSet) {
        const dmg = u.takeDamage(attacker.dmg);
        if (attacker.owner === 'ply') this.state.stats.damage += dmg;
        this.particles.burst(u.x, u.y, 4, { color: '#22d3ee', speedLo: 30, speedHi: 80 });
      }
      return;
    }
    // Single-target projectile
    const proj = new Projectile(
      attacker.x, attacker.y, target.id,
      attacker.dmg, 420,
      { color: attacker.glow, r: 4, fromTower: false }
    );
    proj._attackerOwner = attacker.owner;
    this.state.projectiles.push(proj);
  }

  _updateTowers(dt) {
    for (const t of Object.values(this.state.towers)) {
      const result = t.update(dt, this.state.units);
      if (!result) continue;
      const proj = new Projectile(
        t.x, t.y, result.target.id, t.dmg, 500,
        { color: t.owner === 'opp' ? '#f87171' : '#60a5fa', r: 5, fromTower: true }
      );
      proj._attackerOwner = t.owner;
      proj._towerId = t.id;
      this.state.projectiles.push(proj);
    }
  }

  _updateProjectiles(dt) {
    for (const proj of this.state.projectiles) {
      if (proj.dead) continue;
      const target = this._findById(proj.targetId);
      const hit    = proj.update(dt, target);
      if (hit && target && !target.dead) this._applyProjectileHit(proj, target);
    }
  }

  _findById(id) {
    for (const u of this.state.units) { if (u.id === id) return u; }
    for (const t of Object.values(this.state.towers)) { if (t.id === id) return t; }
    return null;
  }

  _applyProjectileHit(proj, target) {
    if (target instanceof Tower) {
      const destroyed = target.takeDamage(proj.dmg);
      if (proj._attackerOwner === 'ply') this._onTowerHit(target, proj.dmg, destroyed);
    } else {
      const dmg = target.takeDamage(proj.dmg);
      if (proj._attackerOwner === 'ply') this.state.stats.damage += dmg;
      this.particles.burst(target.x, target.y, 4, { color: proj.color, speedLo: 40, speedHi: 100, rLo: 2, rHi: 4 });
    }
  }

  _onTowerHit(tower, dmg, destroyed) {
    this.state.stats.damage += dmg;
    if (destroyed) {
      this.state.stats.towers++;
      this.particles.burst(tower.x, tower.y, 28, { color: '#f97316', speedLo: 60, speedHi: 260, rLo: 3, rHi: 8 });
      if (tower.id === 'oppKing') { this._endGame(true); }
    }
    const plyKing = this.state.towers['plyKing'];
    if (plyKing?.dead) { this._endGame(false); }
  }

  _checkTimeoutWinner() {
    const plyDead = Object.values(this.state.towers).filter(t => t.owner === 'ply' && t.dead).length;
    const oppDead = Object.values(this.state.towers).filter(t => t.owner === 'opp' && t.dead).length;
    if (oppDead > plyDead)     { this._endGame(true);  return; }
    if (plyDead > oppDead)     { this._endGame(false); return; }
    this.state.overtime  = true;
    this.state.timeLeft  = 30;
  }

  _cleanDead() {
    this.state.units       = this.state.units.filter(u => !u.dead);
    this.state.projectiles = this.state.projectiles.filter(p => !p.dead);
  }

  // ── Render ──────────────────────────────────────────────────
  _render() {
    if (!this.state) return;
    this.renderer.frame(this.state, this.particles);
  }

  // ── Friends Panel ──────────────────────────────────────────
  _wireFriendsPanel() {
    document.getElementById('btn-friends')?.addEventListener('click', () => this._openFriendsPanel());
    document.getElementById('friends-panel-close')?.addEventListener('click', () => this._closeFriendsPanel());
    document.getElementById('btn-send-friend')?.addEventListener('click', () => this._sendFriendRequest());
    document.getElementById('friend-tag-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._sendFriendRequest(); });
    document.getElementById('btn-view-requests')?.addEventListener('click', () => {
      this._switchFriendsTab('requests');
    });
    document.querySelectorAll('.friends-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchFriendsTab(btn.dataset.ftab));
    });
  }

  _openFriendsPanel() {
    const panel = document.getElementById('friends-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    this._renderFriendsPanel();
  }

  _closeFriendsPanel() {
    document.getElementById('friends-panel')?.classList.add('hidden');
  }

  _switchFriendsTab(tab) {
    document.querySelectorAll('.friends-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.ftab === tab));
    document.getElementById('friends-list-panel')?.classList.toggle('hidden', tab !== 'list');
    document.getElementById('friends-requests-panel')?.classList.toggle('hidden', tab !== 'requests');
  }

  _sendFriendRequest() {
    const input = document.getElementById('friend-tag-input');
    const msgEl = document.getElementById('friend-add-msg');
    const tag   = input?.value.trim().toUpperCase();
    if (!tag) return;
    const result = this.account.sendFriendRequest(tag);
    if (msgEl) {
      msgEl.textContent = result.ok ? 'Request sent!' : (result.err ?? 'Error');
      msgEl.className   = 'friend-add-msg ' + (result.ok ? 'success' : 'error');
      setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'friend-add-msg'; }, 3000);
    }
    if (result.ok && input) input.value = '';
  }

  _renderFriendsPanel() {
    const u = this.account.getUser();
    if (!u) return;

    const friends  = u.friends ?? [];
    const requests = u.pendingRequests ?? [];

    // Count badges
    const fCountEl = document.getElementById('friends-count');
    const rCountEl = document.getElementById('requests-count');
    if (fCountEl) fCountEl.textContent = friends.length;
    if (rCountEl) rCountEl.textContent = requests.length;

    // Pending banner
    const banner = document.getElementById('pending-requests-banner');
    const pCount = document.getElementById('pending-requests-count');
    if (banner) banner.classList.toggle('hidden', requests.length === 0);
    if (pCount) pCount.textContent = requests.length === 1
      ? '1 friend request is waiting!'
      : `${requests.length} friend requests are waiting!`;

    // Friends list
    const listEl  = document.getElementById('friends-list-items');
    const emptyEl = document.getElementById('friends-empty-msg');
    if (listEl) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = friends.length ? 'none' : '';
      for (const f of friends) {
        const row = document.createElement('div');
        row.className = 'friend-row';
        row.innerHTML = `
          <div class="friend-avatar">${(f.username?.[0] ?? '?').toUpperCase()}</div>
          <div class="friend-info">
            <div class="friend-name">${f.username}</div>
            <div class="friend-tag">${f.tag ?? ''}</div>
          </div>
          <div class="friend-actions">
            <button class="friend-remove-btn">Remove</button>
          </div>
        `;
        row.querySelector('.friend-remove-btn')?.addEventListener('click', () => {
          this.account.removeFriend(f.tag);
          this._renderFriendsPanel();
          this._updateFriendsBadge();
        });
        listEl.appendChild(row);
      }
    }

    // Requests list
    const reqListEl  = document.getElementById('requests-list-items');
    const reqEmptyEl = document.getElementById('requests-empty-msg');
    if (reqListEl) {
      reqListEl.innerHTML = '';
      if (reqEmptyEl) reqEmptyEl.style.display = requests.length ? 'none' : '';
      for (const r of requests) {
        const row = document.createElement('div');
        row.className = 'request-row';
        row.innerHTML = `
          <div class="friend-avatar">${(r.username?.[0] ?? '?').toUpperCase()}</div>
          <div class="friend-info">
            <div class="friend-name">${r.username}</div>
            <div class="friend-tag">${r.tag ?? ''}</div>
          </div>
          <div class="friend-actions">
            <button class="request-accept-btn">Accept</button>
            <button class="request-decline-btn">Decline</button>
          </div>
        `;
        row.querySelector('.request-accept-btn')?.addEventListener('click', () => {
          this.account.acceptFriendRequest(r.tag);
          this._renderFriendsPanel();
          this._updateFriendsBadge();
        });
        row.querySelector('.request-decline-btn')?.addEventListener('click', () => {
          this.account.declineFriendRequest(r.tag);
          this._renderFriendsPanel();
          this._updateFriendsBadge();
        });
        reqListEl.appendChild(row);
      }
    }
  }

  // ── Coin Modes ─────────────────────────────────────────────
  _wireModes() {
    document.getElementById('btn-modes')?.addEventListener('click', () => {
      document.getElementById('modes-modal')?.classList.remove('hidden');
    });
    document.getElementById('modes-modal-backdrop')?.addEventListener('click', () => {
      document.getElementById('modes-modal')?.classList.add('hidden');
    });
    document.getElementById('modes-modal-close')?.addEventListener('click', () => {
      document.getElementById('modes-modal')?.classList.add('hidden');
    });
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.mult;
        this._coinMode = v === 'inf' ? Infinity : Number(v);
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('modes-modal')?.classList.add('hidden');
        this._updateModeDisplay();
      });
    });
  }

  _updateModeDisplay() {
    const el = document.getElementById('modes-current');
    if (!el) return;
    if (this._coinMode === Infinity) el.textContent = '∞ Coins';
    else if (this._coinMode === 1)   el.textContent = 'Normal';
    else                              el.textContent = `${this._coinMode}× Coins`;
  }

  _updateFriendsBadge() {
    const badge  = document.getElementById('friends-badge');
    const hasPending = this.account.hasPendingRequests();
    if (badge) badge.classList.toggle('hidden', !hasPending);
  }

  // ── Lobby particles ────────────────────────────────────────
  _startLobbyParticles() {
    if (this._lobbyParticlesId) return;
    const canvas = document.getElementById('lobby-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#7bc8f0', '#f5c518', '#a78bfa', '#34d399', '#60a5fa'];
    const count  = 32;
    const pts    = Array.from({ length: count }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     1.5 + Math.random() * 3,
      vx:    (Math.random() - 0.5) * 18,
      vy:    -(6 + Math.random() * 14),
      alpha: 0.2 + Math.random() * 0.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
    }));

    const tick = () => {
      if (!this._lobbyParticlesId) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dt = 0.016;
      for (const p of pts) {
        p.wobble += dt * 1.2;
        p.x      += p.vx * dt + Math.sin(p.wobble) * 0.5;
        p.y      += p.vy * dt;
        if (p.y < -10) {
          p.y     = canvas.height + 5;
          p.x     = Math.random() * canvas.width;
          p.alpha = 0.2 + Math.random() * 0.5;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha * Math.max(0, Math.min(1, (canvas.height - p.y) / 80));
        ctx.shadowBlur  = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this._lobbyParticlesId = requestAnimationFrame(tick);
    };
    this._lobbyParticlesId = requestAnimationFrame(tick);
  }

  _stopLobbyParticles() {
    if (this._lobbyParticlesId) {
      cancelAnimationFrame(this._lobbyParticlesId);
      this._lobbyParticlesId = null;
    }
  }

  // ── Input: canvas deploy ───────────────────────────────────
  _wireCanvasDeploy() {
    this.canvas.addEventListener('click', e => {
      if (!this._active || !this.hand?.hasSelected()) return;
      const def = this.hand.selectedDef();
      if (!def) return;

      const rect  = this.canvas.getBoundingClientRect();
      const scale = this.renderer.scale;
      const cx    = (e.clientX - rect.left)  / scale;
      const cy    = (e.clientY - rect.top)   / scale;

      const isPlayerHalf = cy > 460;
      const isOppHalf    = cy < 420;

      const lane = cx < CW / 2 ? 0 : 1;

      if (def.type === 'spell') {
        this.hand.tryDeploy(lane, { x: cx, y: cy });
        return;
      }

      if ((def.type === 'troop' || def.type === 'building') && !isPlayerHalf) {
        this.ui.showDeployHint(true);
        setTimeout(() => this.ui.showDeployHint(false), 1500);
        return;
      }
      if (def.type === 'enemy' && !isOppHalf) {
        this.ui.showDeployHint(true);
        setTimeout(() => this.ui.showDeployHint(false), 1500);
        return;
      }

      this.hand.tryDeploy(lane);
    });

    window.addEventListener('keydown', e => {
      if (!this._active) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) this.hand?.select(n - 1);
      if (e.key === 'q' || e.key === 'Q') this._keyDeploy(0);
      if (e.key === 'w' || e.key === 'W') this._keyDeploy(1);
    });
  }

  _keyDeploy(lane) {
    if (!this.hand?.hasSelected()) return;
    this.hand.tryDeploy(lane);
  }

  _wireGameInput() {}

  // ── Resize ─────────────────────────────────────────────────
  _resize() {
    const hud  = document.getElementById('game-hud');
    const hudH = hud?.offsetHeight ?? 140;
    const avW  = window.innerWidth;
    const avH  = window.innerHeight - hudH;
    this.renderer.resize(avW, avH);
  }
}

// ── Boot ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => { window._game = new Game(); });

// ── Arena icon canvas helper ────────────────────────────────
function _drawArenaIconCanvas(arenaType, color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = size * 0.1;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  switch (arenaType) {
    case 'iron': { // crossed swords
      ctx.beginPath(); ctx.moveTo(cx-r,cy+r); ctx.lineTo(cx+r,cy-r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+r,cy+r); ctx.lineTo(cx-r,cy-r); ctx.stroke();
      break; }
    case 'stone': { // mountain peaks
      ctx.beginPath();
      ctx.moveTo(cx-r,cy+r*0.7); ctx.lineTo(cx-r*0.2,cy-r*0.7); ctx.lineTo(cx+r*0.4,cy+r*0.7);
      ctx.moveTo(cx+r*0.1,cy+r*0.7); ctx.lineTo(cx+r,cy-r*0.4); ctx.lineTo(cx+r*1.1,cy+r*0.7);
      ctx.stroke(); break; }
    case 'ash': { // flame
      ctx.beginPath();
      ctx.moveTo(cx,cy+r); ctx.bezierCurveTo(cx-r,cy,cx-r,cy-r*0.5,cx,cy-r);
      ctx.bezierCurveTo(cx+r*0.3,cy-r*0.5,cx+r*0.6,cy-r*0.8,cx+r*0.3,cy-r*1.1);
      ctx.bezierCurveTo(cx+r*0.8,cy-r*0.5,cx+r,cy,cx,cy+r);
      ctx.fill(); break; }
    case 'void': { // gem/diamond
      ctx.beginPath();
      ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r,cy-r*0.2);
      ctx.lineTo(cx+r*0.6,cy+r); ctx.lineTo(cx-r*0.6,cy+r);
      ctx.lineTo(cx-r,cy-r*0.2); ctx.closePath(); ctx.stroke(); break; }
    case 'arcane': { // star
      for (let i = 0; i < 5; i++) {
        const a1 = (i/5)*Math.PI*2 - Math.PI/2;
        const a2 = a1 + Math.PI/5;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(a1)*r, cy+Math.sin(a1)*r);
        ctx.lineTo(cx+Math.cos(a2)*r*0.4, cy+Math.sin(a2)*r*0.4);
        ctx.fill();
      } break; }
    case 'sky': { // cloud with lightning
      ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.1,r*0.45,Math.PI,0,false);
      ctx.arc(cx+r*0.3,cy-r*0.2,r*0.32,Math.PI,0,false);
      ctx.arc(cx+r*0.6,cy+r*0.05,r*0.28,0,Math.PI,false);
      ctx.arc(cx-r*0.6,cy+r*0.05,r*0.28,0,Math.PI,false);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(cx+r*0.1,cy+r*0.15); ctx.lineTo(cx-r*0.15,cy+r*0.65);
      ctx.lineTo(cx+r*0.08,cy+r*0.55); ctx.lineTo(cx-r*0.12,cy+r);
      ctx.lineTo(cx+r*0.25,cy+r*0.5); ctx.lineTo(cx+r*0.05,cy+r*0.62);
      ctx.closePath(); ctx.fill();
      break; }
    default:
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }
  return c;
}

// ── Chest icon canvas helper ────────────────────────────────
function _drawChestIcon(chest, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size/2, cy = size/2;
  const w = size*0.72, h = size*0.52, x = cx-w/2, y = cy-h/2+size*0.06;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cx,cy+h*0.62,w*0.42,h*0.15,0,0,Math.PI*2); ctx.fill();

  // Body
  ctx.fillStyle = chest.color;
  _rrectCtx(ctx, x, y+h*0.42, w, h*0.58, size*0.06); ctx.fill();

  // Lid
  ctx.fillStyle = _lightenHex(chest.color, 25);
  _rrectCtx(ctx, x, y, w, h*0.46, size*0.06); ctx.fill();

  // Lid detail line
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = size*0.03;
  ctx.beginPath(); ctx.moveTo(x+size*0.04, y+h*0.42); ctx.lineTo(x+w-size*0.04, y+h*0.42); ctx.stroke();

  // Lock
  ctx.fillStyle = chest.glow;
  ctx.beginPath(); ctx.arc(cx, y+h*0.52, size*0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = chest.glow;
  ctx.lineWidth = size*0.055;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, y+h*0.38, size*0.09, Math.PI, 0); ctx.stroke();

  // Glow
  ctx.save();
  ctx.shadowBlur = size*0.3; ctx.shadowColor = chest.glow;
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = chest.glow;
  ctx.beginPath(); ctx.arc(cx,cy,size*0.15,0,Math.PI*2); ctx.fill();
  ctx.restore();

  return c;
}

function _rrectCtx(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
  ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r);
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);
  ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r);
  ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

function _lightenHex(hex, amt) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (num>>16)+amt);
  const g = Math.min(255, ((num>>8)&0xff)+amt);
  const b = Math.min(255, (num&0xff)+amt);
  return `rgb(${r},${g},${b})`;
}
