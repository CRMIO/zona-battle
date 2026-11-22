import { CONFIG } from '../config.js';

// Manichino da allenamento: incassa colpi, "muore" e poi ricompare.
export class Target {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 20;
    this.hp = CONFIG.TARGET_HP;
    this.alive = true;
    this.respawn = 0;
    this.hitFlash = 0;
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.alive = false;
      this.respawn = CONFIG.TARGET_RESPAWN;
    }
  }

  update(dt) {
    this.hitFlash -= dt;
    if (!this.alive) {
      this.respawn -= dt;
      if (this.respawn <= 0) {
        this.alive = true;
        this.hp = CONFIG.TARGET_HP;
      }
    }
  }

  draw(ctx) {
    if (!this.alive) {
      // Segno a terra mentre aspetta di ricomparire
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(this.x + 4, this.y + 5, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#d9a441';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Barra della vita
    const w = 44;
    const frac = Math.max(0, this.hp / CONFIG.TARGET_HP);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 14, w, 6);
    ctx.fillStyle = frac > 0.5 ? '#4cd964' : frac > 0.25 ? '#ffcc00' : '#ff3b30';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 14, w * frac, 6);
  }
}
