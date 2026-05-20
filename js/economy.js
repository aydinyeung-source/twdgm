import { ELIXIR_MAX, ELIXIR_START, ELIXIR_RATE, ELIXIR_RATE_OT } from './data.js';
import { clamp } from './engine.js';

export class Economy {
  constructor() {
    this.elixir    = ELIXIR_START;
    this._overflow = 0;
    this.onChange  = null;
  }

  reset() {
    this.elixir    = ELIXIR_START;
    this._overflow = 0;
    this._notify();
  }

  tick(dt, overtime = false) {
    if (this.elixir >= ELIXIR_MAX) return;
    const rate = overtime ? ELIXIR_RATE_OT : ELIXIR_RATE;
    this._overflow += rate * dt;
    const whole = Math.floor(this._overflow);
    if (whole > 0) {
      this._overflow -= whole;
      this.add(whole);
    }
    this._notify();
  }

  add(amount) {
    this.elixir = clamp(this.elixir + amount, 0, ELIXIR_MAX);
    this._notify();
  }

  spend(amount) {
    if (this.elixir < amount) return false;
    this.elixir -= amount;
    this._notify();
    return true;
  }

  canAfford(cost) { return this.elixir >= cost; }

  get visual() { return clamp(this.elixir + this._overflow, 0, ELIXIR_MAX); }

  _notify() {
    if (this.onChange) this.onChange(this);
    const fill = document.getElementById('elixir-bar-fill');
    const num  = document.getElementById('elixir-num');
    if (fill) fill.style.width = `${(this.visual / ELIXIR_MAX) * 100}%`;
    if (num)  num.textContent  = Math.floor(this.elixir);

    document.querySelectorAll('.epip').forEach(pip => {
      const n = parseInt(pip.dataset.n, 10);
      pip.classList.toggle('active', n <= this.elixir);
    });
  }
}
