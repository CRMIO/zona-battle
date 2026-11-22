import { CONFIG } from '../config.js';
import { circleHits } from '../systems/physics.js';

export class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = Math.cos(angle) * CONFIG.BULLET_SPEED;
    this.vy = Math.sin(angle) * CONFIG.BULLET_SPEED;
    this.life = CONFIG.BULLET_LIFE;
    this.dead = false;
  }

  // Ritorna il punto d'impatto se ha colpito qualcosa
  update(dt, map, targets) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return null;
    }

    // Avanza a piccoli passi per non "saltare" oltre gli oggetti sottili
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      this.x += (this.vx * dt) / steps;
      this.y += (this.vy * dt) / steps;

      if (this.x < 0 || this.y < 0 || this.x > map.width || this.y > map.height) {
        this.dead = true;
        return null;
      }
      for (const ob of map.query(this.x, this.y, 2)) {
        if (circleHits(ob, this.x, this.y, 2)) {
          this.dead = true;
          return { x: this.x, y: this.y, kind: 'wall' };
        }
      }
      for (const t of targets) {
        if (t.alive && Math.hypot(this.x - t.x, this.y - t.y) < t.r) {
          t.hit(CONFIG.BULLET_DAMAGE);
          this.dead = true;
          return { x: this.x, y: this.y, kind: 'hit' };
        }
      }
    }
    return null;
  }

  draw(ctx) {
    // Traccia luminosa dalla posizione precedente
    ctx.strokeStyle = 'rgba(255, 230, 120, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
}
