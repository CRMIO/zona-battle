import { CONFIG } from '../config.js';

const PIECE_KEYS = { KeyZ: 'wall', KeyX: 'barrier', KeyC: 'bunker' };
export const PIECE_ORDER = ['wall', 'barrier', 'bunker'];

// Traduce tastiera, mouse e comandi touch nell'"intenzione" del personaggio del giocatore.
export class PlayerController {
  constructor(me) {
    this.me = me;
    this.buildMode = false;
    this.piece = 'wall';
    this.ghost = null;
    this.touchAim = null;
  }

  update(dt, game) {
    const me = this.me;
    const it = me.intent;
    const input = game.input;
    const touch = input.touch;
    it.mx = 0;
    it.my = 0;
    it.fire = false;
    it.firePressed = false;
    it.reload = false;
    it.slot = null;
    it.build = null;
    it.edit = null;
    it.interact = false;
    it.interactPressed = false;
    it.sprint = false;
    if (!me.alive || game.over) return;

    // --- Bus e volo: SPAZIO (o il pulsante di fuoco sul telefono) per lanciarti e per aprire il deltaplano
    if (me.phase !== 'ground') {
      const go = input.wasPressed('Space') || touch.firePressed || input.mouse.pressed;
      if (me.phase === 'bus' && go) game.jump(me);
      else if (me.phase === 'air') {
        if (go) game.openGlider(me);
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) it.my -= 1;
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) it.my += 1;
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) it.mx -= 1;
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) it.mx += 1;
        if (touch.enabled && (touch.mx || touch.my)) {
          it.mx = touch.mx;
          it.my = touch.my;
        }
      }
      if (input.wasPressed('KeyM')) game.showBigMap = !game.showBigMap;
      return;
    }

    // --- Movimento: tastiera o joystick sinistro
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) it.my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) it.my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) it.mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) it.mx += 1;
    it.sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    if (touch.enabled && (touch.mx || touch.my)) {
      it.mx = touch.mx;
      it.my = touch.my;
      it.sprint = Math.hypot(touch.mx, touch.my) > 0.95; // joystick in fondo = corsa
    }

    // --- Mira: mouse, oppure joystick destro
    let target;
    if (touch.enabled) {
      if (touch.aiming) this.touchAim = touch.aimAngle;
      else if (touch.fire && !this.buildMode) {
        // pulsante di fuoco premuto senza trascinarlo: mira da solo al nemico più vicino
        const e = this.nearestEnemy(game);
        if (e) this.touchAim = Math.atan2(e.y - me.y, e.x - me.x);
        else if (it.mx || it.my) this.touchAim = Math.atan2(it.my, it.mx);
      } else if (it.mx || it.my) this.touchAim = Math.atan2(it.my, it.mx);
      it.aim = this.touchAim === null ? me.angle : this.touchAim;
      target = { x: me.x + Math.cos(it.aim) * 100, y: me.y + Math.sin(it.aim) * 100 };
    } else {
      target = game.camera.screenToWorld(input.mouse.x, input.mouse.y);
      it.aim = Math.atan2(target.y - me.y, target.x - me.x);
    }

    // --- Inventario: F = piccone, 1-5 = slot, rotellina = scorri, tocco sulla barra
    if (input.wasPressed('KeyF')) this.pick(it, -1);
    for (let i = 0; i < 5; i++) if (input.wasPressed('Digit' + (i + 1))) this.pick(it, i);
    if (touch.slot !== null && touch.slot !== undefined) this.pick(it, touch.slot);
    if (input.wheel !== 0) {
      const options = [-1];
      me.slots.forEach((s, i) => s && options.push(i));
      const at = Math.max(0, options.indexOf(me.active));
      this.pick(it, options[(at + (input.wheel > 0 ? 1 : -1) + options.length) % options.length]);
    }

    // --- Costruzione: Q attiva/disattiva, Z/X/C scelgono il pezzo, G modifica
    const buildKeys = ['KeyQ', 'KeyZ', 'KeyX', 'KeyC', 'KeyG'];
    if (!game.mode.build) {
      if (buildKeys.some((k) => input.wasPressed(k))) game.flashMessage('Zero Costruzioni: qui non si costruisce', '#ff8a6b', 1.5);
      this.buildMode = false;
    } else {
      if (input.wasPressed('KeyQ')) this.buildMode = !this.buildMode;
      for (const code in PIECE_KEYS) {
        if (input.wasPressed(code)) {
          this.piece = PIECE_KEYS[code];
          this.buildMode = true;
        }
      }
      if (input.wasPressed('KeyG')) {
        const p = this.limitRange(target, CONFIG.BUILD_RANGE - 40, 60);
        it.edit = { x: p.x, y: p.y };
      }
    }

    const fireHeld = input.mouse.down || touch.fire;
    const firePressed = input.mouse.pressed || touch.firePressed;
    if (this.buildMode) {
      this.ghost = this.ghostCells(game, target, it.aim);
      if (fireHeld || firePressed) it.build = { piece: this.piece, x: this.ghost.tx, y: this.ghost.ty };
    } else {
      it.fire = fireHeld;
      it.firePressed = firePressed;
    }

    it.reload = input.wasPressed('KeyR');
    it.interact = input.isDown('KeyE');
    it.interactPressed = input.wasPressed('KeyE');
    if (input.wasPressed('KeyM')) game.showBigMap = !game.showBigMap;
  }

  nearestEnemy(game) {
    const me = this.me;
    const range = me.weapon ? Math.min(me.weapon.range, 700) : 120;
    let best = null;
    let bd = range;
    for (const c of game.chars) {
      if (c === me || !c.alive || c.phase !== 'ground') continue;
      const d = Math.hypot(c.x - me.x, c.y - me.y);
      if (d < bd && !game.map.lineBlocked(me.x, me.y, c.x, c.y)) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  pick(it, slot) {
    it.slot = slot;
    this.buildMode = false;
  }

  // Un punto in direzione del bersaglio, ma tra min e max di distanza dal giocatore
  limitRange(target, maxD, minD) {
    const me = this.me;
    let dx = target.x - me.x;
    let dy = target.y - me.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = d > maxD ? maxD / d : d < minD ? minD / d : 1;
    return { x: me.x + dx * k, y: me.y + dy * k };
  }

  // Le celle dove verrebbe costruito il pezzo, con validità per ognuna
  ghostCells(game, target, angle) {
    const me = this.me;
    const p = this.limitRange(target, CONFIG.BUILD_RANGE - 50, 60);
    const T = game.map.T;
    const saved = me.angle;
    me.angle = angle;
    const cells = game.pieceCells(me, this.piece, p.x, p.y, angle).map(([col, row]) => ({
      col,
      row,
      valid: game.tryBuild(me, (col + 0.5) * T, (row + 0.5) * T, true),
    }));
    me.angle = saved;
    return { piece: this.piece, tx: p.x, ty: p.y, cells };
  }
}
