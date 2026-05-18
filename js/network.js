import { WS_URL } from './config.js';
import { ALL_CARD_IDS, CARD_DEFS } from './data.js';
import { randFloat, randInt } from './engine.js';

// ── Message types ──────────────────────────────────────────
export const MSG = {
  FIND_MATCH:       'FIND_MATCH',
  MATCH_FOUND:      'MATCH_FOUND',
  DEPLOY:           'DEPLOY',
  OPP_DEPLOY:       'OPP_DEPLOY',
  GAME_OVER:        'GAME_OVER',
  PING:             'PING',
  PONG:             'PONG',
  DISCONNECTED:     'DISCONNECTED',
};

// ── Real WebSocket client (Cloudflare Durable Objects backend) ──
export class NetworkClient {
  constructor() {
    this.ws           = null;
    this.connected    = false;
    this._handlers    = {};
    this._token       = null;
    this._retries     = 0;
    this._maxRetries  = 5;
    this._pingId      = null;
  }

  on(type, fn)  { this._handlers[type] = fn; return this; }
  off(type)     { delete this._handlers[type]; return this; }

  connect(token) {
    this._token = token;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
      this.ws.onopen    = () => { this.connected = true; this._retries = 0; this._startPing(); resolve(); };
      this.ws.onmessage = e => this._dispatch(JSON.parse(e.data));
      this.ws.onclose   = () => this._onClose();
      this.ws.onerror   = err => { if (!this.connected) reject(err); };
    });
  }

  disconnect() {
    this.connected = false;
    clearInterval(this._pingId);
    this.ws?.close();
  }

  send(type, payload = {}) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  findMatch()              { this.send(MSG.FIND_MATCH); }
  cancelMatch()            { this.send('CANCEL_MATCH'); }
  deploy(cardId, lane)     { this.send(MSG.DEPLOY, { cardId, lane }); }

  _dispatch(msg) {
    const h = this._handlers[msg.type];
    if (h) h(msg);
  }

  _onClose() {
    this.connected = false;
    clearInterval(this._pingId);
    if (this._retries < this._maxRetries) {
      const delay = Math.min(1000 * 2 ** this._retries, 16000);
      this._retries++;
      setTimeout(() => this.connect(this._token).catch(() => {}), delay);
    } else {
      this._dispatch({ type: MSG.DISCONNECTED });
    }
  }

  _startPing() {
    this._pingId = setInterval(() => this.send(MSG.PING), 25000);
  }
}

// ── Local bot (no backend required) ───────────────────────
export class LocalBot extends NetworkClient {
  constructor() {
    super();
    this.connected    = true;
    this._botElixir   = 5;
    this._botTimer    = 0;
    this._botInterval = null;
    this._nextPlay    = _botNextDelay();
  }

  connect()  { return Promise.resolve(); }
  disconnect() { clearInterval(this._botInterval); }

  findMatch() {
    // Simulate match found after a short delay
    setTimeout(() => {
      this._dispatch({ type: MSG.MATCH_FOUND, oppName: _botName(), playerSide: 'ply' });
    }, 600 + Math.random() * 800);
    this._startBotLoop();
  }

  cancelMatch() { clearInterval(this._botInterval); }

  // Player deployed something — bot can react
  deploy(cardId, lane) { /* no-op; bot reacts on its own loop */ }

  _startBotLoop() {
    const TICK = 250;  // ms
    this._botInterval = setInterval(() => this._botTick(TICK / 1000), TICK);
  }

  _botTick(dt) {
    // Accrue elixir
    this._botElixir = Math.min(10, this._botElixir + 1.0 * dt);

    this._botTimer += dt;
    if (this._botTimer < this._nextPlay) return;

    // Pick an affordable card the bot "decides" to play
    const affordable = ALL_CARD_IDS.filter(id => CARD_DEFS[id].cost <= this._botElixir);
    if (!affordable.length) return;

    const cardId = affordable[Math.floor(Math.random() * affordable.length)];
    const lane   = Math.random() < 0.5 ? 0 : 1;
    this._botElixir -= CARD_DEFS[cardId].cost;
    this._botTimer   = 0;
    this._nextPlay   = _botNextDelay();

    this._dispatch({ type: MSG.OPP_DEPLOY, cardId, lane });
  }
}

function _botNextDelay() { return randFloat(3.5, 7.5); }

const BOT_NAMES = ['IronKeeper', 'ShadowArcher', 'StoneGuard', 'NightRaider', 'FrostBolt'];
function _botName() { return BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]; }
