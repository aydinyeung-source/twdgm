// ── Canvas & arena layout ──────────────────────────────────
export const CW = 520;   // canvas width
export const CH = 880;   // canvas height

export const RIVER_Y1 = 420;
export const RIVER_Y2 = 460;

export const LANE_LEFT  = 130;
export const LANE_RIGHT = 390;

// Spawn Y for each scenario
export const SPAWN = {
  SELF_TROOP:   472,   // top of player arena (just past river)
  SELF_ENEMY:   104,   // deep in opponent arena (near their princess towers)
  OPP_TROOP:    408,   // bottom of opponent arena
  OPP_ENEMY:    776,   // deep in player arena
};

// ── Tower definitions ──────────────────────────────────────
export const TOWER_DEFS = {
  oppKing:  { id: 'oppKing',  owner: 'opp', kind: 'king',     x: 260, y: 56,  r: 42, hp: 240, dmg: 14, range: 160, rate: 1600 },
  oppLeft:  { id: 'oppLeft',  owner: 'opp', kind: 'princess', x: 88,  y: 196, r: 30, hp: 120, dmg: 9,  range: 180, rate: 1200 },
  oppRight: { id: 'oppRight', owner: 'opp', kind: 'princess', x: 432, y: 196, r: 30, hp: 120, dmg: 9,  range: 180, rate: 1200 },
  plyLeft:  { id: 'plyLeft',  owner: 'ply', kind: 'princess', x: 88,  y: 684, r: 30, hp: 120, dmg: 9,  range: 180, rate: 1200 },
  plyRight: { id: 'plyRight', owner: 'ply', kind: 'princess', x: 432, y: 684, r: 30, hp: 120, dmg: 9,  range: 180, rate: 1200 },
  plyKing:  { id: 'plyKing',  owner: 'ply', kind: 'king',     x: 260, y: 824, r: 42, hp: 240, dmg: 14, range: 160, rate: 1600 },
};

// ── Match constants ────────────────────────────────────────
export const MATCH_DURATION = 180;   // seconds (3 min)
export const ELIXIR_MAX     = 10;
export const ELIXIR_RATE    = 1.0;   // per second (normal)
export const ELIXIR_RATE_OT = 3.0;   // per second (overtime)
export const HAND_SIZE      = 4;

// ── Unit card definitions ──────────────────────────────────
// type 'enemy'  → you deploy in OPPONENT's arena
// type 'troop'  → you deploy in YOUR arena

export const CARD_DEFS = {

  // ── ENEMY CARDS (saboteur units sent into opponent territory) ──

  speeder: {
    id: 'speeder', name: 'Speeder', type: 'enemy', cost: 2,
    icon: '💨',
    hp: 32,  speed: 290, dmg: 6,  rate: 900,  r: 18,
    color: '#f97316', glow: '#fb923c',
    desc: 'Fast & cheap. Hard to intercept.',
    special: null,
  },

  swarmer: {
    id: 'swarmer', name: 'Swarmer', type: 'enemy', cost: 2,
    icon: '🐜',
    hp: 18,  speed: 160, dmg: 4,  rate: 800,  r: 14,
    color: '#eab308', glow: '#facc15',
    desc: 'Spawns 3 at once. Swarm them.',
    special: { type: 'pack', count: 3 },
  },

  brute: {
    id: 'brute', name: 'Brute', type: 'enemy', cost: 5,
    icon: '🦏',
    hp: 220, speed: 58,  dmg: 22, rate: 1500, r: 34,
    color: '#8b5cf6', glow: '#a78bfa',
    desc: 'Massive tank. Hard to stop.',
    special: null,
  },

  berserker: {
    id: 'berserker', name: 'Berserker', type: 'enemy', cost: 4,
    icon: '⚡',
    hp: 44,  speed: 240, dmg: 38, rate: 1100, r: 21,
    color: '#ef4444', glow: '#f87171',
    desc: 'Fragile but deals enormous damage.',
    special: null,
  },

  kamikaze: {
    id: 'kamikaze', name: 'Kamikaze', type: 'enemy', cost: 3,
    icon: '💥',
    hp: 55,  speed: 185, dmg: 0,  rate: 9999, r: 21,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Explodes on contact. Stuns nearby troops.',
    special: { type: 'kamikaze', blastR: 88, blastDmg: 32, stunMs: 2000 },
  },

  shadow: {
    id: 'shadow', name: 'Shadow', type: 'enemy', cost: 5,
    icon: '👁️',
    hp: 72,  speed: 195, dmg: 16, rate: 1000, r: 21,
    color: '#475569', glow: '#64748b',
    desc: 'Invisible for 3 sec after spawning.',
    special: { type: 'cloak', durationMs: 3000 },
  },

  // ── TROOP CARDS (your defenders / forward units) ───────────

  grunt: {
    id: 'grunt', name: 'Grunt', type: 'troop', cost: 2,
    icon: '🗡️',
    hp: 55,  speed: 100, dmg: 9,  rate: 1000, r: 22,
    color: '#3b82f6', glow: '#60a5fa',
    desc: 'Solid all-rounder.',
    special: null,
  },

  splasher: {
    id: 'splasher', name: 'Splasher', type: 'troop', cost: 3,
    icon: '💧',
    hp: 42,  speed: 82,  dmg: 6,  rate: 1200, r: 22,
    color: '#06b6d4', glow: '#22d3ee',
    desc: 'AOE splash damage on attack.',
    special: { type: 'splash', splashR: 70 },
  },

  spawner: {
    id: 'spawner', name: 'Spawner', type: 'troop', cost: 5,
    icon: '🏭',
    hp: 85,  speed: 52,  dmg: 5,  rate: 1400, r: 27,
    color: '#2563eb', glow: '#3b82f6',
    desc: 'Periodically spawns Grunt minions.',
    special: { type: 'spawner', spawnId: 'grunt', intervalMs: 5000 },
  },

  shield_bearer: {
    id: 'shield_bearer', name: 'Shield', type: 'troop', cost: 4,
    icon: '🛡️',
    hp: 125, speed: 68,  dmg: 7,  rate: 1300, r: 28,
    color: '#1d4ed8', glow: '#3b82f6',
    desc: 'Reduces damage taken by nearby allies.',
    special: { type: 'shield_aura', auraR: 80, reduction: 0.3 },
  },

  healer: {
    id: 'healer', name: 'Healer', type: 'troop', cost: 4,
    icon: '💚',
    hp: 62,  speed: 78,  dmg: 3,  rate: 2000, r: 22,
    color: '#10b981', glow: '#34d399',
    desc: 'Heals nearby allies over time.',
    special: { type: 'heal_aura', auraR: 90, hps: 5 },
  },

  booster: {
    id: 'booster', name: 'Booster', type: 'troop', cost: 4,
    icon: '🔺',
    hp: 52,  speed: 78,  dmg: 4,  rate: 1200, r: 22,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Boosts damage & speed of nearby allies.',
    special: { type: 'boost_aura', auraR: 85, dmgMult: 1.35, spdMult: 1.2 },
  },

  farm: {
    id: 'farm', name: 'Farm', type: 'troop', cost: 5,
    icon: '⚗️',
    hp: 72,  speed: 0,   dmg: 0,  rate: 9999, r: 27,
    color: '#d97706', glow: '#f59e0b',
    desc: 'Stationary. Generates +1 elixir every 3 sec.',
    special: { type: 'income', elixirRate: 1, intervalMs: 3000 },
  },

  tank: {
    id: 'tank', name: 'Tank', type: 'troop', cost: 5,
    icon: '🏰',
    hp: 260, speed: 42,  dmg: 16, rate: 1500, r: 34,
    color: '#1e3a8a', glow: '#2563eb',
    desc: 'Extremely tough frontliner.',
    special: null,
  },

  sniper: {
    id: 'sniper', name: 'Sniper', type: 'troop', cost: 4,
    icon: '🎯',
    hp: 48,  speed: 62,  dmg: 28, rate: 2000, r: 20,
    color: '#0f766e', glow: '#14b8a6',
    desc: 'Long range. High single-target damage.',
    special: { type: 'long_range', extraRange: 180 },
  },

};

export const ALL_CARD_IDS = Object.keys(CARD_DEFS);
