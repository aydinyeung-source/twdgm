// Card thumbnail renderer — draws recognisable character illustrations
// Each card gets a unique silhouette drawn with canvas 2D paths.

export function cardThumbCanvas(defId, size = 48) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw background gradient
  _drawBg(ctx, size, defId);

  // Draw character
  const fn = CHAR_DRAW[defId];
  if (fn) fn(ctx, size / 2, size / 2, size * 0.42);
  else    _drawUnknown(ctx, size / 2, size / 2, size * 0.42);

  return canvas;
}

// ── Per-card drawing functions ─────────────────────────────

const CHAR_DRAW = {

  // DART — orange missile/dart shape with gremlin face
  speeder(ctx, cx, cy, s) {
    // Body: horizontal missile
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.72, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose cone
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.68, cy);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.22);
    ctx.lineTo(cx + s * 0.28, cy + s * 0.22);
    ctx.closePath(); ctx.fill();
    // Tail fins
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.72, cy);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.38);
    ctx.lineTo(cx - s * 0.3,  cy);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.72, cy);
    ctx.lineTo(cx - s * 0.45, cy + s * 0.38);
    ctx.lineTo(cx - s * 0.3,  cy);
    ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + s * 0.12, cy - s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath(); ctx.arc(cx + s * 0.14, cy - s * 0.1, s * 0.055, 0, Math.PI * 2); ctx.fill();
    // Motion lines
    ctx.strokeStyle = 'rgba(254,215,170,0.5)';
    ctx.lineWidth = s * 0.04;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.4, cy + i * s * 0.15);
      ctx.lineTo(cx - s * 0.85, cy + i * s * 0.15);
      ctx.stroke();
    }
  },

  // GREMLIN — small round yellow creature with big grin
  swarmer(ctx, cx, cy, s) {
    // Body
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.05, s * 0.62, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.48, cy - s * 0.38);
    ctx.lineTo(cx - s * 0.65, cy - s * 0.7);
    ctx.lineTo(cx - s * 0.25, cy - s * 0.38);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.48, cy - s * 0.38);
    ctx.lineTo(cx + s * 0.65, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.38);
    ctx.closePath(); ctx.fill();
    // Eyes (big)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.22, cy - s * 0.05, s * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.22, cy - s * 0.05, s * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.05, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.24, cy - s * 0.05, s * 0.09, 0, Math.PI * 2); ctx.fill();
    // Big grin
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.18, s * 0.28, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // Teeth
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - s * 0.18, cy + s * 0.18, s * 0.1, s * 0.13);
    ctx.fillRect(cx + s * 0.08, cy + s * 0.18, s * 0.1, s * 0.13);
  },

  // GOLIATH — massive dark purple hulking figure
  brute(ctx, cx, cy, s) {
    // Shadow/base
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.72, s * 0.5, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Legs
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(cx - s * 0.3, cy + s * 0.35, s * 0.25, s * 0.4);
    ctx.fillRect(cx + s * 0.05, cy + s * 0.35, s * 0.25, s * 0.4);
    // Body (very wide)
    ctx.fillStyle = '#6d28d9';
    _rrect(ctx, cx - s * 0.52, cy - s * 0.38, s * 1.04, s * 0.78, s * 0.12); ctx.fill();
    // Arms (huge)
    ctx.fillStyle = '#5b21b6';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.68, cy + s * 0.0, s * 0.22, s * 0.38, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + s * 0.68, cy + s * 0.0, s * 0.22, s * 0.38, 0.2, 0, Math.PI * 2); ctx.fill();
    // Fists
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath(); ctx.arc(cx - s * 0.72, cy + s * 0.32, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.72, cy + s * 0.32, s * 0.18, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.42, s * 0.3, 0, Math.PI * 2); ctx.fill();
    // Eyes (glowing)
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.44, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.1, cy - s * 0.44, s * 0.07, 0, Math.PI * 2); ctx.fill();
  },

  // FURY — red jagged rage entity
  berserker(ctx, cx, cy, s) {
    // Jagged body (star/flame shape)
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? s * 0.58 : s * 0.35;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
              : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    // Inner bright
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? s * 0.42 : s * 0.24;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
              : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    // Rage eyes
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.08, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.08, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.arc(cx - s * 0.13, cy - s * 0.08, s * 0.055, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.17, cy - s * 0.08, s * 0.055, 0, Math.PI * 2); ctx.fill();
    // Angry brows
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy - s * 0.2); ctx.lineTo(cx - s * 0.06, cy - s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.26, cy - s * 0.2); ctx.lineTo(cx + s * 0.06, cy - s * 0.15); ctx.stroke();
  },

  // BOMBER — round creature carrying a bomb
  kamikaze(ctx, cx, cy, s) {
    // Bomb (dark sphere)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(cx + s * 0.15, cy + s * 0.22, s * 0.35, 0, Math.PI * 2); ctx.fill();
    // Fuse
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s * 0.13);
    ctx.bezierCurveTo(cx + s * 0.35, cy - s * 0.28, cx + s * 0.5, cy - s * 0.18, cx + s * 0.42, cy - s * 0.42);
    ctx.stroke();
    // Fuse spark
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(cx + s * 0.42, cy - s * 0.45, s * 0.07, 0, Math.PI * 2); ctx.fill();
    // Body (orange round gremlin)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.05, s * 0.46, 0, Math.PI * 2); ctx.fill();
    // Arms holding bomb
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.12, cy + s * 0.15, s * 0.14, s * 0.22, 0.4, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.22, cy - s * 0.1, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.02, cy - s * 0.1, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.04, cy - s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
  },

  // WRAITH — dark ghost figure with glowing eyes
  shadow(ctx, cx, cy, s) {
    // Wispy body (dark shape, wavy bottom)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.38, cy - s * 0.55);
    ctx.bezierCurveTo(cx - s * 0.45, cy - s * 0.1, cx - s * 0.5, cy + s * 0.2, cx - s * 0.28, cy + s * 0.55);
    ctx.quadraticCurveTo(cx, cy + s * 0.35, cx + s * 0.28, cy + s * 0.55);
    ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.2, cx + s * 0.45, cy - s * 0.1, cx + s * 0.38, cy - s * 0.55);
    ctx.closePath(); ctx.fill();
    // Bright inner glow
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.28, cy - s * 0.48);
    ctx.bezierCurveTo(cx - s * 0.35, cy, cx - s * 0.3, cy + s * 0.25, cx - s * 0.1, cy + s * 0.4);
    ctx.quadraticCurveTo(cx, cy + s * 0.28, cx + s * 0.1, cy + s * 0.4);
    ctx.bezierCurveTo(cx + s * 0.3, cy + s * 0.25, cx + s * 0.35, cy, cx + s * 0.28, cy - s * 0.48);
    ctx.closePath(); ctx.fill();
    // Glowing eyes
    ctx.save();
    ctx.shadowBlur = s * 0.4; ctx.shadowColor = '#7dd3fc';
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath(); ctx.arc(cx - s * 0.14, cy - s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.14, cy - s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Wisps at bottom
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.18, cy + s * 0.5); ctx.lineTo(cx - s * 0.25, cy + s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.55); ctx.lineTo(cx + s * 0.05, cy + s * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.18, cy + s * 0.5); ctx.lineTo(cx + s * 0.12, cy + s * 0.76); ctx.stroke();
  },

  // LANCER — blue soldier with spear
  grunt(ctx, cx, cy, s) {
    // Spear
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.32, cy - s * 0.62);
    ctx.lineTo(cx + s * 0.32, cy + s * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.32, cy - s * 0.62);
    ctx.lineTo(cx + s * 0.45, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.19, cy - s * 0.4);
    ctx.closePath(); ctx.fill();
    // Body (armour)
    ctx.fillStyle = '#1d4ed8';
    _rrect(ctx, cx - s * 0.28, cy - s * 0.25, s * 0.56, s * 0.5, s * 0.08); ctx.fill();
    // Helmet
    ctx.fillStyle = '#2563eb';
    ctx.beginPath(); ctx.arc(cx - s * 0.02, cy - s * 0.42, s * 0.26, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - s * 0.28, cy - s * 0.42, s * 0.52, s * 0.12);
    // Visor slit
    ctx.fillStyle = '#bfdbfe';
    ctx.fillRect(cx - s * 0.18, cy - s * 0.4, s * 0.32, s * 0.07);
    // Legs
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(cx - s * 0.24, cy + s * 0.25, s * 0.2, s * 0.42);
    ctx.fillRect(cx + s * 0.04, cy + s * 0.25, s * 0.2, s * 0.42);
    // Boots
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - s * 0.26, cy + s * 0.55, s * 0.24, s * 0.15);
    ctx.fillRect(cx + s * 0.02, cy + s * 0.55, s * 0.24, s * 0.15);
  },

  // TORRENT — water elemental wave form
  splasher(ctx, cx, cy, s) {
    // Wave base
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.62, cy + s * 0.55);
    ctx.bezierCurveTo(cx - s * 0.45, cy - s * 0.1, cx - s * 0.1, cy - s * 0.55, cx, cy - s * 0.62);
    ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.55, cx + s * 0.45, cy - s * 0.1, cx + s * 0.62, cy + s * 0.55);
    ctx.closePath(); ctx.fill();
    // Inner lighter blue
    ctx.fillStyle = '#0e7490';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy + s * 0.35);
    ctx.bezierCurveTo(cx - s * 0.28, cy - s * 0.1, cx - s * 0.05, cy - s * 0.42, cx, cy - s * 0.48);
    ctx.bezierCurveTo(cx + s * 0.05, cy - s * 0.42, cx + s * 0.28, cy - s * 0.1, cx + s * 0.42, cy + s * 0.35);
    ctx.closePath(); ctx.fill();
    // Water face
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath(); ctx.arc(cx - s * 0.14, cy, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.14, cy, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0c4a6e'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.2, s * 0.18, 0.1, Math.PI - 0.1); ctx.stroke();
    // Splash droplets
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath(); ctx.arc(cx - s * 0.5, cy - s * 0.1, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.55, cy - s * 0.22, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - s * 0.28, cy - s * 0.62, s * 0.05, 0, Math.PI * 2); ctx.fill();
  },

  // HIVE — biomechanical hexagonal pod
  spawner(ctx, cx, cy, s) {
    // Main hex body
    ctx.fillStyle = '#1e3a8a';
    _hexPath(ctx, cx, cy, s * 0.62); ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    _hexPath(ctx, cx, cy, s * 0.5); ctx.fill();
    // Honeycomb inner pattern
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = s * 0.04;
    _hexPath(ctx, cx, cy - s * 0.18, s * 0.16); ctx.stroke();
    _hexPath(ctx, cx - s * 0.28, cy + s * 0.1, s * 0.16); ctx.stroke();
    _hexPath(ctx, cx + s * 0.28, cy + s * 0.1, s * 0.16); ctx.stroke();
    // Glowing center
    ctx.save();
    ctx.shadowBlur = s * 0.3; ctx.shadowColor = '#60a5fa';
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.18, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - s * 0.28, cy + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.28, cy + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Small minion peaking out
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.35, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath(); ctx.arc(cx - s * 0.04, cy + s * 0.33, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.04, cy + s * 0.33, s * 0.04, 0, Math.PI * 2); ctx.fill();
  },

  // VANGUARD — heavy armored soldier with large shield
  shield_bearer(ctx, cx, cy, s) {
    // Shield (large, front)
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy - s * 0.62);
    ctx.bezierCurveTo(cx + s * 0.52, cy - s * 0.62, cx + s * 0.52, cy + s * 0.1, cx + s * 0.52, cy + s * 0.28);
    ctx.quadraticCurveTo(cx + s * 0.28, cy + s * 0.72, cx - s * 0.1, cy + s * 0.58);
    ctx.quadraticCurveTo(cx - s * 0.48, cy + s * 0.72, cx - s * 0.48, cy + s * 0.28);
    ctx.bezierCurveTo(cx - s * 0.48, cy + s * 0.1, cx - s * 0.48, cy - s * 0.62, cx - s * 0.1, cy - s * 0.62);
    ctx.closePath(); ctx.fill();
    // Shield emblem
    ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.04, cy - s * 0.44);
    ctx.lineTo(cx + s * 0.04, cy + s * 0.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.3, cy - s * 0.08);
    ctx.lineTo(cx + s * 0.38, cy - s * 0.08);
    ctx.stroke();
    // Soldier body (peeking from behind shield)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.5, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx + s * 0.12, cy - s * 0.3, s * 0.35, s * 0.4);
    // Helmet visor
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(cx + s * 0.17, cy - s * 0.55, s * 0.26, s * 0.09);
  },

  // MENDER — green healer figure with medical cross
  healer(ctx, cx, cy, s) {
    // Robe/body
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.28, cy - s * 0.08);
    ctx.bezierCurveTo(cx - s * 0.38, cy + s * 0.25, cx - s * 0.42, cy + s * 0.55, cx - s * 0.22, cy + s * 0.72);
    ctx.lineTo(cx + s * 0.22, cy + s * 0.72);
    ctx.bezierCurveTo(cx + s * 0.42, cy + s * 0.55, cx + s * 0.42, cy + s * 0.4, cx + s * 0.38, cy + s * 0.25);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#059669';
    _rrect(ctx, cx - s * 0.26, cy - s * 0.22, s * 0.52, s * 0.48, s * 0.1); ctx.fill();
    // Head with hood
    ctx.fillStyle = '#065f46';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.4, s * 0.27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
    // Face
    ctx.fillStyle = '#d1fae5';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.4, s * 0.13, 0, Math.PI * 2); ctx.fill();
    // Medical cross on chest
    ctx.fillStyle = '#34d399';
    ctx.fillRect(cx - s * 0.06, cy - s * 0.12, s * 0.12, s * 0.3);
    ctx.fillRect(cx - s * 0.14, cy + s * 0.03, s * 0.28, s * 0.12);
    // Healing sparkles
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath(); ctx.arc(cx - s * 0.44, cy - s * 0.1, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.44, cy + s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.38, cy - s * 0.28, s * 0.04, 0, Math.PI * 2); ctx.fill();
  },

  // AMP — gremlin tinkerer with oversized amp/speaker backpack
  booster(ctx, cx, cy, s) {
    // Amp/backpack (dominant feature)
    ctx.fillStyle = '#92400e';
    _rrect(ctx, cx + s * 0.1, cy - s * 0.45, s * 0.52, s * 0.72, s * 0.1); ctx.fill();
    ctx.fillStyle = '#b45309';
    _rrect(ctx, cx + s * 0.16, cy - s * 0.38, s * 0.4, s * 0.58, s * 0.08); ctx.fill();
    // Speaker cone
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.arc(cx + s * 0.36, cy - s * 0.08, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.arc(cx + s * 0.36, cy - s * 0.08, s * 0.1, 0, Math.PI * 2); ctx.fill();
    // Gremlin body
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.04, s * 0.3, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.38, s * 0.22, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.3, cy - s * 0.48); ctx.lineTo(cx - s * 0.44, cy - s * 0.68); ctx.lineTo(cx - s * 0.18, cy - s * 0.45);
    ctx.closePath(); ctx.fill();
    // Eyes
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(cx - s * 0.2, cy - s * 0.4, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - s * 0.0, cy - s * 0.4, s * 0.07, 0, Math.PI * 2); ctx.fill();
    // Energy waves from amp
    ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = s * 0.04;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx + s * 0.36, cy - s * 0.08, s * (0.22 + i * 0.12), -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  },

  // SIPHON — stationary crystal energy harvester
  farm(ctx, cx, cy, s) {
    // Base platform
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.62, s * 0.42, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Central crystal (tall)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.18, cy + s * 0.55);
    ctx.lineTo(cx - s * 0.18, cy + s * 0.55);
    ctx.lineTo(cx - s * 0.15, cy - s * 0.35);
    ctx.closePath(); ctx.fill();
    // Crystal face highlight
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.07, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.09, cy + s * 0.55);
    ctx.lineTo(cx, cy + s * 0.55);
    ctx.closePath(); ctx.fill();
    // Side crystals
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.18, cy - s * 0.2);
    ctx.lineTo(cx - s * 0.38, cy - s * 0.42);
    ctx.lineTo(cx - s * 0.42, cy - s * 0.0);
    ctx.lineTo(cx - s * 0.28, cy + s * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.18, cy - s * 0.2);
    ctx.lineTo(cx + s * 0.38, cy - s * 0.42);
    ctx.lineTo(cx + s * 0.42, cy - s * 0.0);
    ctx.lineTo(cx + s * 0.28, cy + s * 0.45);
    ctx.closePath(); ctx.fill();
    // Glowing elixir orb at top
    ctx.save();
    ctx.shadowBlur = s * 0.4; ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.62, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // FORTRESS — massively armored walking tank
  tank(ctx, cx, cy, s) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.74, s * 0.52, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // Leg armour
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(cx - s * 0.42, cy + s * 0.28, s * 0.36, s * 0.45);
    ctx.fillRect(cx + s * 0.06, cy + s * 0.28, s * 0.36, s * 0.45);
    // Main body (very thick armour)
    ctx.fillStyle = '#1d4ed8';
    _rrect(ctx, cx - s * 0.54, cy - s * 0.45, s * 1.08, s * 0.74, s * 0.14); ctx.fill();
    // Chest plate ridges
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.42, cy - s * 0.1); ctx.lineTo(cx + s * 0.42, cy - s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.42, cy + s * 0.08); ctx.lineTo(cx + s * 0.42, cy + s * 0.08); ctx.stroke();
    // Shoulders (pauldrons)
    ctx.fillStyle = '#1e40af';
    ctx.beginPath(); ctx.arc(cx - s * 0.54, cy - s * 0.25, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.54, cy - s * 0.25, s * 0.2, 0, Math.PI * 2); ctx.fill();
    // Helmet
    ctx.fillStyle = '#1e3a8a';
    _rrect(ctx, cx - s * 0.3, cy - s * 0.72, s * 0.6, s * 0.34, s * 0.1); ctx.fill();
    // Visor (narrow blue slit)
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(cx - s * 0.24, cy - s * 0.62, s * 0.48, s * 0.09);
    // Emblem
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
  },

  // PIERCER — lean sniper with extremely long rifle
  sniper(ctx, cx, cy, s) {
    // Long rifle (diagonal)
    ctx.strokeStyle = '#134e4a'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.62, cy + s * 0.58);
    ctx.lineTo(cx + s * 0.72, cy - s * 0.68);
    ctx.stroke();
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy + s * 0.48);
    ctx.lineTo(cx + s * 0.62, cy - s * 0.58);
    ctx.stroke();
    // Scope
    ctx.fillStyle = '#0f766e';
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.22, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.22, s * 0.06, 0, Math.PI * 2); ctx.fill();
    // Body (lean)
    ctx.fillStyle = '#0f766e';
    _rrect(ctx, cx - s * 0.25, cy - s * 0.28, s * 0.38, s * 0.52, s * 0.1); ctx.fill();
    // Head with long-range visor/helmet
    ctx.fillStyle = '#134e4a';
    ctx.beginPath(); ctx.arc(cx - s * 0.02, cy - s * 0.46, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d9488';
    ctx.beginPath(); ctx.arc(cx - s * 0.02, cy - s * 0.46, s * 0.15, 0, Math.PI * 2); ctx.fill();
    // Visor highlight
    ctx.fillStyle = '#5eead4';
    ctx.fillRect(cx - s * 0.14, cy - s * 0.52, s * 0.28, s * 0.07);
    // Arms holding rifle
    ctx.fillStyle = '#115e59';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.12, cy + s * 0.05, s * 0.12, s * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
  },

  // DRONE — 3 small green flying drones (swarm)
  wasp(ctx, cx, cy, s) {
    // Draw 3 drones in triangle formation
    _drawSingleDrone(ctx, cx - s * 0.3, cy + s * 0.22, s * 0.24);
    _drawSingleDrone(ctx, cx + s * 0.3, cy + s * 0.22, s * 0.24);
    _drawSingleDrone(ctx, cx, cy - s * 0.24, s * 0.26);
  },

  // SPECTER — flying indigo ghost with wings
  phantom(ctx, cx, cy, s) {
    // Wings
    ctx.fillStyle = 'rgba(99,102,241,0.5)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.1);
    ctx.bezierCurveTo(cx - s * 0.3, cy - s * 0.55, cx - s * 0.72, cy - s * 0.35, cx - s * 0.68, cy + s * 0.1);
    ctx.bezierCurveTo(cx - s * 0.48, cy + s * 0.05, cx - s * 0.22, cy - s * 0.08, cx, cy - s * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.1);
    ctx.bezierCurveTo(cx + s * 0.3, cy - s * 0.55, cx + s * 0.72, cy - s * 0.35, cx + s * 0.68, cy + s * 0.1);
    ctx.bezierCurveTo(cx + s * 0.48, cy + s * 0.05, cx + s * 0.22, cy - s * 0.08, cx, cy - s * 0.1);
    ctx.closePath(); ctx.fill();
    // Ghost body
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.3, cy - s * 0.3);
    ctx.bezierCurveTo(cx - s * 0.38, cy + s * 0.1, cx - s * 0.4, cy + s * 0.35, cx - s * 0.22, cy + s * 0.55);
    ctx.quadraticCurveTo(cx, cy + s * 0.38, cx + s * 0.22, cy + s * 0.55);
    ctx.bezierCurveTo(cx + s * 0.4, cy + s * 0.35, cx + s * 0.38, cy + s * 0.1, cx + s * 0.3, cy - s * 0.3);
    ctx.closePath(); ctx.fill();
    // Head
    ctx.fillStyle = '#818cf8';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.35, s * 0.26, 0, Math.PI * 2); ctx.fill();
    // Hollow eyes
    ctx.save();
    ctx.shadowBlur = s * 0.3; ctx.shadowColor = '#c7d2fe';
    ctx.fillStyle = '#c7d2fe';
    ctx.beginPath(); ctx.arc(cx - s * 0.11, cy - s * 0.38, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.11, cy - s * 0.38, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Wispy tail
    ctx.strokeStyle = 'rgba(129,140,248,0.5)'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.14, cy + s * 0.55); ctx.lineTo(cx - s * 0.18, cy + s * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.58); ctx.lineTo(cx + s * 0.04, cy + s * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.14, cy + s * 0.55); ctx.lineTo(cx + s * 0.1, cy + s * 0.78); ctx.stroke();
  },

  // INTERCEPTOR — soldier looking up with crossbow
  archer(ctx, cx, cy, s) {
    // Crossbow (pointing up-diagonal)
    ctx.strokeStyle = '#475569'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.08, cy - s * 0.08);
    ctx.lineTo(cx + s * 0.12, cy - s * 0.62);
    ctx.stroke();
    // Crossbow limbs
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.18, cy - s * 0.38);
    ctx.lineTo(cx + s * 0.32, cy - s * 0.38);
    ctx.stroke();
    // String (drawn tight)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.18, cy - s * 0.38);
    ctx.lineTo(cx + s * 0.04, cy - s * 0.28);
    ctx.lineTo(cx + s * 0.32, cy - s * 0.38);
    ctx.stroke();
    // Arrow
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(cx + s * 0.04, cy - s * 0.28); ctx.lineTo(cx + s * 0.18, cy - s * 0.72); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.moveTo(cx + s * 0.18, cy - s * 0.72); ctx.lineTo(cx + s * 0.1, cy - s * 0.6); ctx.lineTo(cx + s * 0.26, cy - s * 0.6); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#475569';
    _rrect(ctx, cx - s * 0.26, cy - s * 0.04, s * 0.5, s * 0.46, s * 0.08); ctx.fill();
    // Head — tilted up
    ctx.fillStyle = '#64748b';
    ctx.beginPath(); ctx.arc(cx - s * 0.05, cy - s * 0.26, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - s * 0.16, cy - s * 0.32, s * 0.26, s * 0.07);
  },

  // WALL — crenellated stone fortification
  wall(ctx, cx, cy, s) {
    // Base shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.78, s * 0.5, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // Main wall body
    ctx.fillStyle = '#475569';
    _rrect(ctx, cx - s * 0.52, cy - s * 0.28, s * 1.04, s * 0.88, s * 0.06); ctx.fill();
    // Stone texture lines
    ctx.strokeStyle = '#334155'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.52, cy + s * 0.1); ctx.lineTo(cx + s * 0.52, cy + s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.52, cy + s * 0.38); ctx.lineTo(cx + s * 0.52, cy + s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.28); ctx.lineTo(cx, cy + s * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy + s * 0.1); ctx.lineTo(cx - s * 0.26, cy + s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.26, cy - s * 0.28); ctx.lineTo(cx + s * 0.26, cy + s * 0.1); ctx.stroke();
    // Battlements (merlons)
    ctx.fillStyle = '#64748b';
    const mw = s * 0.22, mh = s * 0.28, gap = s * 0.08;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - s * 0.52 + i * (mw + gap), cy - s * 0.52, mw, mh);
    }
    // Wall face detail
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - s * 0.14, cy + s * 0.0, s * 0.28, s * 0.6);
    ctx.fillStyle = '#1e293b';
    _rrect(ctx, cx - s * 0.1, cy + s * 0.04, s * 0.2, s * 0.3, s * 0.04); ctx.fill();
  },

  // CANNON — heavy artillery on a swivel mount
  cannon(ctx, cx, cy, s) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.78, s * 0.44, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155'; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.arc(cx - s * 0.3, cy + s * 0.52, s * 0.24, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy + s * 0.52, s * 0.24, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Axle
    ctx.strokeStyle = '#475569'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy + s * 0.52); ctx.lineTo(cx + s * 0.3, cy + s * 0.52); ctx.stroke();
    // Carriage
    ctx.fillStyle = '#334155';
    _rrect(ctx, cx - s * 0.38, cy + s * 0.18, s * 0.76, s * 0.38, s * 0.07); ctx.fill();
    // Cannon barrel (pointing right and slightly up)
    ctx.fillStyle = '#1e293b';
    ctx.save();
    ctx.translate(cx, cy + s * 0.18);
    ctx.rotate(-0.22);
    _rrect(ctx, -s * 0.14, -s * 0.66, s * 0.28, s * 0.66, s * 0.08); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(0, -s * 0.66, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Muzzle flash glow
    ctx.save();
    ctx.shadowBlur = s * 0.3; ctx.shadowColor = '#fbbf24';
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath(); ctx.arc(cx + s * 0.14, cy - s * 0.32, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // BOMBHOUSE — gremlins factory that lobs bombs
  bombhouse(ctx, cx, cy, s) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.78, s * 0.48, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // House base
    ctx.fillStyle = '#78350f';
    _rrect(ctx, cx - s * 0.44, cy + s * 0.02, s * 0.88, s * 0.68, s * 0.06); ctx.fill();
    // Roof (angled)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.52, cy + s * 0.06);
    ctx.lineTo(cx, cy - s * 0.38);
    ctx.lineTo(cx + s * 0.52, cy + s * 0.06);
    ctx.closePath(); ctx.fill();
    // Chimney
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx + s * 0.2, cy - s * 0.52, s * 0.18, s * 0.22);
    // Bombs coming from chimney
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); ctx.arc(cx + s * 0.29, cy - s * 0.62, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.42, cy - s * 0.5, s * 0.09, 0, Math.PI * 2); ctx.fill();
    // Fuse
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.29, cy - s * 0.5);
    ctx.bezierCurveTo(cx + s * 0.38, cy - s * 0.48, cx + s * 0.36, cy - s * 0.38, cx + s * 0.3, cy - s * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(cx + s * 0.29, cy - s * 0.5, s * 0.04, 0, Math.PI * 2); ctx.fill();
    // Door
    ctx.fillStyle = '#451a03';
    _rrect(ctx, cx - s * 0.12, cy + s * 0.32, s * 0.24, s * 0.38, s * 0.05); ctx.fill();
    // Window
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath(); ctx.arc(cx - s * 0.22, cy + s * 0.15, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.32, cy + s * 0.15); ctx.lineTo(cx - s * 0.12, cy + s * 0.15); ctx.stroke();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.22, cy + s * 0.05); ctx.lineTo(cx - s * 0.22, cy + s * 0.25); ctx.stroke();
  },

  // FIREBALL — blazing incendiary orb
  fireball(ctx, cx, cy, s) {
    // Outer flame corona
    ctx.save();
    ctx.shadowBlur = s * 0.6; ctx.shadowColor = '#f97316';
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const r2 = i % 2 === 0 ? s * 0.72 : s * 0.52;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
              : ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Mid flame
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 7;
      const r2 = i % 2 === 0 ? s * 0.56 : s * 0.38;
      i === 0 ? ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
              : ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.closePath(); ctx.fill();
    // Core
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2); ctx.fill();
    // Hot center
    ctx.fillStyle = '#fff7ed';
    ctx.beginPath(); ctx.arc(cx - s * 0.06, cy - s * 0.06, s * 0.14, 0, Math.PI * 2); ctx.fill();
    // Ember sparks
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(cx + s * 0.44, cy - s * 0.22, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - s * 0.36, cy + s * 0.42, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.28, cy + s * 0.48, s * 0.04, 0, Math.PI * 2); ctx.fill();
  },

  // ROCKET — high-damage missile
  rocket(ctx, cx, cy, s) {
    // Exhaust plume
    ctx.fillStyle = 'rgba(251,146,60,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.14, cy + s * 0.45);
    ctx.bezierCurveTo(cx - s * 0.32, cy + s * 0.78, cx + s * 0.32, cy + s * 0.78, cx + s * 0.14, cy + s * 0.45);
    ctx.closePath(); ctx.fill();
    // Rocket body
    ctx.fillStyle = '#1e3a8a';
    _rrect(ctx, cx - s * 0.2, cy - s * 0.45, s * 0.4, s * 0.88, s * 0.12); ctx.fill();
    // Body stripe
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cx - s * 0.2, cy - s * 0.04, s * 0.4, s * 0.18);
    // Nose cone
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.72);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.45);
    ctx.closePath(); ctx.fill();
    // Fins
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy + s * 0.32);
    ctx.lineTo(cx - s * 0.44, cy + s * 0.62);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.43);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy + s * 0.32);
    ctx.lineTo(cx + s * 0.44, cy + s * 0.62);
    ctx.lineTo(cx + s * 0.2, cy + s * 0.43);
    ctx.closePath(); ctx.fill();
    // Window
    ctx.save();
    ctx.shadowBlur = s * 0.2; ctx.shadowColor = '#60a5fa';
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Flame core
    ctx.save();
    ctx.shadowBlur = s * 0.4; ctx.shadowColor = '#f97316';
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.44, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // TORNADO — swirling destructive vortex
  tornado(ctx, cx, cy, s) {
    // Draw layered spinning bands from wide (top) to narrow (bottom)
    const bands = [
      { y: cy - s * 0.62, w: s * 0.6, col: '#94a3b8' },
      { y: cy - s * 0.35, w: s * 0.48, col: '#64748b' },
      { y: cy - s * 0.1,  w: s * 0.36, col: '#475569' },
      { y: cy + s * 0.14, w: s * 0.24, col: '#334155' },
      { y: cy + s * 0.36, w: s * 0.14, col: '#1e293b' },
    ];
    for (const b of bands) {
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.ellipse(cx, b.y, b.w, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Outer swirl lines
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.58, cy - s * 0.62);
    ctx.bezierCurveTo(cx + s * 0.62, cy - s * 0.38, cx - s * 0.44, cy - s * 0.1, cx + s * 0.28, cy + s * 0.14);
    ctx.bezierCurveTo(cx - s * 0.12, cy + s * 0.3, cx + s * 0.08, cy + s * 0.52, cx, cy + s * 0.68);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.58, cy - s * 0.62);
    ctx.bezierCurveTo(cx - s * 0.62, cy - s * 0.38, cx + s * 0.44, cy - s * 0.1, cx - s * 0.28, cy + s * 0.14);
    ctx.bezierCurveTo(cx + s * 0.12, cy + s * 0.3, cx - s * 0.08, cy + s * 0.52, cx, cy + s * 0.68);
    ctx.stroke();
    // Debris particles
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(cx - s * 0.42, cy - s * 0.48, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.5, cy - s * 0.3, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - s * 0.35, cy - s * 0.18, s * 0.04, 0, Math.PI * 2); ctx.fill();
    // Tip
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.66, s * 0.05, 0, Math.PI * 2); ctx.fill();
  },

  // FREEZE — ice crystal that stuns an area
  freeze(ctx, cx, cy, s) {
    // Outer ice glow ring
    ctx.save();
    ctx.shadowBlur = s * 0.5; ctx.shadowColor = '#7dd3fc';
    ctx.strokeStyle = 'rgba(125,200,252,0.35)'; ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // Six main crystal arms
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ex = cx + Math.cos(a) * s * 0.62;
      const ey = cy + Math.sin(a) * s * 0.62;
      ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      // Side branches
      for (let b = -1; b <= 1; b += 2) {
        const ba = a + b * Math.PI / 4;
        const blen = s * 0.22;
        const bx = cx + Math.cos(a) * s * 0.38;
        const by = cy + Math.sin(a) * s * 0.38;
        ctx.lineWidth = s * 0.04;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * blen, by + Math.sin(ba) * blen);
        ctx.stroke();
      }
      // Crystal tip
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath(); ctx.arc(ex, ey, s * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    // Center core
    ctx.save();
    ctx.shadowBlur = s * 0.4; ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2); ctx.fill();
  },

  // VINES — tangled roots that snare enemies
  vines(ctx, cx, cy, s) {
    // Ground soil
    ctx.fillStyle = '#451a03';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.7, s * 0.48, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Main vine stems
    ctx.strokeStyle = '#15803d'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.62);
    ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.3, cx - s * 0.5, cy - s * 0.1, cx - s * 0.28, cy - s * 0.52);
    ctx.stroke();
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.62);
    ctx.bezierCurveTo(cx + s * 0.38, cy + s * 0.35, cx + s * 0.52, cy - s * 0.05, cx + s * 0.32, cy - s * 0.48);
    ctx.stroke();
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.62);
    ctx.bezierCurveTo(cx, cy + s * 0.2, cx - s * 0.1, cy - s * 0.2, cx + s * 0.08, cy - s * 0.62);
    ctx.stroke();
    // Tendrils
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.38, cy - s * 0.08);
    ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.22, cx - s * 0.62, cy - s * 0.06, cx - s * 0.5, cy + s * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.42, cy + s * 0.05);
    ctx.bezierCurveTo(cx + s * 0.58, cy - s * 0.08, cx + s * 0.62, cy + s * 0.12, cx + s * 0.52, cy + s * 0.18);
    ctx.stroke();
    // Leaves
    ctx.fillStyle = '#22c55e';
    const leafPos = [
      [cx - s * 0.28, cy - s * 0.52, 0.5], [cx + s * 0.32, cy - s * 0.48, -0.4],
      [cx + s * 0.08, cy - s * 0.62, 0.2], [cx - s * 0.38, cy - s * 0.08, -0.7],
    ];
    for (const [lx, ly, ang] of leafPos) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, s * 0.12, s * 0.07, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    // Berries (toxic dots)
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(cx - s * 0.28, cy - s * 0.45, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.32, cy - s * 0.42, s * 0.05, 0, Math.PI * 2); ctx.fill();
  },

  // AEGIS — vorn anti-air construct with upward cannon
  aegis(ctx, cx, cy, s) {
    // Base (heavy)
    ctx.fillStyle = '#0f766e';
    _rrect(ctx, cx - s * 0.44, cy + s * 0.28, s * 0.88, s * 0.42, s * 0.1); ctx.fill();
    // Treads
    ctx.fillStyle = '#134e4a';
    ctx.fillRect(cx - s * 0.44, cy + s * 0.5, s * 0.88, s * 0.12);
    for (let i = -3; i <= 3; i++) {
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(cx + i * s * 0.14 - s * 0.04, cy + s * 0.5, s * 0.08, s * 0.12);
    }
    // Turret body
    ctx.fillStyle = '#0d9488';
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.3, 0, Math.PI * 2); ctx.fill();
    // Cannon (pointing up)
    ctx.fillStyle = '#065f46';
    _rrect(ctx, cx - s * 0.1, cy - s * 0.58, s * 0.2, s * 0.68, s * 0.06); ctx.fill();
    ctx.fillStyle = '#14b8a6';
    _rrect(ctx, cx - s * 0.07, cy - s * 0.62, s * 0.14, s * 0.2, s * 0.04); ctx.fill();
    // Muzzle flash / ready indicator
    ctx.save();
    ctx.shadowBlur = s * 0.3; ctx.shadowColor = '#2dd4bf';
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.62, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Side arms
    ctx.fillStyle = '#0f766e';
    ctx.beginPath(); ctx.arc(cx - s * 0.3, cy + s * 0.08, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.3, cy + s * 0.08, s * 0.14, 0, Math.PI * 2); ctx.fill();
  },
};

// ── Shared helpers ─────────────────────────────────────────

function _drawSingleDrone(ctx, cx, cy, s) {
  // Body
  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.5, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#84cc16';
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.34, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // Wings
  ctx.fillStyle = 'rgba(163,230,53,0.45)';
  ctx.beginPath(); ctx.ellipse(cx - s * 0.55, cy - s * 0.15, s * 0.3, s * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.55, cy - s * 0.15, s * 0.3, s * 0.14, 0.3, 0, Math.PI * 2); ctx.fill();
  // Eye
  ctx.fillStyle = '#fef08a';
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.06, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a2e05';
  ctx.beginPath(); ctx.arc(cx + s * 0.03, cy - s * 0.06, s * 0.05, 0, Math.PI * 2); ctx.fill();
}

function _drawBg(ctx, size, defId) {
  const CARD_COLORS = {
    speeder: ['#7c2d12','#431407'], swarmer: ['#713f12','#422006'],
    brute: ['#2e1065','#1e1b4b'], berserker: ['#7f1d1d','#450a0a'],
    kamikaze: ['#78350f','#431407'], shadow: ['#0f172a','#020617'],
    grunt: ['#1e3a8a','#172554'], splasher: ['#0c4a6e','#082f49'],
    spawner: ['#1e3a8a','#172554'], shield_bearer: ['#1e3a8a','#172554'],
    healer: ['#064e3b','#022c22'], booster: ['#78350f','#431407'],
    farm: ['#451a03','#1c0701'], tank: ['#1e3a8a','#172554'],
    sniper: ['#134e4a','#042f2e'], wasp: ['#365314','#1a2e05'],
    phantom: ['#1e1b4b','#0f0f1f'], archer: ['#1e293b','#0f172a'],
    aegis: ['#042f2e','#011f1e'],
    wall: ['#1e293b','#0f172a'], cannon: ['#1e293b','#0f172a'],
    bombhouse: ['#451a03','#1c0701'],
    fireball: ['#7c2d12','#431407'], rocket: ['#1e3a8a','#172554'],
    tornado: ['#1e293b','#0f172a'], freeze: ['#0c4a6e','#082f49'],
    vines: ['#14532d','#052e16'],
  };
  const cols = CARD_COLORS[defId] ?? ['#1e293b','#0f172a'];
  const grd = ctx.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, cols[0]);
  grd.addColorStop(1, cols[1]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
}

function _hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
            : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function _rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function _drawUnknown(ctx, cx, cy, s) {
  ctx.fillStyle = '#475569';
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = `bold ${s * 0.9}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', cx, cy);
}
