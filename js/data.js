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

// Tower regeneration: regen starts after TOWER_REGEN_DELAY ms of no damage
export const TOWER_REGEN_RATE  = 2;     // HP per second
export const TOWER_REGEN_DELAY = 5000;  // ms idle before regen

// ── Match constants ────────────────────────────────────────
export const MATCH_DURATION = 180;
export const ELIXIR_MAX     = 25;
export const ELIXIR_START   = 20;
export const ELIXIR_RATE    = 1.0;
export const ELIXIR_RATE_OT = 3.0;
export const HAND_SIZE      = 4;

// ── Card level system ──────────────────────────────────────
// Level 1 is base. Each level adds 10% to hp and dmg.
// LEVEL_REQS[n] = requirements to reach level n+2 (index 0 = lvl1→2)
export const MAX_LEVEL = 11;
export const LEVEL_REQS = [
  { copies:   2, coins:   20 },  // lvl  1 →  2
  { copies:   4, coins:   50 },  // lvl  2 →  3
  { copies:   8, coins:  100 },  // lvl  3 →  4
  { copies:  15, coins:  200 },  // lvl  4 →  5
  { copies:  25, coins:  350 },  // lvl  5 →  6
  { copies:  40, coins:  500 },  // lvl  6 →  7
  { copies:  60, coins:  700 },  // lvl  7 →  8
  { copies:  80, coins:  900 },  // lvl  8 →  9
  { copies: 100, coins: 1200 },  // lvl  9 → 10
  { copies: 130, coins: 1600 },  // lvl 10 → 11
];

// ── Economy ────────────────────────────────────────────────
export const COINS = {
  WIN:             30,
  LOSS:            10,
  FIRST_WIN_BONUS: 80,
  START:           200,
};

export const RARITY_SHOP_PRICE = { common: 40, rare: 100, epic: 280 };

// ── Chest definitions ──────────────────────────────────────
// slots: array of rarity pools per slot (one card copy drawn per slot)
// arenaMin: minimum trophies to purchase this chest
// arenaLevel: only draw cards with this arenaUnlock value (falls back to lower if empty)
export const CHEST_DEFS = [
  {
    id: 'wooden', name: 'Wooden', cost: 60, arenaMin: 0, arenaLevel: 0,
    slots: [['common'],['common'],['common']],
    color: '#92400e', glow: '#b45309',
    desc: '3 common cards from Iron Vale.',
  },
  {
    id: 'silver', name: 'Silver', cost: 250, arenaMin: 250, arenaLevel: 1,
    slots: [['rare'],['rare'],['rare'],['rare']],
    color: '#475569', glow: '#94a3b8',
    desc: '4 rare cards unlocked in Stone Gorge.',
  },
  {
    id: 'golden', name: 'Golden', cost: 600, arenaMin: 500, arenaLevel: 2,
    slots: [['epic'],['epic'],['epic'],['epic'],['epic']],
    color: '#d97706', glow: '#f59e0b',
    desc: '5 epic cards from Ash Fields.',
  },
  {
    id: 'epic', name: 'Epic', cost: 1200, arenaMin: 750, arenaLevel: 3,
    slots: [['epic'],['epic'],['epic'],['epic']],
    color: '#7c3aed', glow: '#a855f7',
    desc: '4 epic cards from Void Keep.',
  },
];

// ── Race definitions ───────────────────────────────────────
export const RACE_DEFS = {
  gremlin: { name: 'GREMLIN', color: '#f59e0b', desc: 'Chaotic, impulsive creatures that live to cause mayhem.' },
  shade:   { name: 'SHADE',   color: '#a855f7', desc: 'Dark spectral entities from beyond the veil.' },
  iron:    { name: 'IRON',    color: '#60a5fa', desc: 'Disciplined human soldiers, forged for war.' },
  vorn:    { name: 'VORN',    color: '#22d3ee', desc: 'Ancient biomechanical constructs of unknown origin.' },
};

// ── Arena thresholds ───────────────────────────────────────
export const ARENA_TIERS = [
  { name: 'Iron Vale',      min: 0,    max: 249,  color: '#64748b', arenaType: 'iron'   },
  { name: 'Stone Gorge',    min: 250,  max: 499,  color: '#a3a3a3', arenaType: 'stone'  },
  { name: 'Ash Fields',     min: 500,  max: 749,  color: '#b45309', arenaType: 'ash'    },
  { name: 'Void Keep',      min: 750,  max: 999,  color: '#7c3aed', arenaType: 'void'   },
  { name: 'Arcane Summit',  min: 1000, max: 1299, color: '#0891b2', arenaType: 'arcane' },
  { name: 'Sky Citadel',    min: 1300, max: Infinity, color: '#f59e0b', arenaType: 'sky' },
];

export function getArena(trophies) {
  return ARENA_TIERS.find(a => trophies >= a.min && trophies <= a.max) ?? ARENA_TIERS[0];
}

// ── Card definitions ───────────────────────────────────────
// type 'enemy'  → you deploy these in the OPPONENT's arena (offense)
// type 'troop'  → you deploy these in YOUR arena (defense)
// type 'spell'  → instant/area effect, targeted anywhere on board
// flying: true  → can only be hit by towers + antiAir troops
// antiAir: true → can target both ground and flying units
// counters      → enemy card ids this troop is effective against (display only)

export const CARD_DEFS = {

  // ── ENEMY CARDS (you spawn these to attack opponent's towers) ──

  speeder: {
    id: 'speeder', name: 'DART', type: 'enemy', cost: 4,
    rarity: 'common', arenaUnlock: 0, race: 'gremlin',
    flying: false,
    hp: 32,  speed: 290, dmg: 6,  rate: 900,  r: 18,
    color: '#f97316', glow: '#fb923c',
    desc: 'Blazing fast & cheap. Hard to intercept.',
    tradeoff: 'Dies to a single Lancer hit. Towers shred it before it does real damage.',
    counters: ['grunt'],
    special: null,
  },

  swarmer: {
    id: 'swarmer', name: 'GREMLIN', type: 'enemy', cost: 5,
    rarity: 'common', arenaUnlock: 0, race: 'gremlin',
    flying: false,
    hp: 18,  speed: 160, dmg: 4,  rate: 800,  r: 14,
    color: '#eab308', glow: '#facc15',
    desc: 'Spawns 3 at once. Overwhelm them.',
    tradeoff: 'One Torrent wipes the whole pack instantly.',
    counters: ['splasher'],
    special: { type: 'pack', count: 3 },
  },

  brute: {
    id: 'brute', name: 'GOLIATH', type: 'enemy', cost: 12,
    rarity: 'epic', arenaUnlock: 3, race: 'shade',
    flying: false,
    hp: 220, speed: 58,  dmg: 22, rate: 1500, r: 34,
    color: '#8b5cf6', glow: '#a78bfa',
    desc: 'Massive tank. Hard to stop.',
    tradeoff: 'So slow that Piercers and Fury shred it before it arrives.',
    counters: ['sniper', 'tank'],
    special: null,
  },

  berserker: {
    id: 'berserker', name: 'FURY', type: 'enemy', cost: 8,
    rarity: 'rare', arenaUnlock: 0, race: 'shade',
    flying: false,
    hp: 44,  speed: 240, dmg: 38, rate: 1100, r: 21,
    color: '#ef4444', glow: '#f87171',
    desc: 'Fragile but deals enormous damage.',
    tradeoff: 'Any AOE or fast troop deletes it instantly.',
    counters: ['shield_bearer', 'splasher'],
    special: null,
  },

  kamikaze: {
    id: 'kamikaze', name: 'BOMBER', type: 'enemy', cost: 7,
    rarity: 'epic', arenaUnlock: 2, race: 'gremlin',
    flying: false,
    hp: 55,  speed: 185, dmg: 0,  rate: 9999, r: 21,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Explodes on contact. Stuns nearby troops.',
    tradeoff: 'Slow troops tank it. One Torrent neutralises the whole threat.',
    counters: ['tank', 'splasher'],
    special: { type: 'kamikaze', blastR: 88, blastDmg: 32, stunMs: 2000 },
  },

  shadow: {
    id: 'shadow', name: 'WRAITH', type: 'enemy', cost: 10,
    rarity: 'rare', arenaUnlock: 1, race: 'shade',
    flying: false,
    hp: 72,  speed: 195, dmg: 16, rate: 1000, r: 21,
    color: '#475569', glow: '#64748b',
    desc: 'Invisible for 3 sec after spawning.',
    tradeoff: 'Cloak ends the moment it enters tower range. Below-average raw stats.',
    counters: ['splasher', 'healer'],
    special: { type: 'cloak', durationMs: 3000 },
  },

  // ── AIR ENEMY CARDS ────────────────────────────────────────

  wasp: {
    id: 'wasp', name: 'DRONE', type: 'enemy', cost: 4,
    rarity: 'common', arenaUnlock: 0, race: 'gremlin',
    flying: true,
    hp: 22,  speed: 200, dmg: 5,  rate: 850,  r: 14,
    color: '#84cc16', glow: '#a3e635',
    desc: 'Pack of 3 flying drones. Bypasses ground troops.',
    tradeoff: 'Any anti-air troop hard-counters the whole pack.',
    counters: ['archer', 'aegis'],
    special: { type: 'pack', count: 3 },
  },

  phantom: {
    id: 'phantom', name: 'SPECTER', type: 'enemy', cost: 9,
    rarity: 'rare', arenaUnlock: 1, race: 'shade',
    flying: true,
    hp: 60,  speed: 220, dmg: 14, rate: 1100, r: 20,
    color: '#6366f1', glow: '#818cf8',
    desc: 'Fast flying unit. Ground troops cannot touch it.',
    tradeoff: 'Interceptor hard-counters it. Low HP for its cost.',
    counters: ['archer', 'aegis'],
    special: { type: 'cloak', durationMs: 2000 },
  },

  // ── TROOP CARDS (you deploy in your arena to defend) ──────

  grunt: {
    id: 'grunt', name: 'LANCER', type: 'troop', cost: 4,
    rarity: 'common', arenaUnlock: 0, race: 'iron',
    flying: false, antiAir: false,
    hp: 55,  speed: 100, dmg: 9,  rate: 1000, r: 22,
    color: '#3b82f6', glow: '#60a5fa',
    desc: 'Solid all-rounder. Counters fast single units.',
    tradeoff: 'Unspectacular — out-valued by specialised cards at higher arenas.',
    special: null,
  },

  splasher: {
    id: 'splasher', name: 'TORRENT', type: 'troop', cost: 6,
    rarity: 'common', arenaUnlock: 0, race: 'vorn',
    flying: false, antiAir: false,
    hp: 42,  speed: 82,  dmg: 6,  rate: 1200, r: 22,
    color: '#06b6d4', glow: '#22d3ee',
    desc: 'AOE splash damage. Shreds swarms and invisible units.',
    tradeoff: 'Low single-target damage. A lone Fury deletes it.',
    special: { type: 'splash', splashR: 70 },
  },

  spawner: {
    id: 'spawner', name: 'HIVE', type: 'troop', cost: 12,
    rarity: 'epic', arenaUnlock: 3, race: 'vorn',
    flying: false, antiAir: false,
    hp: 85,  speed: 52,  dmg: 5,  rate: 1400, r: 27,
    color: '#2563eb', glow: '#3b82f6',
    desc: 'Periodically spawns Lancer minions.',
    tradeoff: 'Slow and fragile. Kill it fast and all minions evaporate with it.',
    special: { type: 'spawner', spawnId: 'grunt', intervalMs: 5000 },
  },

  shield_bearer: {
    id: 'shield_bearer', name: 'VANGUARD', type: 'troop', cost: 8,
    rarity: 'rare', arenaUnlock: 0, race: 'iron',
    flying: false, antiAir: false,
    hp: 125, speed: 68,  dmg: 7,  rate: 1300, r: 28,
    color: '#1d4ed8', glow: '#3b82f6',
    desc: 'Reduces damage taken by nearby allies by 30%.',
    tradeoff: 'Awful damage output. Useless alone — dies protecting nothing.',
    special: { type: 'shield_aura', auraR: 80, reduction: 0.3 },
  },

  healer: {
    id: 'healer', name: 'MENDER', type: 'troop', cost: 8,
    rarity: 'rare', arenaUnlock: 0, race: 'vorn',
    flying: false, antiAir: false,
    hp: 62,  speed: 78,  dmg: 3,  rate: 2000, r: 22,
    color: '#10b981', glow: '#34d399',
    desc: 'Heals nearby allies. Counters attrition enemies.',
    tradeoff: 'Healing is wasted without a frontline to protect. Very low HP.',
    special: { type: 'heal_aura', auraR: 90, hps: 5 },
  },

  booster: {
    id: 'booster', name: 'AMP', type: 'troop', cost: 9,
    rarity: 'epic', arenaUnlock: 2, race: 'gremlin',
    flying: false, antiAir: false,
    hp: 52,  speed: 78,  dmg: 4,  rate: 1200, r: 22,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Boosts damage & speed of nearby allies.',
    tradeoff: 'Fragile support. If it dies first the whole combo collapses.',
    special: { type: 'boost_aura', auraR: 85, dmgMult: 1.35, spdMult: 1.2 },
  },

  farm: {
    id: 'farm', name: 'SIPHON', type: 'troop', cost: 9,
    rarity: 'epic', arenaUnlock: 4, race: 'vorn',
    flying: false, antiAir: false,
    hp: 72,  speed: 0,   dmg: 0,  rate: 9999, r: 27,
    color: '#d97706', glow: '#f59e0b',
    desc: 'Stationary. Generates +1 elixir every 3 sec.',
    tradeoff: 'Purely passive — any enemy sent your way shuts it down instantly.',
    special: { type: 'income', elixirRate: 1, intervalMs: 3000 },
  },

  tank: {
    id: 'tank', name: 'FORTRESS', type: 'troop', cost: 12,
    rarity: 'rare', arenaUnlock: 1, race: 'iron',
    flying: false, antiAir: false,
    hp: 260, speed: 42,  dmg: 16, rate: 1500, r: 34,
    color: '#1e3a8a', glow: '#2563eb',
    desc: 'Extremely tough. Tanks Bomber blasts easily.',
    tradeoff: 'So slow that enemies reach your base before it reaches theirs.',
    special: null,
  },

  sniper: {
    id: 'sniper', name: 'PIERCER', type: 'troop', cost: 8,
    rarity: 'rare', arenaUnlock: 0, race: 'iron',
    flying: false, antiAir: false,
    hp: 48,  speed: 62,  dmg: 28, rate: 2000, r: 20,
    color: '#0f766e', glow: '#14b8a6',
    desc: 'Long range. High single-target damage. Melts Goliath.',
    tradeoff: 'Useless vs swarms. A Fury deletes it before it fires twice.',
    special: { type: 'long_range', extraRange: 180 },
  },

  // ── ANTI-AIR TROOP CARDS ────────────────────────────────────

  archer: {
    id: 'archer', name: 'INTERCEPTOR', type: 'troop', cost: 5,
    rarity: 'common', arenaUnlock: 0, race: 'iron',
    flying: false, antiAir: true,
    hp: 45,  speed: 90,  dmg: 12, rate: 1100, r: 20,
    color: '#64748b', glow: '#94a3b8',
    desc: 'Targets both ground AND air enemies. Essential vs air.',
    tradeoff: 'Average stats vs ground targets. Specialised for air duty.',
    special: { type: 'long_range', extraRange: 60 },
  },

  aegis: {
    id: 'aegis', name: 'AEGIS', type: 'troop', cost: 9,
    rarity: 'rare', arenaUnlock: 1, race: 'vorn',
    flying: false, antiAir: true,
    hp: 78,  speed: 55,  dmg: 10, rate: 1400, r: 24,
    color: '#0d9488', glow: '#14b8a6',
    desc: 'AOE anti-air. Wipes entire drone packs in one burst.',
    tradeoff: 'Slow to reposition. Overkill vs single ground targets.',
    special: { type: 'splash', splashR: 85 },
  },

  // ── BUILDING CARDS (stationary structures, distract enemies) ──

  wall: {
    id: 'wall', name: 'WALL', type: 'building', cost: 4,
    rarity: 'common', arenaUnlock: 0, race: 'iron',
    building: true, flying: false, antiAir: false,
    hp: 300, speed: 0, dmg: 0, rate: 9999, r: 28,
    color: '#94a3b8', glow: '#cbd5e1',
    desc: 'Tough stationary barrier. Forces enemies to attack it.',
    counters: [],
    special: null,
  },

  cannon: {
    id: 'cannon', name: 'CANNON', type: 'building', cost: 8,
    rarity: 'rare', arenaUnlock: 1, race: 'iron',
    building: true, flying: false, antiAir: false,
    hp: 140, speed: 0, dmg: 18, rate: 1400, r: 26,
    color: '#475569', glow: '#64748b',
    desc: 'Stationary cannon. Shoots enemies in range.',
    counters: [],
    special: { type: 'long_range', extraRange: 100 },
  },

  bombhouse: {
    id: 'bombhouse', name: 'BOMBHOUSE', type: 'building', cost: 11,
    rarity: 'epic', arenaUnlock: 2, race: 'gremlin',
    building: true, flying: false, antiAir: false,
    hp: 200, speed: 0, dmg: 8, rate: 1800, r: 28,
    color: '#f59e0b', glow: '#fbbf24',
    desc: 'Explodes when destroyed, dealing massive area damage.',
    counters: [],
    special: { type: 'kamikaze', blastR: 110, blastDmg: 80, stunMs: 1500 },
  },

  // ── SPELL CARDS (instant/area effects, cast anywhere) ────────

  fireball: {
    id: 'fireball', name: 'FIREBALL', type: 'spell', cost: 7,
    rarity: 'rare', arenaUnlock: 0, race: null,
    hp: 0, speed: 0, dmg: 120, rate: 0, r: 0,
    color: '#f97316', glow: '#fb923c',
    desc: 'Area fire damage at target location. Hits units and towers.',
    counters: [],
    special: { type: 'spell_aoe', radius: 85, dmg: 120 },
  },

  rocket: {
    id: 'rocket', name: 'ROCKET', type: 'spell', cost: 12,
    rarity: 'epic', arenaUnlock: 2, race: null,
    hp: 0, speed: 0, dmg: 380, rate: 0, r: 0,
    color: '#ef4444', glow: '#f87171',
    desc: 'Devastating blast at target. Shreds tanks and towers.',
    counters: [],
    special: { type: 'spell_aoe', radius: 45, dmg: 380 },
  },

  tornado: {
    id: 'tornado', name: 'TORNADO', type: 'spell', cost: 7,
    rarity: 'epic', arenaUnlock: 2, race: null,
    hp: 0, speed: 0, dmg: 12, rate: 0, r: 0,
    color: '#a78bfa', glow: '#c4b5fd',
    desc: 'Pulls enemies toward its center for 2.5s.',
    counters: [],
    special: { type: 'spell_tornado', radius: 130, duration: 2500, strength: 180, dmg: 12 },
  },

  freeze: {
    id: 'freeze', name: 'FREEZE', type: 'spell', cost: 8,
    rarity: 'epic', arenaUnlock: 1, race: null,
    hp: 0, speed: 0, dmg: 0, rate: 0, r: 0,
    color: '#93c5fd', glow: '#bfdbfe',
    desc: 'Freezes all enemies in area for 2.5 seconds.',
    counters: [],
    special: { type: 'spell_stun', radius: 110, stunMs: 2500 },
  },

  vines: {
    id: 'vines', name: 'VINES', type: 'spell', cost: 5,
    rarity: 'rare', arenaUnlock: 0, race: null,
    hp: 0, speed: 0, dmg: 35, rate: 0, r: 0,
    color: '#4ade80', glow: '#86efac',
    desc: 'Roots and damages enemies in area for 3 seconds.',
    counters: [],
    special: { type: 'spell_stun', radius: 95, stunMs: 3000, dmg: 35 },
  },

};

export const ALL_CARD_IDS = Object.keys(CARD_DEFS);

// 12-card starter deck: 6 enemies + 3 troops + 2 spells + 1 building
export const STARTER_DECK = [
  'speeder', 'swarmer', 'berserker', 'shadow', 'wasp', 'kamikaze',
  'grunt', 'splasher', 'healer', 'wall', 'fireball', 'vines',
];
