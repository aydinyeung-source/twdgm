import { API_URL, DEV_MODE } from './config.js';

const TOKEN_KEY = 'cc_token';
const USER_KEY  = 'cc_user';

// Dev-mode fake user so you can test without a backend
const DEV_USER = { username: 'DevPlayer', wins: 3, losses: 1, trophies: 120 };

export class Account {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
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
      this._save('dev-token', u);
      return u;
    }
    const res = await this._post('/auth/login', { username, password });
    this._save(res.token, res.user);
    return res.user;
  }

  async register(username, password) {
    if (DEV_MODE) {
      const u = { username, wins: 0, losses: 0, trophies: 0 };
      this._save('dev-token', u);
      return u;
    }
    const res = await this._post('/auth/register', { username, password });
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
    this.user.trophies = (this.user.trophies ?? 0) + (won ? 15 : -8);
    this.user.trophies = Math.max(0, this.user.trophies);
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    if (!DEV_MODE && this.token) {
      await this._post('/profile/update-stats', { won }).catch(() => {});
    }
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
