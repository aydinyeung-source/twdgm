import { uid, dist } from './engine.js';
import { CARD_DEFS, TOWER_DEFS, LANE_LEFT, LANE_RIGHT, TOWER_REGEN_RATE, TOWER_REGEN_DELAY, PATH_WP, HALF_W } from './data.js';

// ── Tower ──────────────────────────────────────────────────
export class Tower {
  constructor(def) {
    this.id         = def.id;
    this.owner      = def.owner;
    this.kind       = def.kind;
    this.x          = def.x;
    this.y          = def.y;
    this.r          = def.r;
    this.hp         = def.hp;
    this.maxHp      = def.hp;
    this.dmg        = def.dmg;
    this.range      = def.range;
    this.rate       = def.rate;
    this.cooldown   = 0;
    this.dead       = false;
    this.flashTimer = 0;
    this.target     = null;
    // Regen
    this._idleTimer = 0;  // ms since last damage taken
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this._idleTimer = 0;  // reset regen countdown
    if (this.hp === 0) { this.dead = true; }
    return this.dead;
  }

  update(dt, units) {
    if (this.dead) return null;

    const dtms = dt * 1000;
    if (this.cooldown   > 0) this.cooldown   -= dtms;
    if (this.flashTimer > 0) this.flashTimer -= dtms;

    // Regeneration: only when idle and not at full health
    if (this.hp < this.maxHp) {
      this._idleTimer += dtms;
      if (this._idleTimer >= TOWER_REGEN_DELAY) {
        this.hp = Math.min(this.maxHp, this.hp + TOWER_REGEN_RATE * dt);
      }
    }

    if (!this.target || this.target.dead ||
        dist(this.x, this.y, this.target.x, this.target.y) > this.range + this.target.r) {
      this.target = this._findTarget(units);
    }
    if (!this.target || this.cooldown > 0) return null;

    this.cooldown = this.rate;
    this.flashTimer = 120;
    return { tower: this, target: this.target };
  }

  _findTarget(units) {
    let best = null, bestDist = Infinity;
    const hostile = this.owner === 'ply' ? 'opp' : 'ply';
    const mySide  = this.x < HALF_W ? 'left' : 'right';
    for (const u of units) {
      if (u.dead || u.owner !== hostile) continue;
      if (u._side !== mySide) continue;
      if (u.cloakTimer > 0) continue;
      const d = dist(this.x, this.y, u.x, u.y);
      if (d <= this.range + u.r && d < bestDist) { bestDist = d; best = u; }
    }
    return best;
  }
}

// ── Unit ───────────────────────────────────────────────────
export class Unit {
  constructor(defId, owner, lane, levelMult = 1) {
    const def      = CARD_DEFS[defId];
    this.id        = uid();
    this.defId     = defId;
    this.owner     = owner;
    this.lane      = lane;
    this.laneX     = lane === 0 ? LANE_LEFT : LANE_RIGHT;
    this.x         = this.laneX;
    this.y         = 400;

    this.hp        = def.hp   * levelMult;
    this.maxHp     = def.hp   * levelMult;
    this.baseSpeed = def.speed;
    this.baseDmg   = def.dmg  * levelMult;
    this.rate      = def.rate;
    this.r         = def.r;
    this.color     = def.color;
    this.glow      = def.glow;
    this.special   = def.special ? { ...def.special } : null;
    this.flying    = def.flying  ?? false;
    this.antiAir   = def.antiAir ?? false;
    this.name      = def.name;

    this.dir       = owner === 'ply' ? -1 : 1;

    this.dead      = false;
    this.cooldown  = 0;
    this.stunTimer = 0;
    this.cloakTimer   = def.special?.type === 'cloak' ? def.special.durationMs : 0;
    this.spawnerTimer = 0;
    this.incomeTimer  = 0;
    this.flashTimer   = 0;

    this.shielded  = false;
    this.healRate  = 0;
    this.dmgMult   = 1;
    this.spdMult   = 1;

    this.state     = 'march';

    // Path-following fields (set by _spawnUnit before unit is live)
    this._side    = 'left';   // 'left' or 'right' canvas half
    this._xOff    = 0;        // x-offset into canvas (0 = left, HALF_W = right)
    this._wpIdx   = 0;        // current waypoint index (enemies only)
    this._isEnemy = def.type === 'enemy';
  }

  get speed() { return this.baseSpeed * this.spdMult; }
  get dmg()   { return this.baseDmg   * this.dmgMult; }
  get attackRange() {
    const base = this.r + 36;
    return this.special?.type === 'long_range' ? base + this.special.extraRange : base;
  }

  takeDamage(amount) {
    const actual = this.shielded ? amount * 0.7 : amount;
    this.hp = Math.max(0, this.hp - actual);
    if (this.hp === 0) this.dead = true;
    return actual;
  }

  stun(ms) { this.stunTimer = Math.max(this.stunTimer, ms); }

  update(dt, units, towers) {
    if (this.dead) return null;
    const dtms = dt * 1000;
    if (this.flashTimer  > 0) this.flashTimer  -= dtms;
    if (this.cloakTimer  > 0) this.cloakTimer  -= dtms;
    if (this.cooldown    > 0) this.cooldown    -= dtms;
    if (this.stunTimer   > 0) { this.stunTimer -= dtms; return null; }
    if (this.special?.type === 'income') return null;
    if (this.special?.type === 'spawner') {
      this.spawnerTimer += dtms;
      if (this.spawnerTimer >= this.special.intervalMs) {
        this.spawnerTimer -= this.special.intervalMs;
        return { action: 'spawn_minion', defId: this.special.spawnId, unit: this };
      }
    }
    return this._isEnemy ? this._updateEnemy(dt, units, towers) : this._updateDefender(dt, units);
  }

  // Enemies: follow path waypoints, stop to fight defenders in aggro range.
  // When the last waypoint is passed they attack the base directly.
  _updateEnemy(dt, units, towers) {
    const hostile    = this.owner === 'ply' ? 'opp' : 'ply';
    const aggroRange = this.r + 90;

    // Fight a nearby defender on the same side
    let unitTarget = null, unitTargetD = Infinity;
    for (const u of units) {
      if (u.dead || u.owner !== hostile || u._side !== this._side) continue;
      if (u.cloakTimer > 0) continue;
      if (u.flying && !this.antiAir) continue;
      const d = dist(this.x, this.y, u.x, u.y);
      if (d < aggroRange && d < unitTargetD) { unitTargetD = d; unitTarget = u; }
    }

    if (unitTarget) {
      this.state = 'fight';
      const d = dist(this.x, this.y, unitTarget.x, unitTarget.y);
      if (d <= this.attackRange + unitTarget.r && this.cooldown <= 0) {
        this.cooldown = this.rate; this.flashTimer = 100;
        return { action: 'attack', target: unitTarget };
      }
      const dx = unitTarget.x - this.x, dy = unitTarget.y - this.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 1) { this.x += (dx/mag)*this.speed*dt; this.y += (dy/mag)*this.speed*dt; }
      return null;
    }

    // At last waypoint – attack the base tower
    if (this._wpIdx >= PATH_WP.length) {
      this.state = 'fight';
      const baseId = this.owner === 'ply' ? 'oppKing' : 'plyKing';
      const base   = towers[baseId];
      if (base && !base.dead && this.cooldown <= 0) {
        this.cooldown = this.rate; this.flashTimer = 100;
        return { action: 'attack', target: base };
      }
      return null;
    }

    // Follow path waypoints
    this.state = 'march';
    const wp = PATH_WP[this._wpIdx];
    const tx = wp.x + this._xOff, ty = wp.y;
    const dx = tx - this.x, dy = ty - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < 8) this._wpIdx++;
    else { this.x += (dx/d)*this.speed*dt; this.y += (dy/d)*this.speed*dt; }
    return null;
  }

  // Defenders: stay in place, shoot enemies in range on the same side.
  _updateDefender(dt, units) {
    const hostile = this.owner === 'ply' ? 'opp' : 'ply';
    let best = null, bestDist = Infinity;
    for (const u of units) {
      if (u.dead || u.owner !== hostile || u._side !== this._side) continue;
      if (u.cloakTimer > 0) continue;
      if (u.flying && !this.antiAir) continue;
      const d = dist(this.x, this.y, u.x, u.y);
      if (d <= this.attackRange + u.r && d < bestDist) { bestDist = d; best = u; }
    }
    if (!best || this.cooldown > 0) return null;
    this.cooldown = this.rate; this.flashTimer = 100;
    this.state = 'fight';
    return { action: 'attack', target: best };
  }
}


// ── Projectile ─────────────────────────────────────────────
export class Projectile {
  constructor(sx, sy, targetId, dmg, speed, opts = {}) {
    this.id        = uid();
    this.x         = sx;
    this.y         = sy;
    this.targetId  = targetId;
    this.dmg       = dmg;
    this.speed     = speed;
    this.splashR   = opts.splashR   ?? 0;
    this.color     = opts.color     ?? '#facc15';
    this.r         = opts.r         ?? 5;
    this.fromTower = opts.fromTower ?? false;
    this.dead      = false;
  }

  update(dt, target) {
    if (!target || target.dead) { this.dead = true; return false; }
    const dx = target.x - this.x, dy = target.y - this.y;
    const d  = Math.hypot(dx, dy);
    if (d < this.speed * dt + this.r) { this.dead = true; return true; }
    const step = this.speed * dt;
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return false;
  }
}

// ── Build initial tower map ────────────────────────────────
export function buildTowers() {
  const out = {};
  for (const [k, def] of Object.entries(TOWER_DEFS)) {
    out[k] = new Tower(def);
  }
  return out;
}
