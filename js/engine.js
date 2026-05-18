// ── Math helpers ───────────────────────────────────────────
export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function randFloat(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

// ── Game loop ──────────────────────────────────────────────
export class GameLoop {
  constructor(updateFn, renderFn) {
    this._update  = updateFn;
    this._render  = renderFn;
    this._running = false;
    this._last    = 0;
    this._raf     = null;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(t => this._tick(t));
  }

  stop() {
    this._running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _tick(now) {
    if (!this._running) return;
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    this._update(dt, now);
    this._render();
    this._raf = requestAnimationFrame(t => this._tick(t));
  }
}

// ── Particle system ────────────────────────────────────────
export class Particles {
  constructor() { this.list = []; }

  burst(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randFloat(opts.speedLo ?? 60, opts.speedHi ?? 160);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  randFloat(opts.rLo ?? 2, opts.rHi ?? 5),
        life: 1,
        decay: randFloat(opts.decayLo ?? 1.4, opts.decayHi ?? 2.2),
        color: opts.color ?? '#f97316',
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vx *= 0.88;
      p.vy *= 0.88;
      p.life -= p.decay * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── Tween helper ───────────────────────────────────────────
export class Tween {
  constructor(from, to, durationMs, easing = t => t) {
    this.from     = from;
    this.to       = to;
    this.duration = durationMs;
    this.easing   = easing;
    this.elapsed  = 0;
    this.done     = false;
    this.value    = from;
  }

  update(dt) {
    if (this.done) return;
    this.elapsed += dt * 1000;
    const t = clamp(this.elapsed / this.duration, 0, 1);
    this.value = lerp(this.from, this.to, this.easing(t));
    if (t >= 1) { this.done = true; this.value = this.to; }
  }
}

export function easeOut(t) { return 1 - (1 - t) ** 3; }
export function easeIn(t)  { return t ** 3; }

// ── Unique ID generator ────────────────────────────────────
let _uid = 0;
export function uid() { return ++_uid; }
