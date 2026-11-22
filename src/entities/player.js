import { CONFIG } from '../config.js';
import { moveCircle } from '../systems/physics.js';
import { Bullet } from './bullet.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = CONFIG.PLAYER_RADIUS;
    this.angle = 0;        // direzione della mira
    this.cooldown = 0;     // tempo prima del prossimo colpo
    this.flash = 0;        // durata del lampo dello sparo
  }

  update(dt, input, camera, map, bullets) {
    // --- Movimento ---
    let mx = 0;
    let my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my); // in diagonale non vai più veloce
      let speed = CONFIG.PLAYER_SPEED;
      if (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) speed *= CONFIG.SPRINT_MULT;
      moveCircle(this, (mx / len) * speed * dt, (my / len) * speed * dt, map);
    }

    // --- Mira ---
    const mouse = camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

    // --- Sparo ---
    this.cooldown -= dt;
    this.flash -= dt;
    if (input.mouse.down && this.cooldown <= 0) {
      this.cooldown = 1 / CONFIG.FIRE_RATE;
      this.flash = 0.05;
      const a = this.angle + (Math.random() - 0.5) * 2 * CONFIG.SPREAD;
      const muzzle = this.r + 22;
      bullets.push(new Bullet(this.x + Math.cos(this.angle) * muzzle, this.y + Math.sin(this.angle) * muzzle, a));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Ombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(4, 5, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    // Arma
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(this.r - 6, -4, 28, 8);

    // Lampo dello sparo
    if (this.flash > 0) {
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(this.r + 26, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mani
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath();
    ctx.arc(this.r - 2, 7, 5, 0, Math.PI * 2);
    ctx.arc(this.r + 8, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Corpo
    ctx.fillStyle = '#3a7bd5';
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f4c8a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Testa
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath();
    ctx.arc(2, 0, this.r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
