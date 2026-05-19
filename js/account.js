import { API_URL, DEV_MODE } from './config.js';
import { CARD_DEFS, ALL_CARD_IDS, CHEST_DEFS, RARITY_SHOP_PRICE, COINS, STARTER_DECK } from './data.js';

const TOKEN_KEY = 'cc_token';
const USER_KEY  = 'cc_user';

const DEV_USER = { username: 'DevPlayer', wins: 3, losses: 1, trophies: 120 };

export class Account {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (this.user) this._migrate(this.user);
  }

  _migrate(u) {
    if (u.coins          === undefined) u.coins          = COINS.START;
    if (!u.deck)                        u.deck           = [...STARTER_DECK];
    if (!u.unlockedCards)               u.unlockedCards  = [...STARTER_DECK];
    if (!u.firstWinDate)                u.firstWinDate   = null;
    if (!u.dailyShopBought)             u.dailyShopBought = {};
  }

  isLoggedIn() {
    return !!(this.token && this.user);
  }

  getUser() {
    if (DEV_MODE) return this.user ?? DEV_USER;
    return this.user;
  }

  async login(username, password) {
    if (DEV_MODE) {
      const u = { username, wins: 0, losses: 0, trophies: 0 };
      this._migrate(u);
      this._save('dev-token', u);
      return u;
    }
    const res = await this._post('/auth/login', { username, password });
    this._migrate(res.user);
    this._save(res.token, res.user);
    return res.user;
  }

  async register(username, password) {
    if (DEV_MODE) {
      const u = { username, wins: 0, losses: 0, trophies: 0 };
      this._migrate(u);
      this._save('dev-token', u);
      return u;
    }
    const res = await this._post('/auth/register', { username, password });
    this._migrate(res.user);
    this._save(res.token, res.user);
    return res.user;
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token = null;
    this.user  = null;
  }

  async updateStats(won) {
    if (!this.user) return;
    if (won) this.user.wins   = (this.user.wins   ?? 0) + 1;
    else     this.user.losses = (this.user.losses ?? 0) + 1;
    this.user.trophies = Math.max(0, (this.user.trophies ?? 0) + (won ? 15 : -8));

    const today = new Date().toDateString();
    let earn = won ? COINS.WIN : COINS.LOSS;
    if (won && this.user.firstWinDate !== today) {
      earn += COINS.FIRST_WIN_BONUS;
      this.user.firstWinDate = today;
    }
    this.user.coins = (this.user.coins ?? 0) + earn;

    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    if (!DEV_MODE && this.token) {
      await this._post('/profile/update-stats', { won }).catch(() => {});
    }
    return earn;
  }

  spendCoins(amount) {
    if (!this.user || (this.user.coins ?? 0) < amount) return false;
    this.user.coins -= amount;
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    return true;
  }

  // Returns 4 cards for today's daily shop (seeded by date, consistent across calls)
  getDailyShop() {
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) {
      seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
    }
    seed = Math.abs(seed) + 1;

    const rand = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) | 0;
      return (seed >>> 0) / 0x100000000;
    };

    const pool = [...ALL_CARD_IDS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const bought   = this.user?.dailyShopBought?.[today] ?? [];
    const unlocked = this.user?.unlockedCards ?? [];

    return pool.slice(0, 4).map(id => ({
      id,
      def:    CARD_DEFS[id],
      price:  RARITY_SHOP_PRICE[CARD_DEFS[id].rarity],
      owned:  unlocked.includes(id),
      bought: bought.includes(id),
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
    if (!this.user.unlockedCards.includes(cardId)) {
      this.user.unlockedCards.push(cardId);
    }

    if (!this.user.dailyShopBought) this.user.dailyShopBought = {};
    this.user.dailyShopBought[today] = [...bought, cardId];

    // Prune old dates
    for (const k of Object.keys(this.user.dailyShopBought)) {
      if (k !== today) delete this.user.dailyShopBought[k];
    }

    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    return { ok: true, coins: this.user.coins };
  }

  openChest(chestId) {
    if (!this.user) return { err: 'Not logged in' };
    const chest = CHEST_DEFS.find(c => c.id === chestId);
    if (!chest) return { err: 'Unknown chest' };
    if ((this.user.coins ?? 0) < chest.cost) return { err: 'Not enough coins' };

    this.user.coins -= chest.cost;
    const results    = [];
    let   coinRefund = 0;

    for (const rarityPool of chest.slots) {
      const rarity = rarityPool[Math.floor(Math.random() * rarityPool.length)];
      const pool   = ALL_CARD_IDS.filter(id => {
        const d = CARD_DEFS[id];
        return d.rarity === rarity && !this.user.unlockedCards.includes(id);
      });

      if (pool.length === 0) {
        const refund = Math.round(RARITY_SHOP_PRICE[rarity] * 0.4);
        coinRefund += refund;
        results.push({ type: 'coins', amount: refund });
      } else {
        const cardId = pool[Math.floor(Math.random() * pool.length)];
        this.user.unlockedCards.push(cardId);
        results.push({ type: 'card', id: cardId });
      }
    }

    this.user.coins += coinRefund;
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    return { ok: true, results, coins: this.user.coins };
  }

  saveDeck(cardIds) {
    if (!this.user || cardIds.length !== 12) return false;
    const enemies = cardIds.filter(id => CARD_DEFS[id]?.type === 'enemy').length;
    const troops  = cardIds.filter(id => CARD_DEFS[id]?.type === 'troop').length;
    if (enemies !== 6 || troops !== 6) return false;
    if (!cardIds.every(id => this.user.unlockedCards.includes(id))) return false;
    this.user.deck = [...cardIds];
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    return true;
  }

  _save(token, user) {
    this.token = token;
    this.user  = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async _post(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }
}
