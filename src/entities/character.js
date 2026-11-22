import { CONFIG } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { moveCircle } from '../systems/physics.js';

let nextId = 1;

// L'"intenzione" è quello che il personaggio vuole fare in questo frame.
// La compila il giocatore (tastiera/mouse) o l'IA del bot: così entrambi usano le stesse regole.
export function emptyIntent() {
  return {
    mx: 0, my: 0, aim: 0, sprint: false,
    fire: false, firePressed: false, reload: false,
    slot: null, build: null, edit: null,
    interact: false, interactPressed: false,
  };
}

export class Character {
  constructor(x, y, name, skin, isPlayer = false) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = CONFIG.CHAR_RADIUS;
    this.name = name;
    this.skin = skin;
    this.isPlayer = isPlayer;

    this.hp = CONFIG.MAX_HP;
    this.shield = 0;
    this.alive = true;
    this.kills = 0;

    this.slots = [null, null, null, null, null];
    this.active = -1; // -1 = piccone
    this.ammo = { light: 0, medium: 0, heavy: 0, shells: 0 };
    this.mats = CONFIG.START_MATS;

    this.angle = 0;
    this.walk = 0;
    this.fireCd = 0;
    this.reloadT = 0;
    this.reloadTotal = 1;
    this.swingT = 0;
    this.swingAnim = 0;
    this.buildCd = 0;
    this.editCd = 0;
    this.channel = null; // { kind: 'heal' | 'open', t, total, ... }
    this.hurtT = 0;
    this.showBarT = 0;
    this.lastShot = -10;
    this.lastHitBy = null;
    this.lastHitTime = -10;
    this.stormAcc = 0;
    this.nearChest = null;
    this.intent = emptyIntent();
  }

  get current() {
    return this.active >= 0 ? this.slots[this.active] : null;
  }

  get weapon() {
    const c = this.current;
    return c && c.kind === 'weapon' ? WEAPONS[c.id] : null;
  }

  select(i) {
    if (i === this.active) return;
    if (i >= 0 && !this.slots[i]) return;
    this.active = i;
    this.reloadT = 0;
    this.channel = null;
    this.fireCd = Math.max(this.fireCd, 0.12);
  }

  startReload() {
    const w = this.weapon;
    if (!w || this.reloadT > 0) return;
    const c = this.current;
    if (c.mag >= w.mag || this.ammo[w.ammo] <= 0) return;
    this.reloadT = this.reloadTotal = w.reload;
  }

  canUse(id) {
    const d = ITEMS[id];
    return d.kind === 'hp' ? this.hp < d.max : this.shield < d.max;
  }

  startHeal() {
    const c = this.current;
    if (!c || c.kind !== 'item' || !this.canUse(c.id)) return false;
    this.channel = { kind: 'heal', t: 0, total: ITEMS[c.id].time, slot: this.active, id: c.id };
    return true;
  }

  finishHeal() {
    const slot = this.channel.slot;
    const c = this.slots[slot];
    if (!c) return;
    const d = ITEMS[c.id];
    if (d.kind === 'hp') this.hp = Math.min(d.max, this.hp + d.amount);
    else this.shield = Math.min(d.max, this.shield + d.amount);
    c.count--;
    if (c.count <= 0) {
      this.slots[slot] = null;
      if (this.active === slot) this.active = -1;
    }
  }

  update(dt, game) {
    const it = this.intent;
    this.fireCd -= dt;
    this.swingT -= dt;
    this.swingAnim -= dt;
    this.buildCd -= dt;
    this.hurtT -= dt;
    this.showBarT -= dt;

    if (it.slot !== null && it.slot !== undefined) this.select(it.slot);

    // --- Movimento ---
    const len = Math.hypot(it.mx, it.my);
    if (len > 0.01) {
      if (this.channel && this.channel.kind === 'open') this.channel = null;
      let speed = CONFIG.WALK_SPEED;
      if (it.sprint && !this.channel) speed *= CONFIG.SPRINT_MULT;
      if (this.channel) speed *= CONFIG.HEAL_SLOW;
      moveCircle(this, (it.mx / len) * speed * dt, (it.my / len) * speed * dt, game.map);
      this.walk += (dt * speed) / 22;
    }
    this.angle = it.aim;

    // --- Ricarica ---
    const w = this.weapon;
    const cur = this.current;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0 && w) {
        const take = Math.min(w.mag - cur.mag, this.ammo[w.ammo]);
        cur.mag += take;
        this.ammo[w.ammo] -= take;
      }
    }
    if (it.reload) this.startReload();

    // --- Azioni lunghe (curarsi, aprire casse) ---
    if (this.channel) {
      this.channel.t += dt;
      if (this.channel.t >= this.channel.total) {
        if (this.channel.kind === 'heal') this.finishHeal();
        else if (this.channel.kind === 'open') game.openChest(this.channel.chest, this);
        this.channel = null;
      }
    }

    // --- Sparare / colpire / usare ---
    if (this.active === -1) {
      if (it.fire && this.swingT <= 0) game.swingPickaxe(this);
    } else if (w) {
      if (this.reloadT <= 0 && this.fireCd <= 0 && (w.auto ? it.fire : it.firePressed)) {
        if (cur.mag > 0) game.fireWeapon(this, cur, w);
        else this.startReload();
      }
      if (cur.mag === 0 && this.reloadT <= 0 && this.fireCd <= 0) this.startReload();
    } else if (cur && cur.kind === 'item') {
      if (it.firePressed && !this.channel) this.startHeal();
    }

    // --- Costruire ---
    if (it.build && this.buildCd <= 0) game.buildPiece(this, it.build.piece || 'wall', it.build.x, it.build.y);
    this.editCd -= dt;
    if (it.edit && this.editCd <= 0) {
      game.tryEdit(this, it.edit.x, it.edit.y);
      this.editCd = 0.2;
    }

    game.handleInteract(this, it.interact, it.interactPressed);
  }
}
