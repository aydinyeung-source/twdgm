import { CW, CH, HALF_W, PATH_WP, CELL, VALID_CELLS, ENEMY_SPAWN_MS, CARD_DEFS } from './data.js';
import { clamp } from './engine.js';

// Palette
const PAL = {
  arenaOpp:    '#0b1f36',
  arenaOpp2:   '#0d2340',
  arenaPly:    '#081828',
  arenaPly2:   '#0a1c2e',
  riverDark:   '#07304d',
  riverMid:    '#0a4a70',
  riverLight:  '#1a6fa0',
  bridgeWood:  '#5c3d1e',
  bridgePlank: '#3d2610',
  wallShadow:  'rgba(0,0,0,0.45)',

  towerOpp:    '#8b1a1a',
  towerOppRim: '#ef4444',
  towerPly:    '#1a3d7a',
  towerPlyRim: '#3b82f6',

  timerBg:     'rgba(8,24,40,0.82)',
  timerBorder: 'rgba(125,200,240,0.2)',

  hpGreen:     '#22c55e',
  hpOrange:    '#f59e0b',
  hpRed:       '#ef4444',
  hpBluePly:   '#3b82f6',
  hpRedOpp:    '#ef4444',
};

// Unit visual styles (no emojis — pure canvas shapes)
const UNIT_STYLE = {
  speeder:      { body: '#f97316', rim: '#fed7aa', shape: 'arrow' },
  swarmer:      { body: '#eab308', rim: '#fef08a', shape: 'circle' },
  brute:        { body: '#7c3aed', rim: '#c4b5fd', shape: 'hexagon' },
  berserker:    { body: '#dc2626', rim: '#fca5a5', shape: 'star' },
  kamikaze:     { body: '#f59e0b', rim: '#fde68a', shape: 'cross' },
  shadow:       { body: '#334155', rim: '#94a3b8', shape: 'circle' },
  grunt:        { body: '#2563eb', rim: '#93c5fd', shape: 'shield' },
  splasher:     { body: '#0891b2', rim: '#67e8f9', shape: 'circle' },
  spawner:      { body: '#1d4ed8', rim: '#93c5fd', shape: 'hexagon' },
  shield_bearer:{ body: '#1e40af', rim: '#bfdbfe', shape: 'shield' },
  healer:       { body: '#059669', rim: '#6ee7b7', shape: 'cross' },
  booster:      { body: '#d97706', rim: '#fde68a', shape: 'diamond' },
  farm:         { body: '#92400e', rim: '#fcd34d', shape: 'square' },
  tank:         { body: '#1e3a8a', rim: '#60a5fa', shape: 'hexagon' },
  sniper:       { body: '#0f766e', rim: '#5eead4', shape: 'triangle' },
  wasp:         { body: '#84cc16', rim: '#a3e635', shape: 'triangle' },
  phantom:      { body: '#6366f1', rim: '#818cf8', shape: 'circle'   },
  archer:       { body: '#64748b', rim: '#94a3b8', shape: 'diamond'  },
  aegis:        { body: '#0d9488', rim: '#14b8a6', shape: 'hexagon'  },
  wall:         { body: '#64748b', rim: '#94a3b8', shape: 'square'   },
  cannon:       { body: '#334155', rim: '#64748b', shape: 'square'   },
  bombhouse:    { body: '#78350f', rim: '#f59e0b', shape: 'square'   },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._t     = 0;
    this.scale  = 1;
    canvas.width  = CW;
    canvas.height = CH;
  }

  tickTime(dt) { this._t += dt; }

  // ── Full frame ──────────────────────────────────────────
  frame(state, particles) {
    const { ctx } = this;
    ctx.clearRect(0, 0, CW, CH);
    this._drawBackground();
    this._drawGrid();
    this._drawPaths();
    this._drawDivider();
    if (state.showValidCells) this._drawValidCells(state);
    this._drawTowers(state.towers);
    this._drawUnits(state.units);
    this._drawProjectiles(state.projectiles);
    particles.draw(ctx);
    if (state.dragPreview) this._drawDragPreview(state.dragPreview);
    this._drawOverlay(state);
  }

  // ── Background ──────────────────────────────────────────
  _drawBackground() {
    const { ctx } = this;
    const T = 32;
    for (let ty = 0; ty < CH; ty += T) {
      for (let tx = 0; tx < CW; tx += T) {
        const isLeft = tx < HALF_W;
        const odd = (Math.floor(tx/T) + Math.floor(ty/T)) % 2;
        ctx.fillStyle = isLeft
          ? (odd ? PAL.arenaPly : PAL.arenaPly2)
          : (odd ? PAL.arenaOpp : PAL.arenaOpp2);
        ctx.fillRect(tx, ty, T, T);
      }
    }
    ctx.fillStyle = 'rgba(59,130,246,0.04)';
    ctx.fillRect(0, 0, HALF_W, CH);
    ctx.fillStyle = 'rgba(239,68,68,0.04)';
    ctx.fillRect(HALF_W, 0, HALF_W, CH);
  }

  // ── Drag preview ghost (unit silhouette on canvas during drag) ─
  _drawDragPreview(p) {
    const { ctx } = this;
    const style   = UNIT_STYLE[p.defId] ?? { body: p.color, rim: '#fff', shape: 'circle' };
    const ringColor = p.valid ? '#34d399' : '#ef4444';

    ctx.save();

    if (p.type === 'spell') {
      // AOE ring for spells
      ctx.globalAlpha = 0.25;
      ctx.fillStyle   = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.spellRadius ?? 60, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.spellRadius ?? 60, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Unit silhouette
      ctx.globalAlpha  = p.valid ? 0.72 : 0.35;
      ctx.shadowBlur   = 22;
      ctx.shadowColor  = ringColor;
      ctx.fillStyle    = style.body;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      // Pulsing rim
      ctx.globalAlpha  = p.valid ? 0.95 : 0.5;
      ctx.strokeStyle  = ringColor;
      ctx.lineWidth    = 2.5;
      ctx.shadowBlur   = 12;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
  }

  // ── Valid cell highlights (shown when defender card is selected) ─
  _drawValidCells(state) {
    const { ctx } = this;
    ctx.save();
    // Faint tint on every valid cell
    ctx.fillStyle = 'rgba(52,211,153,0.10)';
    for (const c of VALID_CELLS) {
      ctx.fillRect(c.cx - CELL/2 + 1, c.cy - CELL/2 + 1, CELL - 2, CELL - 2);
    }
    // Bright highlight on the hovered cell
    if (state.hovCell) {
      const { cx, cy } = state.hovCell;
      const x = cx - CELL/2 + 1, y = cy - CELL/2 + 1, s = CELL - 2;
      ctx.fillStyle = 'rgba(52,211,153,0.40)';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5);
    }
    ctx.restore();
  }

  // ── Defender grid (left side only) ──────────────────────
  _drawGrid() {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.10)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= HALF_W; gx += CELL) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke();
    }
    for (let gy = 0; gy <= CH; gy += CELL) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(HALF_W, gy); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Enemy paths (both sides) ─────────────────────────────
  _drawPaths() {
    this._drawOnePath(0);       // left: opponent's enemies travel here
    this._drawOnePath(HALF_W);  // right: player's enemies travel here
  }

  _drawOnePath(xOff) {
    const { ctx } = this;
    const isLeft = xOff === 0;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Glow border
    ctx.strokeStyle = isLeft ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)';
    ctx.lineWidth = 42;
    ctx.beginPath();
    PATH_WP.forEach((p, i) => i === 0 ? ctx.moveTo(p.x+xOff, p.y) : ctx.lineTo(p.x+xOff, p.y));
    ctx.stroke();

    // Dark dirt floor
    ctx.strokeStyle = isLeft ? '#110a0a' : '#0a0a11';
    ctx.lineWidth = 34;
    ctx.beginPath();
    PATH_WP.forEach((p, i) => i === 0 ? ctx.moveTo(p.x+xOff, p.y) : ctx.lineTo(p.x+xOff, p.y));
    ctx.stroke();

    // Lighter center strip
    ctx.strokeStyle = isLeft ? '#1c0e0e' : '#0e0e1c';
    ctx.lineWidth = 22;
    ctx.beginPath();
    PATH_WP.forEach((p, i) => i === 0 ? ctx.moveTo(p.x+xOff, p.y) : ctx.lineTo(p.x+xOff, p.y));
    ctx.stroke();

    // Edge highlight
    ctx.strokeStyle = isLeft ? 'rgba(239,68,68,0.22)' : 'rgba(59,130,246,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    PATH_WP.forEach((p, i) => i === 0 ? ctx.moveTo(p.x+xOff, p.y) : ctx.lineTo(p.x+xOff, p.y));
    ctx.stroke();

    ctx.restore();

    // Animated entry arrow at path start
    const ep = PATH_WP[0];
    const pulse = 0.65 + 0.35 * Math.sin(this._t * 3.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = isLeft ? '#f87171' : '#60a5fa';
    ctx.beginPath();
    const ax = ep.x + xOff, ay = ep.y - 24;
    ctx.moveTo(ax, ay + 14); ctx.lineTo(ax - 9, ay); ctx.lineTo(ax + 9, ay);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Center divider ───────────────────────────────────────
  _drawDivider() {
    const { ctx } = this;
    ctx.save();
    const g = ctx.createLinearGradient(HALF_W - 1, 0, HALF_W + 1, 0);
    g.addColorStop(0,   'rgba(59,130,246,0.5)');
    g.addColorStop(0.5, 'rgba(200,200,255,0.8)');
    g.addColorStop(1,   'rgba(239,68,68,0.5)');
    ctx.strokeStyle = g;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(HALF_W, 0);
    ctx.lineTo(HALF_W, CH);
    ctx.stroke();
    ctx.restore();
  }

  // ── Towers (bases at path ends) ──────────────────────────
  _drawTowers(towers) {
    if (!towers) return;
    for (const t of Object.values(towers)) {
      t.dead ? this._drawDestroyedTower(t) : this._drawTower(t);
    }
  }

  _drawTower(t) {
    const { ctx } = this;
    const isOpp   = t.owner === 'opp';
    const baseCol = isOpp ? PAL.towerOpp    : PAL.towerPly;
    const rimCol  = isOpp ? PAL.towerOppRim : PAL.towerPlyRim;
    const flash   = t.flashTimer > 0;
    const isKing  = t.kind === 'king';

    // Drop shadow
    ctx.save();
    ctx.shadowBlur  = flash ? 35 : 22;
    ctx.shadowColor = flash ? '#ffffff' : rimCol;

    // Outer platform
    ctx.beginPath();
    if (isKing) _hexPath(ctx, t.x, t.y, t.r + 8);
    else        _hexPath(ctx, t.x, t.y, t.r + 6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // Body
    const grd = ctx.createRadialGradient(t.x - t.r*0.3, t.y - t.r*0.4, 0, t.x, t.y, t.r);
    grd.addColorStop(0, flash ? '#ffffff' : _lighten(baseCol, 55));
    grd.addColorStop(0.6, baseCol);
    grd.addColorStop(1, _darken(baseCol, 30));
    ctx.beginPath();
    if (isKing) _hexPath(ctx, t.x, t.y, t.r);
    else        _hexPath(ctx, t.x, t.y, t.r);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();

    // Rim
    ctx.beginPath();
    if (isKing) _hexPath(ctx, t.x, t.y, t.r);
    else        _hexPath(ctx, t.x, t.y, t.r);
    ctx.strokeStyle = rimCol;
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Battlements
    const bCount = isKing ? 6 : 4;
    for (let i = 0; i < bCount; i++) {
      const angle = (i / bCount) * Math.PI * 2;
      const bx = t.x + Math.cos(angle) * (t.r + 4);
      const by = t.y + Math.sin(angle) * (t.r + 4);
      ctx.beginPath();
      ctx.arc(bx, by, isKing ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = rimCol;
      ctx.fill();
    }

    // Inner icon
    if (isKing) _drawCrown(ctx, t.x, t.y, t.r * 0.48, rimCol);
    else        _drawTower2D(ctx, t.x, t.y, t.r * 0.38, rimCol);

    // HP bar
    const ratio = t.hp / t.maxHp;
    const bw = t.r * 2.2, bx = t.x - bw/2, by2 = t.y + t.r + 8;
    _hpBar(ctx, bx, by2, bw, 5, ratio, rimCol);
  }

  _drawDestroyedTower(t) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    _hexPath(ctx, t.x, t.y, t.r);
    ctx.fillStyle = '#2d3748';
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.stroke();
    // X mark
    ctx.strokeStyle = '#718096';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    const d = t.r * 0.4;
    ctx.beginPath(); ctx.moveTo(t.x-d, t.y-d); ctx.lineTo(t.x+d, t.y+d); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(t.x+d, t.y-d); ctx.lineTo(t.x-d, t.y+d); ctx.stroke();
    ctx.restore();
  }

  // ── Units ────────────────────────────────────────────────
  _drawUnits(units) {
    for (const u of units) {
      if (u.dead) continue;
      if (u.cloakTimer > 0 && u.owner === 'opp') continue;
      this._drawUnit(u);
    }
  }

  _drawUnit(u) {
    const { ctx } = this;
    const style = UNIT_STYLE[u.defId] ?? { body: u.color, rim: '#fff', shape: 'circle' };
    const flash = u.flashTimer > 0;
    const cloaked = u.cloakTimer > 0;
    const spawning = u.spawnTimer > 0;
    const spawnProg = spawning ? Math.max(0, 1 - u.spawnTimer / ENEMY_SPAWN_MS) : 1;

    ctx.save();
    if (spawning) ctx.globalAlpha = 0.15 + spawnProg * 0.75;
    else if (cloaked) ctx.globalAlpha = 0.32;

    // Glow
    ctx.shadowBlur  = u.stunTimer > 0 ? 18 : flash ? 22 : 10;
    ctx.shadowColor = u.stunTimer > 0 ? '#fbbf24' : style.rim;

    // Owner ring
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.r + 4, 0, Math.PI * 2);
    ctx.fillStyle = u.owner === 'ply'
      ? 'rgba(59,130,246,0.22)'
      : 'rgba(239,68,68,0.22)';
    ctx.fill();

    // Body
    const grd = ctx.createRadialGradient(u.x - u.r*0.28, u.y - u.r*0.28, 0, u.x, u.y, u.r);
    grd.addColorStop(0, flash ? '#fff' : _lighten(style.body, 50));
    grd.addColorStop(1, style.body);
    _drawShape(ctx, u.x, u.y, u.r, style.shape, grd);

    // Rim stroke
    ctx.strokeStyle = u.owner === 'ply' ? '#60a5fa' : '#f87171';
    ctx.lineWidth = 1.8;
    _strokeShape(ctx, u.x, u.y, u.r, style.shape);

    // Inner detail icon (small canvas shape, not emoji)
    ctx.shadowBlur = 0;
    _drawUnitDetail(ctx, u.defId, u.x, u.y, u.r * 0.42, style.rim);

    // Aura ring
    if (u.special?.type === 'heal_aura' || u.special?.type === 'shield_aura' || u.special?.type === 'boost_aura') {
      const pulse = 0.07 + 0.04 * Math.sin(this._t * 2.5);
      ctx.save();
      ctx.globalAlpha = cloaked ? 0.12 : pulse;
      ctx.strokeStyle = style.rim;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.special.auraR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();

    // Spawn ring: large circle collapses inward as the unit materialises
    if (spawning) {
      const t = 1 - spawnProg;           // 1 at spawn → 0 when ready
      const ringR = u.r * (1 + t * 3.2); // collapses from 4.2× to 1× radius
      ctx.save();
      ctx.globalAlpha  = t * 0.9;
      ctx.shadowBlur   = 20;
      ctx.shadowColor  = u.glow ?? u.color;
      ctx.strokeStyle  = u.color;
      ctx.lineWidth    = 3 + t * 4;
      ctx.beginPath(); ctx.arc(u.x, u.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha  = t * 0.5;
      ctx.lineWidth    = 1.5;
      ctx.beginPath(); ctx.arc(u.x, u.y, ringR * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // HP bar (always opaque, hidden during spawn)
    if (!spawning) {
      const hpColor = u.owner === 'ply' ? PAL.hpBluePly : PAL.hpRedOpp;
      _hpBar(ctx, u.x - u.r, u.y - u.r - 9, u.r * 2, 4, u.hp / u.maxHp, hpColor);
    }

    // Flying indicator (small wing shape above unit)
    if (u.flying) {
      ctx.save();
      ctx.fillStyle = '#a3e635';
      ctx.globalAlpha = cloaked ? 0.15 : 0.8;
      const wx = u.x, wy = u.y - u.r - 13, ws = 5;
      ctx.beginPath();
      ctx.moveTo(wx, wy); ctx.lineTo(wx - ws*1.4, wy + ws*0.8);
      ctx.lineTo(wx - ws*0.5, wy + ws*0.2); ctx.lineTo(wx, wy + ws*1.2);
      ctx.lineTo(wx + ws*0.5, wy + ws*0.2); ctx.lineTo(wx + ws*1.4, wy + ws*0.8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Stun flash
    if (u.stunTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ZAP', u.x, u.y - u.r - 16);
      ctx.restore();
    }
  }

  // ── Projectiles ──────────────────────────────────────────
  _drawProjectiles(projs) {
    const { ctx } = this;
    for (const p of projs) {
      if (p.dead) continue;
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Bright core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Canvas overlay (timer, side labels) ─────────────────
  _drawOverlay(state) {
    const { ctx } = this;

    // Side labels
    ctx.save();
    ctx.font = 'bold 10px Nunito, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(100,160,240,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText('YOUR DEFENSE', 6, 6);
    ctx.fillStyle = 'rgba(240,100,100,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(state.oppName ? state.oppName.toUpperCase() : 'OPPONENT', CW - 6, 6);
    ctx.restore();

    // Timer badge centred on the divider line
    const secs = Math.max(0, Math.ceil(state.timeLeft));
    const mm   = Math.floor(secs / 60);
    const ss   = String(secs % 60).padStart(2, '0');
    const label = state.overtime ? `OT ${mm}:${ss}` : `${mm}:${ss}`;
    const isOT    = state.overtime;
    const lowTime = !isOT && secs <= 30;

    const bw = 76, bh = 26, bx = CW/2 - bw/2, by = 4;
    ctx.save();
    ctx.fillStyle = isOT ? 'rgba(220,38,38,0.92)' : lowTime ? 'rgba(245,158,11,0.92)' : PAL.timerBg;
    _rrect(ctx, bx, by, bw, bh, 7); ctx.fill();
    ctx.strokeStyle = isOT ? '#ef4444' : PAL.timerBorder;
    ctx.lineWidth = 1;
    _rrect(ctx, bx, by, bw, bh, 7); ctx.stroke();
    ctx.fillStyle = isOT ? '#fff' : lowTime ? '#fff' : '#f5c518';
    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, CW/2, by + bh/2);
    ctx.restore();
  }

  // ── HP bar (shared) ──────────────────────────────────────
  _drawHpBar(x, y, w, h, ratio, color) {
    _hpBar(this.ctx, x, y, w, h, ratio, color);
  }

  resize(containerW, containerH) {
    const sx = containerW / CW, sy = containerH / CH;
    this.scale = Math.min(sx, sy, 1.6);
    this.canvas.style.width  = `${CW * this.scale}px`;
    this.canvas.style.height = `${CH * this.scale}px`;
  }
}

// ── Shape drawing helpers ────────────────────────────────────

function _drawShape(ctx, x, y, r, shape, fill) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':  ctx.arc(x, y, r, 0, Math.PI*2); break;
    case 'diamond': _diamondPath(ctx, x, y, r); break;
    case 'triangle':_triPath(ctx, x, y, r); break;
    case 'hexagon': _hexPath(ctx, x, y, r); break;
    case 'star':    _starPath(ctx, x, y, r, 5); break;
    case 'cross':   _crossPath(ctx, x, y, r); break;
    case 'shield':  _shieldPath(ctx, x, y, r); break;
    case 'square':  ctx.rect(x-r, y-r, r*2, r*2); break;
    case 'arrow':   _arrowPath(ctx, x, y, r); break;
    default:        ctx.arc(x, y, r, 0, Math.PI*2);
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function _strokeShape(ctx, x, y, r, shape) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':  ctx.arc(x, y, r, 0, Math.PI*2); break;
    case 'diamond': _diamondPath(ctx, x, y, r); break;
    case 'triangle':_triPath(ctx, x, y, r); break;
    case 'hexagon': _hexPath(ctx, x, y, r); break;
    case 'star':    _starPath(ctx, x, y, r, 5); break;
    case 'cross':   _crossPath(ctx, x, y, r); break;
    case 'shield':  _shieldPath(ctx, x, y, r); break;
    case 'square':  ctx.rect(x-r, y-r, r*2, r*2); break;
    case 'arrow':   _arrowPath(ctx, x, y, r); break;
    default:        ctx.arc(x, y, r, 0, Math.PI*2);
  }
  ctx.stroke();
}

function _arrowPath(ctx, x, y, r) {
  // Dart/arrow pointing right
  ctx.moveTo(x + r, y);
  ctx.lineTo(x - r * 0.3, y - r * 0.55);
  ctx.lineTo(x - r * 0.3, y - r * 0.2);
  ctx.lineTo(x - r, y - r * 0.2);
  ctx.lineTo(x - r, y + r * 0.2);
  ctx.lineTo(x - r * 0.3, y + r * 0.2);
  ctx.lineTo(x - r * 0.3, y + r * 0.55);
  ctx.closePath();
}

function _hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(x + Math.cos(a)*r, y + Math.sin(a)*r)
            : ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
  }
  ctx.closePath();
}

function _diamondPath(ctx, x, y, r) {
  ctx.moveTo(x, y-r);
  ctx.lineTo(x+r*0.7, y);
  ctx.lineTo(x, y+r);
  ctx.lineTo(x-r*0.7, y);
  ctx.closePath();
}

function _triPath(ctx, x, y, r) {
  ctx.moveTo(x, y-r);
  ctx.lineTo(x+r*0.87, y+r*0.5);
  ctx.lineTo(x-r*0.87, y+r*0.5);
  ctx.closePath();
}

function _starPath(ctx, x, y, r, pts) {
  const inner = r * 0.42;
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts*2)) * Math.PI*2 - Math.PI/2;
    const d = i % 2 === 0 ? r : inner;
    i === 0 ? ctx.moveTo(x+Math.cos(a)*d, y+Math.sin(a)*d)
            : ctx.lineTo(x+Math.cos(a)*d, y+Math.sin(a)*d);
  }
  ctx.closePath();
}

function _crossPath(ctx, x, y, r) {
  const t = r * 0.3;
  ctx.moveTo(x-t, y-r); ctx.lineTo(x+t, y-r);
  ctx.lineTo(x+t, y-t); ctx.lineTo(x+r, y-t);
  ctx.lineTo(x+r, y+t); ctx.lineTo(x+t, y+t);
  ctx.lineTo(x+t, y+r); ctx.lineTo(x-t, y+r);
  ctx.lineTo(x-t, y+t); ctx.lineTo(x-r, y+t);
  ctx.lineTo(x-r, y-t); ctx.lineTo(x-t, y-t);
  ctx.closePath();
}

function _shieldPath(ctx, x, y, r) {
  ctx.moveTo(x, y-r);
  ctx.bezierCurveTo(x+r, y-r, x+r, y, x+r, y+r*0.2);
  ctx.quadraticCurveTo(x+r*0.5, y+r*1.2, x, y+r);
  ctx.quadraticCurveTo(x-r*0.5, y+r*1.2, x-r, y+r*0.2);
  ctx.bezierCurveTo(x-r, y, x-r, y-r, x, y-r);
  ctx.closePath();
}

// Unit detail icons (small inner symbol)
function _drawUnitDetail(ctx, defId, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = Math.max(1, s * 0.25);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  switch (defId) {
    case 'grunt':
    case 'berserker': // sword
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
      ctx.moveTo(x-s*0.6, y-s*0.2); ctx.lineTo(x+s*0.6, y-s*0.2);
      ctx.stroke(); break;
    case 'sniper': // arrow
      ctx.beginPath();
      ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
      ctx.moveTo(x+s*0.4, y-s*0.5); ctx.lineTo(x+s, y); ctx.lineTo(x+s*0.4, y+s*0.5);
      ctx.stroke(); break;
    case 'healer': // plus
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
      ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
      ctx.stroke(); break;
    case 'shield_bearer': // shield outline
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x+s*0.7, y-s*0.3);
      ctx.lineTo(x+s*0.7, y+s*0.3); ctx.lineTo(x, y+s);
      ctx.lineTo(x-s*0.7, y+s*0.3); ctx.lineTo(x-s*0.7, y-s*0.3);
      ctx.closePath(); ctx.stroke(); break;
    case 'kamikaze': // blast lines
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a)*s*0.3, y + Math.sin(a)*s*0.3);
        ctx.lineTo(x + Math.cos(a)*s,     y + Math.sin(a)*s);
        ctx.stroke();
      } break;
    case 'farm': // coin
      ctx.beginPath();
      ctx.arc(x, y, s*0.7, 0, Math.PI*2);
      ctx.stroke(); break;
    case 'booster': // up arrow
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x+s*0.6, y+s*0.3);
      ctx.lineTo(x, y); ctx.lineTo(x-s*0.6, y+s*0.3);
      ctx.closePath(); ctx.fill(); break;
    case 'spawner': // three dots
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(x + i*s*0.55, y, s*0.25, 0, Math.PI*2);
        ctx.fill();
      } break;
    case 'shadow': // eye shape
      ctx.beginPath();
      ctx.moveTo(x-s, y);
      ctx.quadraticCurveTo(x, y-s*0.7, x+s, y);
      ctx.quadraticCurveTo(x, y+s*0.7, x-s, y);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, s*0.28, 0, Math.PI*2); ctx.fill(); break;
    case 'tank':
      ctx.beginPath(); ctx.arc(x, y, s*0.55, 0, Math.PI*2); ctx.stroke(); break;
    case 'wasp': // 3 tiny circles (drone formation)
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath(); ctx.arc(x + Math.cos(a)*s*0.55, y + Math.sin(a)*s*0.55, s*0.22, 0, Math.PI*2); ctx.fill();
      } break;
    case 'phantom': // wings outline
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - s, y - s*0.5);
      ctx.moveTo(x, y); ctx.lineTo(x + s, y - s*0.5);
      ctx.stroke(); break;
    case 'archer': // arrow pointing up (anti-air)
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x - s*0.5, y + s*0.3);
      ctx.lineTo(x, y); ctx.lineTo(x + s*0.5, y + s*0.3);
      ctx.closePath(); ctx.fill(); break;
    case 'aegis': // upward burst lines
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI/2 + (i - 1.5) * (Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a)*s*0.3, y + Math.sin(a)*s*0.3);
        ctx.lineTo(x + Math.cos(a)*s, y + Math.sin(a)*s);
        ctx.stroke();
      } break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, s*0.35, 0, Math.PI*2);
      ctx.fill();
  }
}

function _drawCrown(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  // Crown base
  ctx.fillRect(x - s, y + s*0.1, s*2, s*0.5);
  // Crown points
  ctx.beginPath();
  ctx.moveTo(x - s, y + s*0.1);
  ctx.lineTo(x - s, y - s*0.6);
  ctx.lineTo(x - s*0.35, y + s*0.1);
  ctx.lineTo(x, y - s);
  ctx.lineTo(x + s*0.35, y + s*0.1);
  ctx.lineTo(x + s, y - s*0.6);
  ctx.lineTo(x + s, y + s*0.1);
  ctx.closePath();
  ctx.fill();
}

function _drawTower2D(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(1.2, s * 0.2);
  ctx.lineCap     = 'round';
  // Tower silhouette
  ctx.beginPath();
  ctx.rect(x - s*0.6, y - s*0.4, s*1.2, s*1.2);
  ctx.stroke();
  // Battlements
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(x - s*0.5 + i*s*0.42, y - s*0.7, s*0.28, s*0.32);
    ctx.stroke();
  }
  // Door
  ctx.beginPath();
  ctx.arc(x, y + s*0.4, s*0.25, Math.PI, 0);
  ctx.lineTo(x + s*0.25, y + s*0.8);
  ctx.lineTo(x - s*0.25, y + s*0.8);
  ctx.stroke();
}

// Shared HP bar
function _hpBar(ctx, x, y, w, h, ratio, fillColor) {
  const r = h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  _rrect(ctx, x, y, w, h, r); ctx.fill();
  if (ratio > 0.01) {
    const fr = clamp(ratio, 0, 1);
    const col = fr > 0.6 ? fillColor : fr > 0.3 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = col;
    _rrect(ctx, x, y, w * fr, h, r); ctx.fill();
  }
}

function _rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function _lighten(hex, amt = 40) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amt);
  return `rgb(${r},${g},${b})`;
}

function _darken(hex, amt = 30) {
  const r = Math.max(0, parseInt(hex.slice(1,3),16) - amt);
  const g = Math.max(0, parseInt(hex.slice(3,5),16) - amt);
  const b = Math.max(0, parseInt(hex.slice(5,7),16) - amt);
  return `rgb(${r},${g},${b})`;
}
