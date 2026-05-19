const TROPHY_SVG = `<svg viewBox="0 0 60 60" width="60" height="60" fill="none">
  <path d="M30 42c-8 0-14-6-14-14V14h28v14c0 8-6 14-14 14z" fill="#f5c518" opacity="0.9"/>
  <path d="M20 14H10v8c0 5 4 9 10 10" stroke="#f5c518" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M40 14h10v8c0 5-4 9-10 10" stroke="#f5c518" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <rect x="22" y="42" width="16" height="4" rx="2" fill="#f5c518" opacity="0.7"/>
  <rect x="18" y="46" width="24" height="4" rx="2" fill="#f5c518" opacity="0.8"/>
</svg>`;

const SKULL_SVG = `<svg viewBox="0 0 60 60" width="60" height="60" fill="none">
  <ellipse cx="30" cy="26" rx="18" ry="16" fill="#374151"/>
  <circle cx="22" cy="25" r="5" fill="#111827"/>
  <circle cx="38" cy="25" r="5" fill="#111827"/>
  <path d="M22 40h4v6h-4zM34 40h4v6h-4zM28 42h4v4h-4z" fill="#374151"/>
  <path d="M20 40h20v2H20z" fill="#374151"/>
</svg>`;

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
    if (icon)  icon.innerHTML = won ? TROPHY_SVG : SKULL_SVG;

    if (crownsEl) {
      const crownSvg = `<svg viewBox="0 0 20 20" width="28" height="28" fill="#f5c518"><path d="M10 1l2.4 5 5.6.8-4 3.9.9 5.5L10 13.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8z"/></svg>`;
      const dimCrown = `<svg viewBox="0 0 20 20" width="28" height="28" fill="#f5c518" opacity="0.25"><path d="M10 1l2.4 5 5.6.8-4 3.9.9 5.5L10 13.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8z"/></svg>`;
      crownsEl.innerHTML =
        Array(crownsFor).fill(crownSvg).join('') +
        `<span style="color:#475569;font-size:18px;padding:0 6px">vs</span>` +
        Array(crownsAgainst).fill(dimCrown).join('');
    }

    setT('rs-units',  units);
    setT('rs-dmg',    damage);
    setT('rs-towers', towers);
  }
}
