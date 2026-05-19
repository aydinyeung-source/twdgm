import { CW, CH, RIVER_Y1, RIVER_Y2, LANE_LEFT, LANE_RIGHT } from './data.js';
import { clamp } from './engine.js';

const BRIDGE_L = { x1: 90,  x2: 170 };
const BRIDGE_R = { x1: 350, x2: 430 };

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
  speeder:      { body: '#f97316', rim: '#fed7aa', shape: 'diamond' },
  swarmer:      { body: '#eab308', rim: '#fef08a', shape: 'triangle' },
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
    this._drawArena();
    this._drawRiver();
    this._drawBridges();
    this._drawDecorations();
    this._drawTowers(state.towers);
    this._drawUnits(state.units);
    this._drawProjectiles(state.projectiles);
    particles.draw(ctx);
    this._drawOverlay(state);
  }

  // ── Arena floor ─────────────────────────────────────────
  _drawArena() {
    const { ctx } = this;
    const T = 28;

    // Opponent half
    for (let ty = 0; ty < RIVER_Y1; ty += T) {
      for (let tx = 0; tx < CW; tx += T) {
        const odd = (Math.floor(tx/T) + Math.floor(ty/T)) % 2;
        ctx.fillStyle = odd ? PAL.arenaOpp : PAL.arenaOpp2;
        ctx.fillRect(tx, ty, T, T);
      }
    }
    // Player half
    for (let ty = RIVER_Y2; ty < CH; ty += T) {
      for (let tx = 0; tx < CW; tx += T) {
        const odd = (Math.floor(tx/T) + Math.floor(ty/T)) % 2;
        ctx.fillStyle = odd ? PAL.arenaPly : PAL.arenaPly2;
        ctx.fillRect(tx, ty, T, T);
      }
    }

    // Team color overlays
    ctx.fillStyle = 'rgba(239,68,68,0.05)';
    ctx.fillRect(0, 0, CW, RIVER_Y1);
    ctx.fillStyle = 'rgba(59,130,246,0.05)';
    ctx.fillRect(0, RIVER_Y2, CW, CH - RIVER_Y2);

    // Side walls
    const wallGrad = ctx.createLinearGradient(0, 0, 18, 0);
    wallGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
    wallGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, 18, CH);
    const wallGrad2 = ctx.createLinearGradient(CW-18, 0, CW, 0);
    wallGrad2.addColorStop(0, 'rgba(0,0,0,0)');
    wallGrad2.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = wallGrad2;
    ctx.fillRect(CW-18, 0, 18, CH);
  }

  // ── River ───────────────────────────────────────────────
  _drawRiver() {
    const { ctx } = this;
    const h = RIVER_Y2 - RIVER_Y1;

    const grad = ctx.createLinearGradient(0, RIVER_Y1, 0, RIVER_Y2);
    grad.addColorStop(0,   PAL.riverDark);
    grad.addColorStop(0.5, PAL.riverMid);
    grad.addColorStop(1,   PAL.riverDark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, RIVER_Y1, CW, h);

    // Animated shimmer lines
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const yOff = RIVER_Y1 + 6 + i * 9;
      const alpha = 0.06 + 0.04 * Math.sin(this._t * 0.8 + i);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= CW; x += 3) {
        const y = yOff + Math.sin((x / 35) + this._t * 1.3 + i * 1.4) * 2.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Banks
    ctx.fillStyle = '#1e4060';
    ctx.fillRect(0, RIVER_Y1, CW, 3);
    ctx.fillRect(0, RIVER_Y2 - 3, CW, 3);
  }

  // ── Bridges ─────────────────────────────────────────────
  _drawBridges() {
    const { ctx } = this;
    [BRIDGE_L, BRIDGE_R].forEach(br => {
      const w = br.x2 - br.x1;
      const h = RIVER_Y2 - RIVER_Y1;

      // Wood base
      ctx.fillStyle = PAL.bridgeWood;
      ctx.fillRect(br.x1, RIVER_Y1, w, h);

      // Plank lines
      ctx.strokeStyle = PAL.bridgePlank;
      ctx.lineWidth = 1.5;
      for (let y = RIVER_Y1 + 7; y < RIVER_Y2; y += 8) {
        ctx.beginPath();
        ctx.moveTo(br.x1 + 2, y);
        ctx.lineTo(br.x2 - 2, y);
        ctx.stroke();
      }

      // Railing posts
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(br.x1,     RIVER_Y1, w, 5);
      ctx.fillRect(br.x1,     RIVER_Y2 - 5, w, 5);
      // Post nails
      for (let nx = br.x1 + 8; nx < br.x2; nx += 16) {
        ctx.fillStyle = '#b8956a';
        ctx.fillRect(nx - 1, RIVER_Y1, 2, 5);
        ctx.fillRect(nx - 1, RIVER_Y2 - 5, 2, 5);
      }
    });
  }

  // ── Decorations (symmetric top/bottom) ──────────────────
  _drawDecorations() {
    const ctx = this.ctx;
    const pairs = [
      // [x, yFromEdge, draw fn args...]
      () => { _rock(ctx, 30,  70,  28, 16); _rock(ctx, 30,  CH-70,  28, 16); },
      () => { _rock(ctx, 490, 70,  28, 16); _rock(ctx, 490, CH-70,  28, 16); },
      () => { _rock(ctx, 55,  125, 18, 12); _rock(ctx, 55,  CH-125, 18, 12); },
      () => { _rock(ctx, 465, 125, 18, 12); _rock(ctx, 465, CH-125, 18, 12); },
      () => { _crystal(ctx, 18,  260, 16); _crystal(ctx, 18,  CH-260, 16); },
      () => { _crystal(ctx, 502, 260, 16); _crystal(ctx, 502, CH-260, 16); },
      () => { _crystal(ctx, 12,  330, 11); _crystal(ctx, 12,  CH-330, 11); },
      () => { _crystal(ctx, 508, 330, 11); _crystal(ctx, 508, CH-330, 11); },
      () => { _pebble(ctx, 205, 175, 5);   _pebble(ctx, 205, CH-175, 5);   },
      () => { _pebble(ctx, 315, 175, 5);   _pebble(ctx, 315, CH-175, 5);   },
      () => { _pebble(ctx, 188, 330, 4);   _pebble(ctx, 188, CH-330, 4);   },
      () => { _pebble(ctx, 332, 330, 4);   _pebble(ctx, 332, CH-330, 4);   },
    ];
    pairs.forEach(fn => fn());
  }

  // ── Towers ──────────────────────────────────────────────
  _drawTowers(towers) {
    if (!towers) return;
    // Draw in order: back-to-front
    const order = ['plyKing', 'oppKing', 'plyLeft', 'plyRight', 'oppLeft', 'oppRight'];
    for (const k of order) {
      const t = towers[k];
      if (t) t.dead ? this._drawDestroyedTower(t) : this._drawTower(t);
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

    ctx.save();
    if (cloaked) ctx.globalAlpha = 0.32;

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

    // HP bar (always opaque)
    const hpColor = u.owner === 'ply' ? PAL.hpBluePly : PAL.hpRedOpp;
    _hpBar(ctx, u.x - u.r, u.y - u.r - 9, u.r * 2, 4, u.hp / u.maxHp, hpColor);

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

  // ── Canvas overlay (timer, names) ───────────────────────
  _drawOverlay(state) {
    const { ctx } = this;
    const midY = RIVER_Y1 + (RIVER_Y2 - RIVER_Y1) / 2;

    // Timer badge
    const secs = Math.max(0, Math.ceil(state.timeLeft));
    const mm   = Math.floor(secs / 60);
    const ss   = String(secs % 60).padStart(2, '0');
    const label = state.overtime ? `OT  ${mm}:${ss}` : `${mm}:${ss}`;
    const isOT  = state.overtime;
    const lowTime = !isOT && secs <= 30;

    const bw = 80, bh = 28, bx = CW/2 - bw/2, by = midY - bh/2;
    ctx.save();
    ctx.fillStyle = isOT ? 'rgba(220,38,38,0.88)' : lowTime ? 'rgba(245,158,11,0.88)' : PAL.timerBg;
    _rrect(ctx, bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = isOT ? '#ef4444' : PAL.timerBorder;
    ctx.lineWidth = 1;
    _rrect(ctx, bx, by, bw, bh, 8); ctx.stroke();

    ctx.fillStyle = isOT ? '#fff' : lowTime ? '#fff' : '#f5c518';
    ctx.font = 'bold 15px Nunito, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, CW/2, midY);
    ctx.restore();

    // Opponent name strip (top)
    if (state.oppName) {
      const tw = 130, th = 22, tx = CW/2 - tw/2;
      ctx.save();
      ctx.fillStyle = 'rgba(8,20,36,0.7)';
      _rrect(ctx, tx, 8, tw, th, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(239,68,68,0.35)';
      ctx.lineWidth = 1;
      _rrect(ctx, tx, 8, tw, th, 6); ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 11px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(state.oppName, CW/2, 19);
      ctx.restore();
    }
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
    default:        ctx.arc(x, y, r, 0, Math.PI*2);
  }
  ctx.stroke();
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

// Decoration helpers
function _rock(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = '#1e2a3a';
  ctx.strokeStyle = '#141f2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _crystal(ctx, cx, cy, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(99,102,241,0.3)';
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s*0.5, cy);
  ctx.lineTo(cx, cy + s*0.55);
  ctx.lineTo(cx - s*0.5, cy);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _pebble(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#1a2332';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
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
