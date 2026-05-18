import { CW, CH, RIVER_Y1, RIVER_Y2, LANE_LEFT, LANE_RIGHT } from './data.js';
import { clamp } from './engine.js';

const BRIDGE_LEFT  = { x1: 90,  x2: 170, cx: LANE_LEFT  };
const BRIDGE_RIGHT = { x1: 350, x2: 430, cx: LANE_RIGHT };

// Symmetric decorations: each entry is drawn in both halves
const DECOS = [
  // Rocks at corners
  { kind: 'rock', x: 28,  dy: 80,  w: 30, h: 20 },
  { kind: 'rock', x: 492, dy: 80,  w: 30, h: 20 },
  { kind: 'rock', x: 52,  dy: 135, w: 20, h: 14 },
  { kind: 'rock', x: 468, dy: 135, w: 20, h: 14 },
  // Crystal clusters (sides)
  { kind: 'crystal', x: 22,  dy: 240, size: 14 },
  { kind: 'crystal', x: 498, dy: 240, size: 14 },
  { kind: 'crystal', x: 16,  dy: 300, size: 10 },
  { kind: 'crystal', x: 504, dy: 300, size: 10 },
  // Small pebbles
  { kind: 'pebble', x: 200, dy: 160, r: 5 },
  { kind: 'pebble', x: 320, dy: 160, r: 5 },
  { kind: 'pebble', x: 180, dy: 310, r: 4 },
  { kind: 'pebble', x: 340, dy: 310, r: 4 },
];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._time  = 0;
    this.scale  = 1;
    canvas.width  = CW;
    canvas.height = CH;
  }

  // Call every frame so river animates
  tickTime(dt) { this._time += dt; }

  // ── Full frame ──────────────────────────────────────────
  frame(state, particles) {
    const { ctx } = this;
    ctx.clearRect(0, 0, CW, CH);

    this._drawArena();
    this._drawRiver();
    this._drawDecorations();
    this._drawBridges();
    this._drawTowers(state.towers);
    this._drawUnits(state.units);
    this._drawProjectiles(state.projectiles);
    particles.draw(ctx);
    this._drawHUDCanvas(state);
  }

  // ── Arena floor ─────────────────────────────────────────
  _drawArena() {
    const { ctx } = this;
    const TILE = 26;

    // Opponent half
    for (let ty = 0; ty < RIVER_Y1; ty += TILE) {
      for (let tx = 0; tx < CW; tx += TILE) {
        const odd = (Math.floor(tx / TILE) + Math.floor(ty / TILE)) % 2;
        ctx.fillStyle = odd ? '#161724' : '#13141f';
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
    // Player half
    for (let ty = RIVER_Y2; ty < CH; ty += TILE) {
      for (let tx = 0; tx < CW; tx += TILE) {
        const odd = (Math.floor(tx / TILE) + Math.floor(ty / TILE)) % 2;
        ctx.fillStyle = odd ? '#13161a' : '#111419';
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }

    // Subtle team color tint
    ctx.fillStyle = 'rgba(239,68,68,0.04)';
    ctx.fillRect(0, 0, CW, RIVER_Y1);
    ctx.fillStyle = 'rgba(59,130,246,0.04)';
    ctx.fillRect(0, RIVER_Y2, CW, CH - RIVER_Y2);

    // Side wall shadows
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, 12, CH);
    ctx.fillRect(CW - 12, 0, 12, CH);
  }

  // ── River ───────────────────────────────────────────────
  _drawRiver() {
    const { ctx } = this;
    const h = RIVER_Y2 - RIVER_Y1;

    // Base water
    const grad = ctx.createLinearGradient(0, RIVER_Y1, 0, RIVER_Y2);
    grad.addColorStop(0, '#0d2f4a');
    grad.addColorStop(0.5, '#0a3d5e');
    grad.addColorStop(1, '#0d2f4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, RIVER_Y1, CW, h);

    // Animated wave shimmer
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth   = 1.5;
    for (let i = 0; i < 3; i++) {
      const yOff = RIVER_Y1 + 8 + i * 12;
      ctx.beginPath();
      for (let x = 0; x <= CW; x += 4) {
        const y = yOff + Math.sin((x / 40) + this._time * 1.4 + i * 1.2) * 3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // River banks
    ctx.fillStyle = '#1e3a4a';
    ctx.fillRect(0, RIVER_Y1, CW, 4);
    ctx.fillRect(0, RIVER_Y2 - 4, CW, 4);
  }

  // ── Decorations (symmetric) ─────────────────────────────
  _drawDecorations() {
    const { ctx } = this;
    const midY = (RIVER_Y1 + RIVER_Y2) / 2;
    const oppH = RIVER_Y1;
    const plyH = CH - RIVER_Y2;

    for (const d of DECOS) {
      // Draw in opponent half (top)
      const oyOpp = d.dy;
      // Draw in player half (bottom) — mirrored
      const oyPly = CH - d.dy;

      if (d.kind === 'rock') {
        _drawRock(ctx, d.x, oyOpp, d.w, d.h);
        _drawRock(ctx, d.x, oyPly, d.w, d.h);
      } else if (d.kind === 'crystal') {
        _drawCrystal(ctx, d.x, oyOpp, d.size);
        _drawCrystal(ctx, d.x, oyPly, d.size);
      } else if (d.kind === 'pebble') {
        _drawPebble(ctx, d.x, oyOpp, d.r);
        _drawPebble(ctx, d.x, oyPly, d.r);
      }
    }
  }

  // ── Bridges ─────────────────────────────────────────────
  _drawBridges() {
    const { ctx } = this;
    [BRIDGE_LEFT, BRIDGE_RIGHT].forEach(br => {
      const w = br.x2 - br.x1;
      // Plank base
      ctx.fillStyle = '#4a3120';
      ctx.fillRect(br.x1, RIVER_Y1, w, RIVER_Y2 - RIVER_Y1);
      // Plank lines
      ctx.strokeStyle = '#2d1e10';
      ctx.lineWidth = 2;
      for (let y = RIVER_Y1 + 6; y < RIVER_Y2; y += 10) {
        ctx.beginPath();
        ctx.moveTo(br.x1 + 2, y);
        ctx.lineTo(br.x2 - 2, y);
        ctx.stroke();
      }
      // Railing
      ctx.fillStyle = '#6b4c30';
      ctx.fillRect(br.x1, RIVER_Y1,      w, 5);
      ctx.fillRect(br.x1, RIVER_Y2 - 5,  w, 5);
    });
  }

  // ── Towers ──────────────────────────────────────────────
  _drawTowers(towers) {
    if (!towers) return;
    for (const t of Object.values(towers)) {
      this._drawTower(t);
    }
  }

  _drawTower(t) {
    const { ctx } = this;
    if (t.dead) {
      this._drawDestroyedTower(t);
      return;
    }
    const isOpp   = t.owner === 'opp';
    const baseCol = isOpp ? '#7f1d1d' : '#1e3a8a';
    const rimCol  = isOpp ? '#ef4444' : '#3b82f6';
    const flash   = t.flashTimer > 0;

    // Shadow
    ctx.save();
    ctx.shadowBlur  = 20;
    ctx.shadowColor = flash ? '#fff' : rimCol;

    // Outer ring
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Body gradient
    const grd = ctx.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 0, t.x, t.y, t.r);
    grd.addColorStop(0, flash ? '#fff' : _lighten(baseCol));
    grd.addColorStop(1, baseCol);
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();

    // Border
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.strokeStyle = rimCol;
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    // Battlements (small rectangles around top)
    const battleCount = t.kind === 'king' ? 8 : 5;
    for (let i = 0; i < battleCount; i++) {
      const angle = (i / battleCount) * Math.PI * 2 - Math.PI / 2;
      const bx = t.x + Math.cos(angle) * (t.r + 2);
      const by = t.y + Math.sin(angle) * (t.r + 2);
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = rimCol;
      ctx.fill();
    }

    // Icon
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${t.kind === 'king' ? 20 : 15}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.kind === 'king' ? '♛' : '🗼', t.x, t.y);

    // HP bar
    this._drawHpBar(t.x - t.r, t.y + t.r + 6, t.r * 2, 5, t.hp / t.maxHp, rimCol);
  }

  _drawDestroyedTower(t) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    ctx.font = `bold ${t.r}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✕', t.x, t.y);
    ctx.restore();
  }

  // ── Units ────────────────────────────────────────────────
  _drawUnits(units) {
    for (const u of units) {
      if (u.dead) continue;
      if (u.cloakTimer > 0 && u.owner === 'opp') continue; // hidden from local player
      this._drawUnit(u);
    }
  }

  _drawUnit(u) {
    const { ctx } = this;
    ctx.save();
    if (u.cloakTimer > 0) ctx.globalAlpha = 0.35;

    const flash = u.flashTimer > 0;

    // Glow / shadow
    ctx.shadowBlur  = u.stunTimer > 0 ? 16 : flash ? 20 : 10;
    ctx.shadowColor = u.stunTimer > 0 ? '#facc15' : u.glow;

    // Aura ring (healers, shields, boosters)
    if (u.special?.type === 'heal_aura' || u.special?.type === 'shield_aura' || u.special?.type === 'boost_aura') {
      const now = Date.now();
      const pulse = 0.08 + 0.05 * Math.sin(now / 500);
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.special.auraR, 0, Math.PI * 2);
      ctx.strokeStyle = u.glow;
      ctx.lineWidth = 1;
      ctx.globalAlpha = (u.cloakTimer > 0 ? 0.15 : pulse);
      ctx.stroke();
      ctx.globalAlpha = u.cloakTimer > 0 ? 0.35 : 1;
    }

    // Outer ring (owner indicator)
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = u.owner === 'ply' ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)';
    ctx.fill();

    // Body
    const grd = ctx.createRadialGradient(u.x - u.r * 0.25, u.y - u.r * 0.25, 0, u.x, u.y, u.r);
    grd.addColorStop(0, flash ? '#fff' : _lighten(u.color));
    grd.addColorStop(1, u.color);
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Border
    ctx.strokeStyle = u.owner === 'ply' ? '#60a5fa' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Icon
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(u.r * 0.95)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.icon, u.x, u.y);

    // Stun indicator
    if (u.stunTimer > 0) {
      ctx.globalAlpha = 1;
      ctx.font = '11px sans-serif';
      ctx.fillText('⚡', u.x, u.y - u.r - 10);
    }

    ctx.restore();

    // HP bar (always opaque)
    this._drawHpBar(u.x - u.r, u.y - u.r - 9, u.r * 2, 4, u.hp / u.maxHp,
      u.owner === 'ply' ? '#22c55e' : '#ef4444');
  }

  // ── Projectiles ──────────────────────────────────────────
  _drawProjectiles(projs) {
    const { ctx } = this;
    for (const p of projs) {
      if (p.dead) continue;
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Canvas HUD (timer + names) ───────────────────────────
  _drawHUDCanvas(state) {
    const { ctx } = this;
    const mid = RIVER_Y1 + (RIVER_Y2 - RIVER_Y1) / 2;

    // Timer badge
    const secs = Math.ceil(state.timeLeft);
    const mm   = Math.floor(secs / 60);
    const ss   = String(secs % 60).padStart(2, '0');
    const text = `${mm}:${ss}`;
    const isOT = state.overtime;

    ctx.save();
    // Badge background
    const bw = 72, bh = 28, bx = CW / 2 - bw / 2, by = mid - bh / 2;
    ctx.fillStyle = isOT ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.65)';
    _roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = isOT ? '#ef4444' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    _roundRect(ctx, bx, by, bw, bh, 8);
    ctx.stroke();

    ctx.fillStyle = isOT ? '#fff' : '#f5c518';
    ctx.font = `bold 16px 'Inter', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isOT ? 'OT ' + text : text, CW / 2, mid);
    ctx.restore();

    // Opponent name (top)
    if (state.oppName) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      _roundRect(ctx, CW / 2 - 60, 10, 120, 22, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.font      = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(state.oppName, CW / 2, 21);
      ctx.restore();
    }
  }

  // ── Shared helpers ───────────────────────────────────────
  _drawHpBar(x, y, w, h, ratio, fillColor) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    _roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = fillColor;
      _roundRect(ctx, x, y, w * clamp(ratio, 0, 1), h, h / 2); ctx.fill();
    }
  }

  // Resize canvas CSS while keeping logical resolution
  resize(containerW, containerH) {
    const scaleX = containerW / CW;
    const scaleY = containerH / CH;
    this.scale = Math.min(scaleX, scaleY, 1.5);
    this.canvas.style.width  = `${CW * this.scale}px`;
    this.canvas.style.height = `${CH * this.scale}px`;
  }
}

// ── Decoration helpers ─────────────────────────────────────
function _drawRock(ctx, cx, cy, w, h) {
  ctx.save();
  ctx.fillStyle = '#2e2f3d';
  ctx.strokeStyle = '#1a1b27';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _drawCrystal(ctx, cx, cy, size) {
  ctx.save();
  ctx.fillStyle = 'rgba(99,102,241,0.45)';
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.5, cy);
  ctx.lineTo(cx, cy + size * 0.6);
  ctx.lineTo(cx - size * 0.5, cy);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function _drawPebble(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = '#252637';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _lighten(hex) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + 60);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + 60);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + 60);
  return `rgb(${r},${g},${b})`;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
