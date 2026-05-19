import { DEV_MODE }               from './config.js';
import { CARD_DEFS, MATCH_DURATION, CW, CHEST_DEFS, STARTER_DECK, RACE_DEFS } from './data.js';
import { cardThumbCanvas } from './cardart.js';
import { GameLoop, Particles, dist } from './engine.js';
import { Unit, Tower, Projectile, buildTowers } from './entities.js';
import { Economy }                  from './economy.js';
import { Hand }                     from './cards.js';
import { Renderer }                 from './renderer.js';
import { UI }                       from './ui.js';
import { Account }                  from './account.js';
import { LocalBot, NetworkClient, MSG } from './network.js';

// ── Game state container ────────────────────────────────────
class State {
  constructor() {
    this.units       = [];
    this.projectiles = [];
    this.towers      = buildTowers();
    this.timeLeft    = MATCH_DURATION;
    this.overtime    = false;
    this.oppName     = '';
    this.stats       = { units: 0, damage: 0, towers: 0 };
  }
}

// ── Main Game class ─────────────────────────────────────────
class Game {
  constructor() {
    this.canvas   = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.ui       = new UI();
    this.account  = new Account();
    this.economy  = new Economy();
    this.particles= new Particles();
    this.loop     = new GameLoop(dt => this._update(dt), () => this._render());
    this.net      = null;  // set when match starts
    this.hand     = null;
    this.state    = null;
    this._active  = false;

    this._wireAuthUI();
    this._wireMenuUI();
    this._wireMatchmakingUI();
    this._wireGameInput();
    this._wireResultUI();
    this._wireCanvasDeploy();

    this._editDeck = null;

    // Show loading → then real initial screen
    this.ui.show('loading');
    setTimeout(() => {
      if (this.account.isLoggedIn()) {
        this._showMenu();
      } else {
        this.ui.show('auth');
      }
    }, 600);

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  // ── Auth ──────────────────────────────────────────────────
  _wireAuthUI() {
    // Tab switching
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
    try {
      await this.account.login(user, pass);
      this._showMenu();
    } catch (e) { this.ui.setAuthError(e.message); }
  }

  async _doRegister() {
    const user    = document.getElementById('reg-username')?.value.trim();
    const pass    = document.getElementById('reg-password')?.value;
    const confirm = document.getElementById('reg-confirm')?.value;
    if (!user || !pass) { this.ui.setAuthError('Fill in all fields.'); return; }
    if (pass.length < 6)  { this.ui.setAuthError('Password must be 6+ characters.'); return; }
    if (pass !== confirm) { this.ui.setAuthError('Passwords do not match.'); return; }
    try {
      await this.account.register(user, pass);
      this._showMenu();
    } catch (e) { this.ui.setAuthError(e.message); }
  }

  // ── Menu ──────────────────────────────────────────────────
  _showMenu() {
    const u = this.account.getUser();
    if (u) this.ui.updateProfile(u);
    this._updateCoinDisplay();
    // Reset to battle tab
    document.querySelectorAll('.menu-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'battle'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-battle'));
    this.ui.show('menu');
  }

  _wireMenuUI() {
    // Tab switching
    document.querySelectorAll('.menu-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.menu-tab').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
        if (tab === 'profile') this._renderProfileTab();
        if (tab === 'deck')    this._renderDeckTab();
        if (tab === 'shop')    this._renderShopTab();
      });
    });

    document.getElementById('btn-battle')?.addEventListener('click', () => this._startMatchmaking());
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      this.account.logout();
      this.ui.show('auth');
    });
    document.getElementById('btn-save-deck')?.addEventListener('click', () => this._saveDeck());
  }

  _updateCoinDisplay() {
    const u = this.account.getUser();
    const el = document.getElementById('coin-count');
    if (el) el.textContent = u?.coins ?? 0;
  }

  _renderProfileTab() {
    const u = this.account.getUser();
    if (!u) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('profile-username', u.username);
    set('pstat-trophies', u.trophies ?? 0);
    set('pstat-wins',     u.wins ?? 0);
    set('pstat-losses',   u.losses ?? 0);
    set('pstat-games',    (u.wins ?? 0) + (u.losses ?? 0));
    const wr = (u.wins + u.losses) > 0
      ? Math.round((u.wins / (u.wins + u.losses)) * 100) + '%' : '--';
    set('pstat-wr', wr);
    const t = u.trophies ?? 0;
    const arena = t < 250 ? 'Training' : t < 500 ? 'Arena 1' : t < 750 ? 'Arena 2' : t < 1000 ? 'Arena 3' : 'Arena 4+';
    set('pstat-arena', arena);
    const av = document.getElementById('profile-avatar');
    if (av) av.textContent = (u.username?.[0] ?? '?').toUpperCase();
  }

  _renderDeckTab() {
    const u = this.account.getUser();
    if (!u) return;
    const unlocked = new Set(u.unlockedCards ?? []);
    this._editDeck = new Set(u.deck ?? STARTER_DECK);
    this._redrawDeckTab(unlocked);
  }

  _redrawDeckTab(unlocked) {
    const deckArr = [...this._editDeck];
    const enemies = deckArr.filter(id => CARD_DEFS[id].type === 'enemy');
    const troops  = deckArr.filter(id => CARD_DEFS[id].type === 'troop');
    const valid   = enemies.length === 6 && troops.length === 6;

    const deckCountEl = document.getElementById('deck-count');
    const saveBtn     = document.getElementById('btn-save-deck');
    if (deckCountEl) deckCountEl.textContent = `${enemies.length}/6 enemies · ${troops.length}/6 troops`;
    if (saveBtn) saveBtn.disabled = !valid;

    // Deck slots — two labelled rows
    const slotsEl = document.getElementById('deck-slots');
    if (slotsEl) {
      slotsEl.innerHTML = '';
      const makeRow = (label, arr) => {
        const sec = document.createElement('div');
        sec.className = 'deck-section';
        sec.innerHTML = `<div class="deck-section-label">${label}</div>`;
        const row = document.createElement('div');
        row.className = 'deck-section-row';
        for (let i = 0; i < 6; i++) {
          const slot = document.createElement('div');
          slot.className = 'deck-slot';
          if (arr[i]) {
            const cardId = arr[i];
            const def = CARD_DEFS[cardId];
            slot.classList.add('filled');
            slot.innerHTML = `<div class="dc-icon"></div><div class="dc-name">${def.name}</div>`;
            slot.querySelector('.dc-icon').appendChild(cardThumbCanvas(cardId, 36));
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
      slotsEl.appendChild(makeRow('ENEMIES', enemies));
      slotsEl.appendChild(makeRow('TROOPS', troops));
    }

    // Collection grid
    const collEl = document.getElementById('card-collection');
    if (collEl) {
      collEl.innerHTML = '';
      for (const [id, def] of Object.entries(CARD_DEFS)) {
        const isUnlocked = unlocked.has(id);
        const isInDeck   = this._editDeck.has(id);
        const el = document.createElement('div');
        el.className = ['coll-card', `rarity-${def.rarity}`, isInDeck ? 'in-deck' : '', !isUnlocked ? 'locked' : ''].filter(Boolean).join(' ');
        const raceCol = RACE_DEFS[def.race]?.color ?? '#888';
        el.style.setProperty('--race-color', raceCol);
        el.innerHTML = `
          <div class="cc-cost">${def.cost}</div>
          <div class="cc-icon"></div>
          <div class="cc-name">${def.name}</div>
          <div class="cc-race">${RACE_DEFS[def.race]?.name ?? ''}</div>
          ${!isUnlocked ? '<div class="cc-lock">&#128274;</div>' : ''}
          ${isInDeck    ? '<div class="cc-check">&#10003;</div>' : ''}
        `;
        el.querySelector('.cc-icon').appendChild(cardThumbCanvas(id, 36));
        if (isUnlocked) {
          el.addEventListener('click', () => {
            if (this._editDeck.has(id)) {
              this._editDeck.delete(id);
            } else {
              const eCnt = [...this._editDeck].filter(c => CARD_DEFS[c].type === 'enemy').length;
              const tCnt = [...this._editDeck].filter(c => CARD_DEFS[c].type === 'troop').length;
              if (def.type === 'enemy' && eCnt < 6) this._editDeck.add(id);
              if (def.type === 'troop' && tCnt < 6) this._editDeck.add(id);
            }
            this._redrawDeckTab(unlocked);
          });
        }
        collEl.appendChild(el);
      }
    }
  }

  _saveDeck() {
    if (!this._editDeck) return;
    const arr     = [...this._editDeck];
    const enemies = arr.filter(id => CARD_DEFS[id].type === 'enemy').length;
    const troops  = arr.filter(id => CARD_DEFS[id].type === 'troop').length;
    if (enemies !== 6 || troops !== 6) return;
    this.account.saveDeck(arr);
    const btn = document.getElementById('btn-save-deck');
    if (btn) {
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = 'Save Deck'; }, 1500);
    }
  }

  _renderShopTab() {
    const u = this.account.getUser();
    if (!u) return;
    this._updateCoinDisplay();

    // Daily timer
    const now = new Date(), midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight - now;
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    const timerEl = document.getElementById('daily-timer');
    if (timerEl) timerEl.textContent = `Resets in ${h}h ${m}m`;

    // Chests
    const chestGrid = document.getElementById('chest-grid');
    if (chestGrid) {
      chestGrid.innerHTML = '';
      for (const chest of CHEST_DEFS) {
        const canAfford = (u.coins ?? 0) >= chest.cost;
        const el = document.createElement('div');
        el.className = 'chest-card';
        el.innerHTML = `
          <div class="chest-icon">&#127873;</div>
          <div class="chest-name">${chest.name}</div>
          <div class="chest-slots">${chest.slots.map(r => `<span class="rarity-dot rarity-${r[0]}">${r[0][0].toUpperCase()}</span>`).join('')}</div>
          <button class="chest-buy-btn ${canAfford ? '' : 'disabled'}">C ${chest.cost}</button>
        `;
        el.querySelector('.chest-buy-btn')?.addEventListener('click', () => {
          if (!canAfford) return;
          const result = this.account.openChest(chest.id);
          if (result.ok) {
            this._showChestResult(result.results);
            this._renderShopTab();
          }
        });
        chestGrid.appendChild(el);
      }
    }

    // Daily shop
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
            item.owned  ? '<div class="sc-status owned-lbl">Owned</div>' :
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
    const cards = results.filter(r => r.type === 'card').map(r => CARD_DEFS[r.id]?.name).filter(Boolean).join(', ');
    const coins = results.filter(r => r.type === 'coins').reduce((a, r) => a + r.amount, 0);
    let msg = '';
    if (cards) msg += `Cards unlocked: ${cards}`;
    if (coins) msg += (msg ? '\n' : '') + `Coin refund: ${coins}`;
    if (!msg)  msg = 'No new cards to unlock.';
    setTimeout(() => alert(msg), 50);
  }

  _startMatchmaking() {
    this.ui.show('matchmaking');
    this.ui.startMatchmakingTimer();

    // Use LocalBot unless there's a real server token
    this.net = DEV_MODE ? new LocalBot() : new NetworkClient();

    this.net
      .on(MSG.MATCH_FOUND,  msg => this._onMatchFound(msg))
      .on(MSG.OPP_DEPLOY,   msg => this._onOppDeploy(msg))
      .on(MSG.GAME_OVER,    msg => this._onGameOver(msg))
      .on(MSG.DISCONNECTED, ()  => this._onDisconnect());

    if (!DEV_MODE) {
      this.net.connect(this.account.token)
        .then(() => this.net.findMatch())
        .catch(() => { this.ui.setAuthError('Connection failed.'); this.ui.show('menu'); });
    } else {
      this.net.findMatch();
    }
  }

  // ── Matchmaking ───────────────────────────────────────────
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

  // ── Game lifecycle ────────────────────────────────────────
  _beginGame(oppName) {
    this.state        = new State();
    this.state.oppName = oppName;
    this._active      = true;

    this.economy.reset();
    this.economy.onChange = () => this.hand?.updateAffordability();

    const deckIds = this.account.getUser()?.deck ?? STARTER_DECK;
    this.hand = new Hand(this.economy, deckIds, (cardId, lane) => {
      this._spawnUnit(cardId, 'ply', lane);
      this.net?.deploy(cardId, lane);
      this.state.stats.units++;
    });
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
    const plyTowersDead = Object.values(this.state.towers)
      .filter(t => t.owner === 'ply' && t.dead).length;
    const oppTowersDead = Object.values(this.state.towers)
      .filter(t => t.owner === 'opp' && t.dead).length;

    await this.account.updateStats(won);
    this._updateCoinDisplay();
    this.ui.updateProfile(this.account.getUser());
    this.ui.showResult({
      won,
      crownsFor:     oppTowersDead,
      crownsAgainst: plyTowersDead,
      units:         s.units,
      damage:        Math.round(s.damage),
      towers:        oppTowersDead,
    });
  }

  // ── Result ────────────────────────────────────────────────
  _wireResultUI() {
    document.getElementById('btn-result-battle')?.addEventListener('click', () => this._startMatchmaking());
    document.getElementById('btn-result-menu')?.addEventListener('click',   () => this._showMenu());
  }

  // ── Network events ────────────────────────────────────────
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

  // ── Deploy unit ───────────────────────────────────────────
  _spawnUnit(cardId, owner, lane) {
    const def = CARD_DEFS[cardId];
    if (!def) return;

    if (def.special?.type === 'pack') {
      const count = def.special.count;
      for (let i = 0; i < count; i++) {
        const u = new Unit(cardId, owner, lane);
        u.x += (i - Math.floor(count / 2)) * (u.r * 2.2);
        this.state.units.push(u);
      }
    } else {
      this.state.units.push(new Unit(cardId, owner, lane));
    }
  }

  // ── Main update ───────────────────────────────────────────
  _update(dt, now) {
    if (!this._active || !this.state) return;

    this.renderer.tickTime(dt);
    this.economy.tick(dt, this.state.overtime);
    this.particles.update(dt);

    // Timer
    this.state.timeLeft -= dt;
    if (this.state.timeLeft <= 0 && !this.state.overtime) {
      this.state.timeLeft = 0;
      this._checkTimeoutWinner();
      return;
    }
    if (this.state.overtime) this.state.timeLeft = Math.min(this.state.timeLeft + dt, 30);

    this._updateAuras();
    this._updateUnits(dt);
    this._updateTowers(dt);
    this._updateProjectiles(dt);
    this._cleanDead();
  }

  _updateAuras() {
    // Reset buffs
    for (const u of this.state.units) {
      u.shielded = false;
      u.healRate = 0;
      u.dmgMult  = 1;
      u.spdMult  = 1;
    }
    // Apply auras from source units to allies in range
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
    // Apply healing
    for (const u of this.state.units) {
      if (!u.dead && u.healRate > 0) {
        u.hp = Math.min(u.maxHp, u.hp + u.healRate * 0.016);
      }
    }
  }

  _updateUnits(dt) {
    for (const u of this.state.units) {
      if (u.dead) continue;

      // Income farm
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
      // Explode: AOE damage + stun
      for (const u of this.state.units) {
        if (u.dead || u.owner === attacker.owner) continue;
        if (dist(attacker.x, attacker.y, u.x, u.y) <= s.blastR) {
          const dmg = u.takeDamage(s.blastDmg);
          u.stun(s.stunMs);
          if (attacker.owner === 'ply') this.state.stats.damage += dmg;
        }
      }
      this.particles.burst(attacker.x, attacker.y, 22, { color: '#fbbf24', speedLo: 80, speedHi: 220 });
      attacker.dead = true;
      return;
    }

    if (s?.type === 'splash') {
      // AOE around target
      const hitSet = new Set();
      for (const u of this.state.units) {
        if (u.dead || u.owner === attacker.owner) continue;
        if (dist(target.x, target.y, u.x, u.y) <= s.splashR) { hitSet.add(u); }
      }
      // Also check if target is a tower
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
      attacker.x, attacker.y,
      target.id ?? target.id,
      attacker.dmg,
      420,
      { color: attacker.glow, r: 4, fromTower: false }
    );
    proj._attackerOwner = attacker.owner;
    this.state.projectiles.push(proj);
  }

  _updateTowers(dt) {
    for (const t of Object.values(this.state.towers)) {
      const result = t.update(dt, this.state.units);
      if (!result) continue;
      // Tower fires a projectile
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
      // Resolve target (unit or tower)
      const target = this._findById(proj.targetId);
      const hit    = proj.update(dt, target);
      if (hit && target && !target.dead) {
        this._applyProjectileHit(proj, target);
      }
    }
  }

  _findById(id) {
    for (const u of this.state.units) {
      if (u.id === id) return u;
    }
    for (const t of Object.values(this.state.towers)) {
      if (t.id === id) return t;
    }
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
    // Also check if player king was destroyed by opponent
    const plyKing = this.state.towers['plyKing'];
    if (plyKing?.dead) { this._endGame(false); }
  }

  _checkUnitReachedBase(u) {
    // Units that reach the enemy base damage it when no towers remain
    const hostile = u.owner === 'ply' ? 'opp' : 'ply';
    const king    = this.state.towers[hostile + 'King'];
    if (!king || king.dead) {
      if (u.owner === 'ply') this._endGame(true);
      else                   this._endGame(false);
    }
  }

  _checkTimeoutWinner() {
    const plyDead = Object.values(this.state.towers).filter(t => t.owner === 'ply' && t.dead).length;
    const oppDead = Object.values(this.state.towers).filter(t => t.owner === 'opp' && t.dead).length;
    if (oppDead > plyDead)     { this._endGame(true);  return; }
    if (plyDead > oppDead)     { this._endGame(false); return; }
    // Equal crowns → overtime (sudden death, elixir 2x)
    this.state.overtime  = true;
    this.state.timeLeft  = 30;  // display only; overtime never actually ends on timer
  }

  _cleanDead() {
    this.state.units       = this.state.units.filter(u => !u.dead);
    this.state.projectiles = this.state.projectiles.filter(p => !p.dead);
  }

  // ── Render ────────────────────────────────────────────────
  _render() {
    if (!this.state) return;
    this.renderer.frame(this.state, this.particles);
  }

  // ── Input: canvas click to deploy ─────────────────────────
  _wireCanvasDeploy() {
    this.canvas.addEventListener('click', e => {
      if (!this._active || !this.hand?.hasSelected()) return;
      const def = this.hand.selectedDef();
      if (!def) return;

      const rect  = this.canvas.getBoundingClientRect();
      const scale = this.renderer.scale;
      const cx    = (e.clientX - rect.left)  / scale;
      const cy    = (e.clientY - rect.top)   / scale;

      // Troop cards → player's arena (bottom half, y > RIVER_Y2 = 460)
      // Enemy cards → opponent's arena (top half, y < RIVER_Y1 = 420)
      const isPlayerHalf = cy > 460;
      const isOppHalf    = cy < 420;

      if (def.type === 'troop' && !isPlayerHalf) {
        this.ui.showDeployHint(true);
        setTimeout(() => this.ui.showDeployHint(false), 1500);
        return;
      }
      if (def.type === 'enemy' && !isOppHalf) {
        this.ui.showDeployHint(true);
        setTimeout(() => this.ui.showDeployHint(false), 1500);
        return;
      }

      const lane = cx < CW / 2 ? 0 : 1;
      this.hand.tryDeploy(lane);
    });

    // Keyboard: 1-4 select card, Q/W lane
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
    const def = this.hand.selectedDef();
    if (!def) return;
    // Use default lane — just deploy
    this.hand.tryDeploy(lane);
  }

  _wireGameInput() { /* additional input wiring can go here */ }

  // ── Resize ────────────────────────────────────────────────
  _resize() {
    const hud   = document.getElementById('game-hud');
    const hudH  = hud?.offsetHeight ?? 140;
    const avW   = window.innerWidth;
    const avH   = window.innerHeight - hudH;
    this.renderer.resize(avW, avH);
  }
}

// ── Boot ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => { window._game = new Game(); });
