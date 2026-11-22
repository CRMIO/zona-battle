import { lerp, clamp, TAU } from '../utils.js';

// Fasi della tempesta: attesa, poi il cerchio si restringe. dps = danno al secondo fuori dalla zona.
const PHASES = [
  { wait: 60, shrink: 60, dps: 1 },
  { wait: 45, shrink: 45, dps: 1, frac: 0.55 },
  { wait: 40, shrink: 35, dps: 2, frac: 0.5 },
  { wait: 30, shrink: 30, dps: 4, frac: 0.5 },
  { wait: 25, shrink: 22, dps: 6, frac: 0.45 },
  { wait: 20, shrink: 18, dps: 8, frac: 0.4 },
  { wait: 15, shrink: 15, dps: 10, frac: 0 },
];

export class Storm {
  constructor(map, rng) {
    this.map = map;
    this.rng = rng;
    const W = map.width;
    const H = map.height;
    this.cur = { x: W / 2, y: H / 2, r: Math.hypot(W, H) / 2 + 100 };
    this.phase = 0;
    this.state = 'wait';
    this.timer = PHASES[0].wait;
    this.dps = PHASES[0].dps;
    this.from = null;
    this.to = this.pickNext();
  }

  pickNext() {
    const W = this.map.width;
    const H = this.map.height;
    const p = PHASES[this.phase];
    const first = this.phase === 0;
    const r = first ? Math.min(W, H) * 0.38 : this.cur.r * p.frac;
    const maxOff = first ? Math.min(W, H) * 0.14 : Math.max(0, this.cur.r - r) * 0.85;
    const a = this.rng() * TAU;
    const d = Math.sqrt(this.rng()) * maxOff;
    const cx = first ? W / 2 : this.cur.x;
    const cy = first ? H / 2 : this.cur.y;
    return {
      x: clamp(cx + Math.cos(a) * d, 400, W - 400),
      y: clamp(cy + Math.sin(a) * d, 400, H - 400),
      r,
    };
  }

  update(dt) {
    if (this.state === 'final') return;
    this.timer -= dt;
    const p = PHASES[this.phase];
    if (this.state === 'wait') {
      if (this.timer <= 0) {
        this.state = 'shrink';
        this.timer = p.shrink;
        this.from = { ...this.cur };
      }
      return;
    }
    const k = 1 - Math.max(0, this.timer) / p.shrink;
    this.cur = {
      x: lerp(this.from.x, this.to.x, k),
      y: lerp(this.from.y, this.to.y, k),
      r: lerp(this.from.r, this.to.r, k),
    };
    if (this.timer <= 0) {
      this.cur = { ...this.to };
      this.phase++;
      if (this.phase >= PHASES.length) {
        this.state = 'final';
        this.to = null;
        this.dps = 12;
      } else {
        this.state = 'wait';
        this.timer = PHASES[this.phase].wait;
        this.dps = PHASES[this.phase].dps;
        this.to = this.pickNext();
      }
    }
  }

  contains(x, y, margin = 0) {
    return Math.hypot(x - this.cur.x, y - this.cur.y) < this.cur.r - margin;
  }

  // Dove conviene andare: la prossima zona sicura (o quella attuale)
  safeTarget() {
    return this.to || this.cur;
  }

  draw(ctx, view, t) {
    const c = this.cur;
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.left, view.top, view.right - view.left, view.bottom - view.top);
    ctx.arc(c.x, c.y, Math.max(1, c.r), 0, TAU, true);
    ctx.fillStyle = 'rgba(110,40,200,0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.max(1, c.r), 0, TAU);
    ctx.strokeStyle = `rgba(200,140,255,${0.6 + 0.3 * Math.sin(t * 3)})`;
    ctx.lineWidth = 8;
    ctx.stroke();

    if (this.to) {
      ctx.setLineDash([24, 18]);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.to.x, this.to.y, Math.max(1, this.to.r), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}
