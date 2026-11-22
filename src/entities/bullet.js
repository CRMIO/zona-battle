import { circleHits } from '../systems/physics.js';

const STEP = 10; // il proiettile avanza a piccoli passi per non "saltare" oltre gli oggetti

export class Bullet {
  constructor(owner, x, y, angle, def, damage) {
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
    this.speed = def.speed;
    this.remaining = def.range;
    this.damage = damage;
    this.weapon = def.id;
    this.dead = false;
  }

  update(dt, game) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.travel(Math.min(this.speed * dt, this.remaining), game);
    if (this.remaining <= 0) this.dead = true;
  }

  travel(dist, game) {
    this.remaining -= dist;
    let left = dist;
    while (left > 0 && !this.dead) {
      const s = Math.min(STEP, left);
      left -= s;
      this.x += this.dx * s;
      this.y += this.dy * s;

      if (this.x < 0 || this.y < 0 || this.x > game.map.width || this.y > game.map.height) {
        this.dead = true;
        return;
      }
      for (const c of game.chars) {
        if (c === this.owner || !c.alive || c.phase !== 'ground') continue;
        const ex = this.x - c.x;
        const ey = this.y - c.y;
        if (ex * ex + ey * ey < c.r * c.r) {
          game.damage(c, this.damage, this.owner);
          game.spark(this.x, this.y, '#ff5a4a', 6);
          this.dead = true;
          return;
        }
      }
      for (const ob of game.map.queryObstacles(this.x, this.y, 1)) {
        if (ob.window) continue; // le finestre lasciano passare i proiettili
        if (circleHits(ob, this.x, this.y, 1)) {
          if (ob.kind === 'wall' || ob.kind === 'hwall') game.damageObstacle(ob, this.damage, null);
          game.spark(this.x, this.y, ob.kind === 'rock' ? '#c9ccd0' : '#e0b070', 5);
          this.dead = true;
          return;
        }
      }
    }
  }

  draw(ctx) {
    const sniper = this.weapon === 'sniper';
    ctx.strokeStyle = sniper ? 'rgba(255,255,255,0.95)' : this.weapon === 'shotgun' ? 'rgba(255,210,120,0.9)' : 'rgba(255,230,120,0.95)';
    ctx.lineWidth = sniper ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
}
