// Card thumbnail renderer
// Draws the same geometric shapes used by the in-game renderer onto a small canvas.

const UNIT_STYLE = {
  speeder:      { body: '#f97316', rim: '#fed7aa', shape: 'diamond'  },
  swarmer:      { body: '#eab308', rim: '#fef08a', shape: 'triangle' },
  brute:        { body: '#7c3aed', rim: '#c4b5fd', shape: 'hexagon'  },
  berserker:    { body: '#dc2626', rim: '#fca5a5', shape: 'star'     },
  kamikaze:     { body: '#f59e0b', rim: '#fde68a', shape: 'cross'    },
  shadow:       { body: '#334155', rim: '#94a3b8', shape: 'circle'   },
  grunt:        { body: '#2563eb', rim: '#93c5fd', shape: 'shield'   },
  splasher:     { body: '#0891b2', rim: '#67e8f9', shape: 'circle'   },
  spawner:      { body: '#1d4ed8', rim: '#93c5fd', shape: 'hexagon'  },
  shield_bearer:{ body: '#1e40af', rim: '#bfdbfe', shape: 'shield'   },
  healer:       { body: '#059669', rim: '#6ee7b7', shape: 'cross'    },
  booster:      { body: '#d97706', rim: '#fde68a', shape: 'diamond'  },
  farm:         { body: '#92400e', rim: '#fcd34d', shape: 'square'   },
  tank:         { body: '#1e3a8a', rim: '#60a5fa', shape: 'hexagon'  },
  sniper:       { body: '#0f766e', rim: '#5eead4', shape: 'triangle' },
};

export function cardThumbCanvas(defId, size = 48) {
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.33;
  const style = UNIT_STYLE[defId] ?? { body: '#475569', rim: '#94a3b8', shape: 'circle' };

  ctx.save();
  ctx.shadowBlur  = size * 0.2;
  ctx.shadowColor = style.rim;

  const grd = ctx.createRadialGradient(cx - r*0.28, cy - r*0.3, 0, cx, cy, r);
  grd.addColorStop(0, _lighten(style.body, 55));
  grd.addColorStop(1, style.body);
  _drawShape(ctx, cx, cy, r, style.shape, grd);

  ctx.shadowBlur  = 0;
  ctx.strokeStyle = style.rim;
  ctx.lineWidth   = Math.max(1, r * 0.13);
  _strokeShape(ctx, cx, cy, r, style.shape);

  _drawDetail(ctx, defId, cx, cy, r * 0.38, style.rim);
  ctx.restore();
  return canvas;
}

// ── Shape helpers ──────────────────────────────────────────

function _drawShape(ctx, x, y, r, shape, fill) {
  ctx.beginPath();
  _shapePath(ctx, x, y, r, shape);
  ctx.fillStyle = fill;
  ctx.fill();
}

function _strokeShape(ctx, x, y, r, shape) {
  ctx.beginPath();
  _shapePath(ctx, x, y, r, shape);
  ctx.stroke();
}

function _shapePath(ctx, x, y, r, shape) {
  switch (shape) {
    case 'circle':   ctx.arc(x, y, r, 0, Math.PI*2); break;
    case 'diamond':  ctx.moveTo(x, y-r); ctx.lineTo(x+r*0.7,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r*0.7,y); ctx.closePath(); break;
    case 'triangle': ctx.moveTo(x,y-r); ctx.lineTo(x+r*0.87,y+r*0.5); ctx.lineTo(x-r*0.87,y+r*0.5); ctx.closePath(); break;
    case 'square':   ctx.rect(x-r, y-r, r*2, r*2); break;
    case 'hexagon':  _hexPath(ctx, x, y, r); break;
    case 'star':     _starPath(ctx, x, y, r); break;
    case 'cross':    _crossPath(ctx, x, y, r); break;
    case 'shield':   _shieldPath(ctx, x, y, r); break;
    default:         ctx.arc(x, y, r, 0, Math.PI*2);
  }
}

function _hexPath(ctx, x, y, r) {
  for (let i = 0; i < 6; i++) {
    const a = (i/6)*Math.PI*2 - Math.PI/2;
    i === 0 ? ctx.moveTo(x+Math.cos(a)*r, y+Math.sin(a)*r)
            : ctx.lineTo(x+Math.cos(a)*r, y+Math.sin(a)*r);
  }
  ctx.closePath();
}

function _starPath(ctx, x, y, r) {
  const inner = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const a = (i/10)*Math.PI*2 - Math.PI/2;
    const d = i%2 === 0 ? r : inner;
    i === 0 ? ctx.moveTo(x+Math.cos(a)*d, y+Math.sin(a)*d)
            : ctx.lineTo(x+Math.cos(a)*d, y+Math.sin(a)*d);
  }
  ctx.closePath();
}

function _crossPath(ctx, x, y, r) {
  const t = r * 0.3;
  ctx.moveTo(x-t,y-r); ctx.lineTo(x+t,y-r);
  ctx.lineTo(x+t,y-t); ctx.lineTo(x+r,y-t);
  ctx.lineTo(x+r,y+t); ctx.lineTo(x+t,y+t);
  ctx.lineTo(x+t,y+r); ctx.lineTo(x-t,y+r);
  ctx.lineTo(x-t,y+t); ctx.lineTo(x-r,y+t);
  ctx.lineTo(x-r,y-t); ctx.lineTo(x-t,y-t);
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

// ── Inner detail symbol ────────────────────────────────────

function _drawDetail(ctx, defId, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = Math.max(0.8, s * 0.25);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  switch (defId) {
    case 'grunt':
    case 'berserker': // sword cross
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
      ctx.moveTo(x-s*0.6, y-s*0.15); ctx.lineTo(x+s*0.6, y-s*0.15);
      ctx.stroke(); break;

    case 'sniper': // arrow pointing right
      ctx.beginPath();
      ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
      ctx.moveTo(x+s*0.4, y-s*0.5); ctx.lineTo(x+s, y); ctx.lineTo(x+s*0.4, y+s*0.5);
      ctx.stroke(); break;

    case 'healer': // plus / medical cross
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
      ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
      ctx.stroke(); break;

    case 'shield_bearer': // mini shield outline
      ctx.beginPath();
      ctx.moveTo(x, y-s);
      ctx.lineTo(x+s*0.7, y-s*0.3); ctx.lineTo(x+s*0.7, y+s*0.3);
      ctx.lineTo(x, y+s);
      ctx.lineTo(x-s*0.7, y+s*0.3); ctx.lineTo(x-s*0.7, y-s*0.3);
      ctx.closePath(); ctx.stroke(); break;

    case 'kamikaze': // burst lines
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(x+Math.cos(a)*s*0.3, y+Math.sin(a)*s*0.3);
        ctx.lineTo(x+Math.cos(a)*s,     y+Math.sin(a)*s);
        ctx.stroke();
      } break;

    case 'farm': // coin circle
      ctx.beginPath();
      ctx.arc(x, y, s*0.68, 0, Math.PI*2);
      ctx.stroke(); break;

    case 'booster': // upward chevron
      ctx.beginPath();
      ctx.moveTo(x, y-s); ctx.lineTo(x+s*0.6, y+s*0.3);
      ctx.lineTo(x, y); ctx.lineTo(x-s*0.6, y+s*0.3);
      ctx.closePath(); ctx.fill(); break;

    case 'spawner': // three dots
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(x+i*s*0.55, y, s*0.24, 0, Math.PI*2);
        ctx.fill();
      } break;

    case 'shadow': // eye
      ctx.beginPath();
      ctx.moveTo(x-s, y);
      ctx.quadraticCurveTo(x, y-s*0.7, x+s, y);
      ctx.quadraticCurveTo(x, y+s*0.7, x-s, y);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, s*0.28, 0, Math.PI*2); ctx.fill(); break;

    case 'tank': // concentric circle (armour)
      ctx.beginPath(); ctx.arc(x, y, s*0.55, 0, Math.PI*2); ctx.stroke(); break;

    case 'splasher': // water drop (circle + lines)
      ctx.beginPath(); ctx.arc(x, y, s*0.4, 0, Math.PI*2); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(x+Math.cos(a)*s*0.55, y+Math.sin(a)*s*0.55);
        ctx.lineTo(x+Math.cos(a)*s*0.9,  y+Math.sin(a)*s*0.9);
        ctx.stroke();
      } break;

    default:
      ctx.beginPath(); ctx.arc(x, y, s*0.35, 0, Math.PI*2); ctx.fill();
  }
}

function _lighten(hex, amt = 40) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amt);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amt);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amt);
  return `rgb(${r},${g},${b})`;
}
