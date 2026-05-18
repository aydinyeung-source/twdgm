// Screen & HUD manager

export class UI {
  constructor() {
    this._screens = {
      loading:    document.getElementById('screen-loading'),
      auth:       document.getElementById('screen-auth'),
      menu:       document.getElementById('screen-menu'),
      matchmaking:document.getElementById('screen-matchmaking'),
      game:       document.getElementById('screen-game'),
      result:     document.getElementById('screen-result'),
    };
    this._mmStart = 0;
    this._mmInterval = null;
  }

  show(name) {
    for (const [k, el] of Object.entries(this._screens)) {
      el.classList.toggle('active', k === name);
    }
  }

  // ── Auth ────────────────────────────────────────────────
  setAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) el.textContent = msg;
  }
  clearAuthError() { this.setAuthError(''); }

  // ── Menu ────────────────────────────────────────────────
  updateProfile(user) {
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setT('menu-username', user.username);
    setT('trophy-val',    user.trophies ?? 0);
    setT('menu-wins',     user.wins     ?? 0);
    setT('menu-losses',   user.losses   ?? 0);
    const wr = user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100) + '%'
      : '—';
    setT('menu-wr', wr);

    const av = document.getElementById('menu-avatar');
    if (av) av.textContent = (user.username?.[0] ?? '?').toUpperCase();
  }

  // ── Matchmaking ─────────────────────────────────────────
  startMatchmakingTimer() {
    this._mmStart = Date.now();
    this._mmInterval = setInterval(() => {
      const el = document.getElementById('mm-timer');
      if (!el) return;
      const secs = Math.floor((Date.now() - this._mmStart) / 1000);
      const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
      el.textContent = `${mm}:${ss}`;
    }, 500);
  }

  stopMatchmakingTimer() {
    clearInterval(this._mmInterval);
    this._mmInterval = null;
    const el = document.getElementById('mm-timer');
    if (el) el.textContent = '0:00';
  }

  // ── Game HUD ────────────────────────────────────────────
  setOpponentName(name) {
    const el = document.getElementById('opp-name-label');
    if (el) el.textContent = name;
  }

  showDeployHint(show) {
    const el = document.getElementById('deploy-hint');
    if (el) el.classList.toggle('hidden', !show);
  }

  // ── Result screen ────────────────────────────────────────
  showResult({ won, crownsFor, crownsAgainst, units, damage, towers }) {
    this.show('result');
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const title = document.getElementById('result-title');
    const icon  = document.getElementById('result-icon');
    const crownsEl = document.getElementById('result-crowns');

    if (title) { title.textContent = won ? 'VICTORY!' : 'DEFEAT'; title.className = 'result-title ' + (won ? 'win' : 'lose'); }
    if (icon)  icon.textContent = won ? '🏆' : '💀';

    if (crownsEl) {
      crownsEl.innerHTML =
        Array(crownsFor).fill('<span>👑</span>').join('') +
        ' <span style="opacity:.3">vs</span> ' +
        Array(crownsAgainst).fill('<span style="opacity:.4">👑</span>').join('');
    }

    setT('rs-units',  units);
    setT('rs-dmg',    damage);
    setT('rs-towers', towers);
  }
}
