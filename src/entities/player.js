import { CONFIG } from '../config.js';

// Traduce tastiera e mouse nell'"intenzione" del personaggio del giocatore.
export class PlayerController {
  constructor(me) {
    this.me = me;
    this.buildMode = false;
    this.ghost = null;
  }

  update(dt, game) {
    const me = this.me;
    const it = me.intent;
    const input = game.input;
    it.mx = 0;
    it.my = 0;
    it.fire = false;
    it.firePressed = false;
    it.reload = false;
    it.slot = null;
    it.build = null;
    it.interact = false;
    it.interactPressed = false;
    it.sprint = false;
    if (!me.alive || game.over) return;

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) it.my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) it.my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) it.mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) it.mx += 1;
    it.sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    const m = game.camera.screenToWorld(input.mouse.x, input.mouse.y);
    it.aim = Math.atan2(m.y - me.y, m.x - me.x);

    // Slot: F = piccone, 1-5 = inventario, rotellina = scorri
    if (input.wasPressed('KeyF')) this.pick(it, -1);
    for (let i = 0; i < 5; i++) if (input.wasPressed('Digit' + (i + 1))) this.pick(it, i);
    if (input.wheel !== 0) {
      const options = [-1];
      me.slots.forEach((s, i) => s && options.push(i));
      const at = Math.max(0, options.indexOf(me.active));
      this.pick(it, options[(at + (input.wheel > 0 ? 1 : -1) + options.length) % options.length]);
    }

    if (input.wasPressed('KeyQ')) this.buildMode = !this.buildMode;

    if (this.buildMode) {
      this.ghost = this.ghostCell(game, m);
      if (input.mouse.down) it.build = { x: this.ghost.x, y: this.ghost.y };
    } else {
      it.fire = input.mouse.down;
      it.firePressed = input.mouse.pressed;
    }

    it.reload = input.wasPressed('KeyR');
    it.interact = input.isDown('KeyE');
    it.interactPressed = input.wasPressed('KeyE');
    if (input.wasPressed('KeyM')) game.showBigMap = !game.showBigMap;
  }

  pick(it, slot) {
    it.slot = slot;
    this.buildMode = false;
  }

  // La cella dove verrebbe costruito il muro: sotto il mouse, ma non troppo lontano
  ghostCell(game, m) {
    const me = this.me;
    let dx = m.x - me.x;
    let dy = m.y - me.y;
    const d = Math.hypot(dx, dy) || 1;
    const maxD = CONFIG.BUILD_RANGE - 50;
    if (d > maxD) {
      dx *= maxD / d;
      dy *= maxD / d;
    } else if (d < 60) {
      dx = (dx / d) * 60;
      dy = (dy / d) * 60;
    }
    const T = game.map.T;
    const col = Math.floor((me.x + dx) / T);
    const row = Math.floor((me.y + dy) / T);
    const x = (col + 0.5) * T;
    const y = (row + 0.5) * T;
    return { col, row, x, y, valid: game.tryBuild(me, x, y, true) };
  }
}
