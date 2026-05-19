// ── Canvas & arena layout ──────────────────────────────────
export const CW = 520;
export const CH = 880;

export const RIVER_Y1 = 420;
export const RIVER_Y2 = 460;

export const LANE_LEFT  = 130;
export const LANE_RIGHT = 390;

export const SPAWN = {
  SELF_TROOP:   472,
  SELF_ENEMY:   104,
  OPP_TROOP:    408,
  OPP_ENEMY:    776,
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
export const MATCH_DURATION = 180;
export const ELIXIR_MAX     = 10;
export const ELIXIR_RATE    = 1.0;
export const ELIXIR_RATE_OT = 3.0;
export const HAND_SIZE      = 4;

// ── Economy ────────────────────────────────────────────────
export const COINS = {
  WIN:             30,
  LOSS:            10,
  FIRST_WIN_BONUS: 80,
  START:           200,
};

export const RARITY_SHOP_PRICE = { common: 40, rare: 100, epic: 280 };

// ── Chest definitions ──────────────────────────────────────
// slots: array of rarity pools per slot (one card drawn per slot)
export const CHEST_DEFS = [
  {
    id: 'wooden', name: 'Wooden', cost: 60,
    slots: [['common'],['common'],['common']],
    color: '#92400e', glow: '#b45309',
  },
  {
    id: 'silver', name: 'Silver', cost: 180,
    slots: [['common'],['common'],['common'],['rare']],
    color: '#475569', glow: '#94a3b8',
  },
  {
    id: 'golden', name: 'Golden', cost: 420,
    slots: [['common'],['rare'],['rare'],['rare'],['epic']],
    color: '#d97706', glow: '#f59e0b',
  },
  {
    id: 'epic', name: 'Epic', cost: 900,
    slots: [['epic'],['epic'],['epic'],['epic']],
    color: '#7c3aed', glow: '#a855f7',
  },
];

// ── Race definitions ───────────────────────────────────────
export const RACE_DEFS = {
  gremlin: { name: 'GREMLIN', color: '#f59e0b', desc: 'Chaotic, impulsive creatures that live to cause mayhem.' },
  shade:   { name: 'SHADE',   color: '#a855f7', desc: 'Dark spectral entities from beyond the veil.' },
  iron:    { name: 'IRON',    color: '#60a5fa', desc: 'Disciplined human soldiers, forged for war.' },
  vorn:    { name: 'VORN',    color: '#22d3ee', desc: 'Ancient biomechanical constructs of unknown origin.' },
};

// ── Card definitions ───────────────────────────────────────
// type 'enemy'  → deploy in opponent's arena
// type 'troop'  → deploy in your own arena
// tradeoff → the weakness / counterplay

export const CARD_DEFS = {

  // ── ENEMY CARDS ───────────────────────────────────────────

  speeder: {
    id: 'speeder', name: 'DART', type: 'enemy', cost: 2,
    rarity: 'common', arenaUnlock: 0, race: 'gremlin',
    hp: 32,  speed: 290, dmg: 6,  rate: 900,  r: 18,
    color: '#f97316', glow: '#fb923c',
    desc: 'Blazing fast & cheap. Hard to intercept.',
    tradeoff: 'Dies to a single Lancer hit. Towers shred it before it does real damage.',
    special: null,
  },

  swarmer: {
    id: 'swarmer', name: 'GREMLIN', type: 'enemy', cost: 2,
    rarity: 'common', arenaUnlock: 0, race: 'gremlin',
    hp: 18,  speed: 160, dmg: 4,  rate: 800,  r: 14,
    color: '#eab308', glow: '#facc15',
    desc: 'Spawns 3 at once. Overwhelm them.',
    tradeoff: 'One Torrent wipes the whole pack instantly.',
    special: { type: 'pack', count: 3 },
  },

  brute: {
    id: 'brute', name: 'GOLIATH', type: 'enemy', cost: 5,
    rarity: 'epic', arenaUnlock: 3, race: 'shade',
    hp: 220, speed: 58,  dmg: 22, rate: 1500, r: 34,
    color: '#8b5cf6', glow: '#a78bfa',
    desc: 'Massive tank. Hard to stop.',
    tradeoff: 'So slow that Piercers and Fury shred it before it arrives.',
    special: null,
  },

  berserker: {
    id: 'berserker', name: 'FURY', type: 'enemy', cost: 4,
    rarity: 'rare', arenaUnlock: 0, race: 'shade',
    hp: 44,  speed: 240, dmg: 38, rate: 1100, r: 21,
    color: '#ef4444', glow: '#f87171',
    desc: 'Fragile but deals enormous damage.',
    tradeoff: 'Any AOE or fast troop deletes it instantly.',
    special: null,
  },

  kamikaze: {
    id: 'kamikaze', name: 'BOMBER', type: 'enemy', cost: 3,
    rarity: 'epic', arenaUnlock: 2, race: 'gremlin',
    hp: 55,  speed: 185, dmg: 0,  rate: 9999, r: 21,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Explodes on contact. Stuns nearby troops.',
    tradeoff: 'Slow troops tank it. One Torrent neutralises the whole threat.',
    special: { type: 'kamikaze', blastR: 88, blastDmg: 32, stunMs: 2000 },
  },

  shadow: {
    id: 'shadow', name: 'WRAITH', type: 'enemy', cost: 5,
    rarity: 'rare', arenaUnlock: 1, race: 'shade',
    hp: 72,  speed: 195, dmg: 16, rate: 1000, r: 21,
    color: '#475569', glow: '#64748b',
    desc: 'Invisible for 3 sec after spawning.',
    tradeoff: 'Cloak ends the moment it enters tower range. Below-average raw stats.',
    special: { type: 'cloak', durationMs: 3000 },
  },

  // ── TROOP CARDS ───────────────────────────────────────────

  grunt: {
    id: 'grunt', name: 'LANCER', type: 'troop', cost: 2,
    rarity: 'common', arenaUnlock: 0, race: 'iron',
    hp: 55,  speed: 100, dmg: 9,  rate: 1000, r: 22,
    color: '#3b82f6', glow: '#60a5fa',
    desc: 'Solid all-rounder.',
    tradeoff: 'Unspectacular — out-valued by specialised cards at higher arenas.',
    special: null,
  },

  splasher: {
    id: 'splasher', name: 'TORRENT', type: 'troop', cost: 3,
    rarity: 'common', arenaUnlock: 0, race: 'vorn',
    hp: 42,  speed: 82,  dmg: 6,  rate: 1200, r: 22,
    color: '#06b6d4', glow: '#22d3ee',
    desc: 'AOE splash damage on attack.',
    tradeoff: 'Low single-target damage. A lone Fury deletes it.',
    special: { type: 'splash', splashR: 70 },
  },

  spawner: {
    id: 'spawner', name: 'HIVE', type: 'troop', cost: 5,
    rarity: 'epic', arenaUnlock: 3, race: 'vorn',
    hp: 85,  speed: 52,  dmg: 5,  rate: 1400, r: 27,
    color: '#2563eb', glow: '#3b82f6',
    desc: 'Periodically spawns Lancer minions.',
    tradeoff: 'Slow and fragile. Kill it fast and all minions evaporate with it.',
    special: { type: 'spawner', spawnId: 'grunt', intervalMs: 5000 },
  },

  shield_bearer: {
    id: 'shield_bearer', name: 'VANGUARD', type: 'troop', cost: 4,
    rarity: 'rare', arenaUnlock: 0, race: 'iron',
    hp: 125, speed: 68,  dmg: 7,  rate: 1300, r: 28,
    color: '#1d4ed8', glow: '#3b82f6',
    desc: 'Reduces damage taken by nearby allies.',
    tradeoff: 'Awful damage output. Useless alone — dies protecting nothing.',
    special: { type: 'shield_aura', auraR: 80, reduction: 0.3 },
  },

  healer: {
    id: 'healer', name: 'MENDER', type: 'troop', cost: 4,
    rarity: 'rare', arenaUnlock: 0, race: 'vorn',
    hp: 62,  speed: 78,  dmg: 3,  rate: 2000, r: 22,
    color: '#10b981', glow: '#34d399',
    desc: 'Heals nearby allies over time.',
    tradeoff: 'Healing is wasted without a frontline to protect. Very low HP.',
    special: { type: 'heal_aura', auraR: 90, hps: 5 },
  },

  booster: {
    id: 'booster', name: 'AMP', type: 'troop', cost: 4,
    rarity: 'epic', arenaUnlock: 2, race: 'gremlin',
    hp: 52,  speed: 78,  dmg: 4,  rate: 1200, r: 22,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Boosts damage & speed of nearby allies.',
    tradeoff: 'Fragile support. If it dies first the whole combo collapses.',
    special: { type: 'boost_aura', auraR: 85, dmgMult: 1.35, spdMult: 1.2 },
  },

  farm: {
    id: 'farm', name: 'SIPHON', type: 'troop', cost: 5,
    rarity: 'epic', arenaUnlock: 4, race: 'vorn',
    hp: 72,  speed: 0,   dmg: 0,  rate: 9999, r: 27,
    color: '#d97706', glow: '#f59e0b',
    desc: 'Stationary. Generates +1 elixir every 3 sec.',
    tradeoff: 'Purely passive — any enemy sent your way shuts it down instantly.',
    special: { type: 'income', elixirRate: 1, intervalMs: 3000 },
  },

  tank: {
    id: 'tank', name: 'FORTRESS', type: 'troop', cost: 5,
    rarity: 'rare', arenaUnlock: 1, race: 'iron',
    hp: 260, speed: 42,  dmg: 16, rate: 1500, r: 34,
    color: '#1e3a8a', glow: '#2563eb',
    desc: 'Extremely tough frontliner.',
    tradeoff: 'So slow that enemies reach your base before it reaches theirs.',
    special: null,
  },

  sniper: {
    id: 'sniper', name: 'PIERCER', type: 'troop', cost: 4,
    rarity: 'rare', arenaUnlock: 0, race: 'iron',
    hp: 48,  speed: 62,  dmg: 28, rate: 2000, r: 20,
    color: '#0f766e', glow: '#14b8a6',
    desc: 'Long range. High single-target damage.',
    tradeoff: 'Useless vs swarms. A Fury deletes it before it fires twice.',
    special: { type: 'long_range', extraRange: 180 },
  },

};

export const ALL_CARD_IDS = Object.keys(CARD_DEFS);

// 12-card starter deck: all 6 enemy types + 6 troops
export const STARTER_DECK = [
  'speeder', 'swarmer', 'berserker', 'shadow', 'kamikaze', 'brute',
  'grunt', 'splasher', 'shield_bearer', 'healer', 'sniper', 'tank',
];
