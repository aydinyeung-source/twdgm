import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { CARD_DEFS, ALL_CARD_IDS, CHEST_DEFS, RARITY_SHOP_PRICE, COINS, STARTER_DECK, LEVEL_REQS, MAX_LEVEL } from './data.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOKEN_KEY = 'cc_token';
const USER_KEY  = 'cc_user';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function _genTag() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tag = '#';
  for (let i = 0; i < 6; i++) tag += chars[Math.floor(Math.random() * chars.length)];
  return tag;
}

export class Account {
  constructor() {
    this._supaUser  = null;
    this._syncTimer = null;
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (this.user) this._migrate(this.user);
    this._restoreSession();
  }

  async _restoreSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    this._supaUser = data.session.user;
    this.token = data.session.access_token;
    localStorage.setItem(TOKEN_KEY, this.token);
    await this._fetchProfile(data.session.user.id);
  }

  async _fetchProfile(userId) {
    const { data: p } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!p) return;
    const u = this._profileToUser(p);
    this._migrate(u);
    this.user = u;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  _migrate(u) {
    if (u.coins          === undefined) u.coins           = COINS.START;
    if (!u.deck)                        u.deck            = [...STARTER_DECK];
    if (!u.unlockedCards)               u.unlockedCards   = [];
    if (!u.firstWinDate)                u.firstWinDate    = null;
    if (!u.dailyShopBought)             u.dailyShopBought = {};
    if (!u.playerTag)                   u.playerTag       = _genTag();
    if (!u.cardCopies)                  u.cardCopies      = {};
    if (!u.cardLevels)                  u.cardLevels      = {};
    if (!u.matchHistory)                u.matchHistory    = [];
    if (!u.friends)                     u.friends         = [];
    if (!u.pendingRequests)             u.pendingRequests  = [];
    if (!u.outgoingRequests)            u.outgoingRequests = [];
    if (!u.playtime)                    u.playtime        = 0;
    // Auto-unlock all arenaUnlock:0 cards
    for (const [id, def] of Object.entries(CARD_DEFS)) {
      if ((def.arenaUnlock ?? 99) === 0 && !u.unlockedCards.includes(id)) {
        u.unlockedCards.push(id);
      }
    }
    // Ensure starter deck cards are always unlocked (migration safety)
    for (const id of STARTER_DECK) {
      if (!u.unlockedCards.includes(id)) u.unlockedCards.push(id);
    }
    this._expireRequests(u);
    this._save_silent(u);
  }

  _expireRequests(u) {
    if (!u.pendingRequests) return;
    u.pendingRequests = u.pendingRequests.filter(
      req => (u.playtime - (req.playTimeSeen ?? 0)) < 3600000
    );
  }

  isLoggedIn() { return !!(this.token && this.user); }
  getUser()    { return this.user; }

  async login(username, password) {
    const email = username.toLowerCase() + '@twdgm.game';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message.includes('Invalid') ? 'Username or password is incorrect.' : error.message);
    }
    this._supaUser = data.user;
    this.token = data.session.access_token;
    localStorage.setItem(TOKEN_KEY, this.token);
    await this._fetchProfile(data.user.id);
    if (!this.user) throw new Error('Profile not found.');
    return this.user;
  }

  async register(username, password) {
    if (!username || username.length < 2) throw new Error('Username must be at least 2 characters.');
    if (username.length > 20) throw new Error('Username must be 20 characters or less.');
    if (!/^[A-Za-z0-9_]+$/.test(username)) throw new Error('Username can only contain letters, numbers, and underscores.');
    const email = username.toLowerCase() + '@twdgm.game';
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      throw new Error(error.message.includes('already') ? 'Username already taken.' : error.message);
    }
    this._supaUser = data.user;
    this.token = data.session?.access_token ?? null;
    if (this.token) localStorage.setItem(TOKEN_KEY, this.token);

    const u = { username, wins: 0, losses: 0, trophies: 0 };
    this._migrate(u);

    const { error: insertErr } = await supabase.from('users').insert({
      id: data.user.id,
      ...this._userToProfile(u),
    });
    if (insertErr) throw new Error('Could not save profile: ' + insertErr.message);

    this.user = u;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    return u;
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token = null; this.user = null; this._supaUser = null;
    supabase.auth.signOut().catch(() => {});
  }

  tickPlaytime(ms) {
    if (!this.user) return;
    this.user.playtime = (this.user.playtime ?? 0) + ms;
    this._expireRequests(this.user);
    this._save_silent(this.user);
  }

  async updateStats(won, coinMult = 1) {
    if (!this.user) return 0;
    // Practice mode: no stats, no coins
    if (coinMult === 'practice') return 0;

    // Only normal (1×) mode updates profile stats visible to the player
    if (coinMult === 1) {
      if (won) this.user.wins   = (this.user.wins   ?? 0) + 1;
      else     this.user.losses = (this.user.losses ?? 0) + 1;
      this.user.trophies = Math.max(0, (this.user.trophies ?? 0) + (won ? 15 : -8));
      if (!this.user.matchHistory) this.user.matchHistory = [];
      this.user.matchHistory.push({ ts: Date.now(), won });
      if (this.user.matchHistory.length > 500) this.user.matchHistory = this.user.matchHistory.slice(-500);
    }

    const today = new Date().toDateString();
    let earn = won ? COINS.WIN : COINS.LOSS;
    if (coinMult === 1 && won && this.user.firstWinDate !== today) {
      earn += COINS.FIRST_WIN_BONUS;
      this.user.firstWinDate = today;
    }
    earn = coinMult === Infinity ? 9999 : Math.round(earn * coinMult);
    this.user.coins = (this.user.coins ?? 0) + earn;

    this._save_silent(this.user);
    return earn;
  }

  getWinrate(period = 'all') {
    const history = this.user?.matchHistory ?? [];
    const now = Date.now();
    let cutoff = 0;
    if (period === 'today') cutoff = new Date().setHours(0, 0, 0, 0);
    else if (period === 'week')  cutoff = now - 7  * 86400000;
    else if (period === 'month') cutoff = now - 30 * 86400000;
    const filtered = history.filter(m => m.ts >= cutoff);
    if (!filtered.length) return { wins: 0, losses: 0, rate: '--', games: 0 };
    const wins = filtered.filter(m => m.won).length;
    return { wins, losses: filtered.length - wins, games: filtered.length, rate: Math.round(wins / filtered.length * 100) + '%' };
  }

  spendCoins(amount) {
    if (!this.user || (this.user.coins ?? 0) < amount) return false;
    this.user.coins -= amount;
    this._save_silent(this.user);
    return true;
  }

  // ── Card levels ─────────────────────────────────────────────
  getCardLevel(id)  { return this.user?.cardLevels?.[id] ?? 1; }
  getCardCopies(id) { return this.user?.cardCopies?.[id] ?? 0; }
  getLevelMult(id)  { return 1 + (this.getCardLevel(id) - 1) * 0.1; }

  getLevelInfo(cardId) {
    const level = this.getCardLevel(cardId);
    if (level >= MAX_LEVEL) return { canLevel: false, req: null, level, maxed: true };
    const req    = LEVEL_REQS[level - 1];
    const copies = this.getCardCopies(cardId);
    const coins  = this.user?.coins ?? 0;
    return { canLevel: copies >= req.copies && coins >= req.coins, req, copies, coins, level, maxed: false };
  }

  levelUpCard(cardId) {
    if (!this.user) return { err: 'Not logged in' };
    const info = this.getLevelInfo(cardId);
    if (info.maxed)     return { err: 'Already max level' };
    if (!info.canLevel) return { err: 'Not enough copies or coins' };
    this.user.cardCopies[cardId] = (this.user.cardCopies[cardId] ?? 0) - info.req.copies;
    this.user.coins -= info.req.coins;
    this.user.cardLevels[cardId] = info.level + 1;
    this._save_silent(this.user);
    return { ok: true, newLevel: info.level + 1 };
  }

  _addCopies(cardId, count = 1) {
    if (!this.user.cardCopies) this.user.cardCopies = {};
    this.user.cardCopies[cardId] = (this.user.cardCopies[cardId] ?? 0) + count;
  }

  // ── Shop ────────────────────────────────────────────────────
  getDailyShop() {
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
    seed = Math.abs(seed) + 1;
    const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 0x100000000; };
    const pool = [...ALL_CARD_IDS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const bought   = this.user?.dailyShopBought?.[today] ?? [];
    const unlocked = this.user?.unlockedCards ?? [];
    return pool.slice(0, 4).map(id => ({
      id, def: CARD_DEFS[id],
      price:  RARITY_SHOP_PRICE[CARD_DEFS[id].rarity],
      copies: this.getCardCopies(id), level: this.getCardLevel(id),
      owned:  unlocked.includes(id),  bought: bought.includes(id),
    }));
  }

  buyShopCard(cardId) {
    if (!this.user) return { err: 'Not logged in' };
    const def = CARD_DEFS[cardId];
    if (!def) return { err: 'Unknown card' };
    const today  = new Date().toDateString();
    const bought = this.user.dailyShopBought?.[today] ?? [];
    if (bought.includes(cardId)) return { err: 'Already bought today' };
    const price = RARITY_SHOP_PRICE[def.rarity];
    if ((this.user.coins ?? 0) < price) return { err: 'Not enough coins' };
    this.user.coins -= price;
    this._addCopies(cardId, 1);
    if (!this.user.unlockedCards.includes(cardId)) this.user.unlockedCards.push(cardId);
    if (!this.user.dailyShopBought) this.user.dailyShopBought = {};
    this.user.dailyShopBought[today] = [...bought, cardId];
    for (const k of Object.keys(this.user.dailyShopBought)) { if (k !== today) delete this.user.dailyShopBought[k]; }
    this._save_silent(this.user);
    return { ok: true, coins: this.user.coins };
  }

  openChest(chestId) {
    if (!this.user) return { err: 'Not logged in' };
    const chest = CHEST_DEFS.find(c => c.id === chestId);
    if (!chest) return { err: 'Unknown chest' };
    if ((this.user.trophies ?? 0) < (chest.arenaMin ?? 0)) return { err: 'Arena not unlocked yet' };
    if ((this.user.coins ?? 0) < chest.cost) return { err: 'Not enough coins' };
    this.user.coins -= chest.cost;
    const aLevel = chest.arenaLevel ?? 0;
    const results = []; let coinRefund = 0;
    for (const rarityPool of chest.slots) {
      const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];
      // First try exact arena level, fall back to any lower arena, then any card
      let allOfRarity = ALL_CARD_IDS.filter(id =>
        CARD_DEFS[id].rarity === rarity && (CARD_DEFS[id].arenaUnlock ?? 0) === aLevel);
      if (!allOfRarity.length)
        allOfRarity = ALL_CARD_IDS.filter(id =>
          CARD_DEFS[id].rarity === rarity && (CARD_DEFS[id].arenaUnlock ?? 0) < aLevel);
      if (!allOfRarity.length)
        allOfRarity = ALL_CARD_IDS.filter(id => CARD_DEFS[id].rarity === rarity);
      if (!allOfRarity.length) {
        const refund = Math.round(RARITY_SHOP_PRICE[rarity] * 0.4);
        coinRefund += refund; results.push({ type: 'coins', amount: refund });
      } else {
        const cardId = allOfRarity[Math.floor(Math.random() * allOfRarity.length)];
        this._addCopies(cardId, 1);
        if (!this.user.unlockedCards.includes(cardId)) this.user.unlockedCards.push(cardId);
        results.push({ type: 'card', id: cardId, rarity, copies: this.getCardCopies(cardId) });
      }
    }
    this.user.coins += coinRefund;
    this._save_silent(this.user);
    return { ok: true, results, coins: this.user.coins };
  }

  // Deck: exactly 12, min 2 enemies, min 2 troops (spells/buildings count as defense but not troops)
  saveDeck(cardIds) {
    if (!this.user || cardIds.length !== 12) return false;
    const enemies = cardIds.filter(id => CARD_DEFS[id]?.type === 'enemy').length;
    const troops  = cardIds.filter(id => CARD_DEFS[id]?.type === 'troop').length;
    if (enemies < 2 || troops < 2) return false;
    if (!cardIds.every(id => this.user.unlockedCards.includes(id))) return false;
    this.user.deck = [...cardIds];
    this._save_silent(this.user);
    return true;
  }

  // ── Friends ─────────────────────────────────────────────────
  sendFriendRequest(targetTag) {
    if (!this.user) return { err: 'Not logged in' };
    targetTag = targetTag.toUpperCase().trim();
    if (!targetTag.startsWith('#')) targetTag = '#' + targetTag;
    if (targetTag === this.user.playerTag) return { err: 'Cannot add yourself' };
    if ((this.user.friends ?? []).some(f => f.tag === targetTag)) return { err: 'Already friends' };
    if ((this.user.outgoingRequests ?? []).some(r => r.tag === targetTag)) return { err: 'Request already sent' };
    if (!this.user.outgoingRequests) this.user.outgoingRequests = [];
    this.user.outgoingRequests.push({ tag: targetTag, username: '???', sentAt: Date.now() });
    if (!this.user.pendingRequests) this.user.pendingRequests = [];
    this.user.pendingRequests.push({ tag: this.user.playerTag, username: this.user.username, sentAt: Date.now(), playTimeSeen: this.user.playtime ?? 0 });
    this._save_silent(this.user);
    return { ok: true };
  }

  acceptFriendRequest(senderTag) {
    if (!this.user) return { err: 'Not logged in' };
    const req = (this.user.pendingRequests ?? []).find(r => r.tag === senderTag);
    if (!req) return { err: 'Request not found' };
    this.user.pendingRequests = this.user.pendingRequests.filter(r => r.tag !== senderTag);
    if (!this.user.friends) this.user.friends = [];
    if (!this.user.friends.some(f => f.tag === senderTag)) this.user.friends.push({ tag: senderTag, username: req.username, addedAt: Date.now() });
    this._save_silent(this.user);
    return { ok: true };
  }

  declineFriendRequest(senderTag) {
    if (!this.user) return { err: 'Not logged in' };
    this.user.pendingRequests = (this.user.pendingRequests ?? []).filter(r => r.tag !== senderTag);
    this._save_silent(this.user);
    return { ok: true };
  }

  removeFriend(tag) {
    if (!this.user) return;
    this.user.friends = (this.user.friends ?? []).filter(f => f.tag !== tag);
    this._save_silent(this.user);
  }

  hasPendingRequests() { return (this.user?.pendingRequests?.length ?? 0) > 0; }

  // ── Persistence ─────────────────────────────────────────────
  _save(token, user) {
    this.token = token; this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  _save_silent(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._scheduleSyncToSupabase(user);
  }

  _scheduleSyncToSupabase(user) {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._syncToSupabase({ ...user }), 2000);
  }

  async _syncToSupabase(user) {
    if (!this._supaUser?.id) return;
    await supabase.from('users').upsert({
      id: this._supaUser.id,
      ...this._userToProfile(user),
      last_seen_at: new Date().toISOString(),
    }).catch(() => {});
  }

  _userToProfile(u) {
    const levels = Object.values(u.cardLevels ?? {});
    const avgLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 1;
    const topCard  = Object.entries(u.cardLevels ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      username:          u.username,
      player_tag:        u.playerTag        ?? null,
      trophies:          u.trophies         ?? 0,
      peak_trophies:     Math.max(u.trophies ?? 0, u.peakTrophies ?? 0),
      avg_card_level:    Math.round(avgLevel * 10) / 10,
      favourite_card:    topCard,
      coins:             u.coins            ?? 0,
      wins:              u.wins             ?? 0,
      losses:            u.losses           ?? 0,
      first_win_date:    u.firstWinDate     ?? null,
      deck:              u.deck             ?? [],
      unlocked_cards:    u.unlockedCards    ?? [],
      card_levels:       u.cardLevels       ?? {},
      card_copies:       u.cardCopies       ?? {},
      match_history:     u.matchHistory     ?? [],
      friends:           u.friends          ?? [],
      pending_requests:  u.pendingRequests  ?? [],
      outgoing_requests: u.outgoingRequests ?? [],
      playtime:          u.playtime         ?? 0,
      daily_shop_bought: u.dailyShopBought  ?? {},
    };
  }

  _profileToUser(p) {
    return {
      username:        p.username,
      playerTag:       p.player_tag,
      trophies:        p.trophies          ?? 0,
      peakTrophies:    p.peak_trophies     ?? 0,
      coins:           p.coins             ?? 0,
      wins:            p.wins              ?? 0,
      losses:          p.losses            ?? 0,
      firstWinDate:    p.first_win_date    ?? null,
      deck:            p.deck              ?? [],
      unlockedCards:   p.unlocked_cards    ?? [],
      cardLevels:      p.card_levels       ?? {},
      cardCopies:      p.card_copies       ?? {},
      matchHistory:    p.match_history     ?? [],
      friends:         p.friends           ?? [],
      pendingRequests: p.pending_requests  ?? [],
      outgoingRequests:p.outgoing_requests ?? [],
      playtime:        p.playtime          ?? 0,
      dailyShopBought: p.daily_shop_bought ?? {},
    };
  }
}
