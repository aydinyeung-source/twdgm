import { WS_URL } from './config.js';
import { CARD_DEFS } from './data.js';
import { randFloat, randInt } from './engine.js';

export const MSG = {
  FIND_MATCH:   'FIND_MATCH',
  MATCH_FOUND:  'MATCH_FOUND',
  DEPLOY:       'DEPLOY',
  OPP_DEPLOY:   'OPP_DEPLOY',
  GAME_OVER:    'GAME_OVER',
  PING:         'PING',
  PONG:         'PONG',
  DISCONNECTED: 'DISCONNECTED',
};

// ── Real WebSocket client ──────────────────────────────────
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

  findMatch()          { this.send(MSG.FIND_MATCH); }
  cancelMatch()        { this.send('CANCEL_MATCH'); }
  deploy(cardId, lane) { this.send(MSG.DEPLOY, { cardId, lane }); }

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
// Bot plays ENEMY cards only (sends them to attack player's side)
const BOT_ENEMY_IDS = Object.keys(CARD_DEFS).filter(id => CARD_DEFS[id].type === 'enemy');

export class LocalBot extends NetworkClient {
  constructor() {
    super();
    this.connected    = true;
    this._botElixir   = 20;
    this._botTimer    = 0;
    this._botInterval = null;
    this._nextPlay    = _botNextDelay();
  }

  connect()    { return Promise.resolve(); }
  disconnect() { clearInterval(this._botInterval); }

  findMatch() {
    // 2–4 second matchmaking simulation (realistic feel)
    const delay = 2000 + Math.random() * 2000;
    setTimeout(() => {
      this._dispatch({ type: MSG.MATCH_FOUND, oppName: _botName(), playerSide: 'ply' });
    }, delay);
    this._startBotLoop();
  }

  cancelMatch() {
    clearInterval(this._botInterval);
    this._botInterval = null;
  }

  deploy(cardId, lane) { /* player deployed — bot doesn't react */ }

  _startBotLoop() {
    const TICK = 250;
    this._botInterval = setInterval(() => this._botTick(TICK / 1000), TICK);
  }

  _botTick(dt) {
    this._botElixir = Math.min(25, this._botElixir + 1.0 * dt);
    this._botTimer += dt;
    if (this._botTimer < this._nextPlay) return;

    const affordable = BOT_ENEMY_IDS.filter(id => CARD_DEFS[id].cost <= this._botElixir);
    if (!affordable.length) return;

    // Weight cheaper cards a bit higher for more frequent action
    const weights = affordable.map(id => Math.max(1, 6 - CARD_DEFS[id].cost));
    const total   = weights.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * total;
    let cardId = affordable[0];
    for (let i = 0; i < affordable.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) { cardId = affordable[i]; break; }
    }

    const lane = Math.random() < 0.5 ? 0 : 1;
    this._botElixir -= CARD_DEFS[cardId].cost;
    this._botTimer   = 0;
    this._nextPlay   = _botNextDelay();

    this._dispatch({ type: MSG.OPP_DEPLOY, cardId, lane });
  }
}

function _botNextDelay() { return randFloat(3.0, 6.5); }

const BOT_NAMES = [
  'IronKeeper', 'ShadowArcher', 'StoneGuard', 'NightRaider', 'FrostBolt',
  'VoidHunter', 'GrimWatcher', 'DroneCommander', 'SpecterKing', 'BlazeRunner',
];
function _botName() { return BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]; }

// ── Practice bot (reacts to player, counter-pushes, lane pressure) ────────
export class PracticeBot extends NetworkClient {
  constructor() {
    super();
    this.connected       = true;
    this._botElixir      = 20;
    this._botTimer       = 0;
    this._botInterval    = null;
    this._gameTime       = 0;
    this._nextPlay       = _practiceBotDelay('early');
    this._counterPush    = null; // { lane, cardsLeft, delay }
    this._lastPlayerLane = 0;
  }

  connect()    { return Promise.resolve(); }
  disconnect() { clearInterval(this._botInterval); }

  findMatch() {
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      this._dispatch({ type: MSG.MATCH_FOUND, oppName: _practiceBotName(), playerSide: 'ply' });
    }, delay);
    this._startBotLoop();
  }

  cancelMatch() { clearInterval(this._botInterval); this._botInterval = null; }

  deploy(cardId, lane) {
    const cost = CARD_DEFS[cardId]?.cost ?? 3;
    this._lastPlayerLane = lane;
    // Big play triggers counter-push in opposite lane
    if (cost >= 4 && !this._counterPush) {
      this._counterPush = {
        lane:      1 - lane,
        cardsLeft: cost >= 6 ? 3 : 2,
        delay:     0.8 + Math.random() * 0.7,
      };
    }
  }

  _startBotLoop() {
    const TICK = 250;
    this._botInterval = setInterval(() => this._botTick(TICK / 1000), TICK);
  }

  _phase() {
    if (this._gameTime < 60)  return 'early';
    if (this._gameTime < 120) return 'mid';
    return 'late';
  }

  _botTick(dt) {
    this._botElixir = Math.min(25, this._botElixir + 1.0 * dt);
    this._botTimer += dt;
    this._gameTime += dt;

    // Counter-push: send cheap fast cards quickly in opposite lane
    if (this._counterPush) {
      this._counterPush.delay -= dt;
      if (this._counterPush.delay <= 0 && this._counterPush.cardsLeft > 0) {
        const pool = BOT_ENEMY_IDS.filter(id => CARD_DEFS[id].cost <= Math.min(this._botElixir, 4));
        if (pool.length) {
          const cardId = pool[Math.floor(Math.random() * pool.length)];
          this._botElixir -= CARD_DEFS[cardId].cost;
          this._counterPush.cardsLeft--;
          this._counterPush.delay = 0.5 + Math.random() * 0.5;
          this._dispatch({ type: MSG.OPP_DEPLOY, cardId, lane: this._counterPush.lane });
        }
        if (this._counterPush.cardsLeft <= 0) this._counterPush = null;
      }
      return;
    }

    if (this._botTimer < this._nextPlay) return;

    const phase = this._phase();
    const minCost = phase === 'late' ? 3 : 1;
    const affordable = BOT_ENEMY_IDS.filter(id => {
      const cost = CARD_DEFS[id].cost;
      return cost <= this._botElixir && cost >= minCost;
    });
    if (!affordable.length) return;

    // Early: favour cheap cards; late: favour heavy cards
    const weights = affordable.map(id => {
      const cost = CARD_DEFS[id].cost;
      return phase === 'late' ? cost * cost : Math.max(1, 7 - cost);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * total;
    let cardId = affordable[0];
    for (let i = 0; i < affordable.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) { cardId = affordable[i]; break; }
    }

    // Alternate lanes every ~15s, with some randomness
    const preferLane = Math.floor(this._gameTime / 15) % 2;
    const lane = Math.random() < 0.65 ? preferLane : 1 - preferLane;

    this._botElixir -= CARD_DEFS[cardId].cost;
    this._botTimer   = 0;
    this._nextPlay   = _practiceBotDelay(phase);
    this._dispatch({ type: MSG.OPP_DEPLOY, cardId, lane });
  }
}

function _practiceBotDelay(phase) {
  if (phase === 'late')  return randFloat(1.5, 3.0);
  if (phase === 'mid')   return randFloat(2.0, 4.0);
  return randFloat(3.0, 5.5);
}

const PRACTICE_BOT_NAMES = ['TrainingDummy', 'DrillBot', 'SparBot', 'CoachBot', 'PracticeTarget'];
function _practiceBotName() { return PRACTICE_BOT_NAMES[randInt(0, PRACTICE_BOT_NAMES.length - 1)]; }
