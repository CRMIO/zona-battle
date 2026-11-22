// IA dei nemici. Ogni 0.2 s il bot "pensa" e sceglie uno stato:
//   loot   → cerca casse e oggetti utili (costruisce ponti per raggiungere le isole)
//   fight  → combatte: sceglie l'arma giusta per la distanza, si sposta di lato, costruisce copertura se colpito
//   flee   → scappa se è debole o disarmato, alzando muri alle spalle
//   heal   → si cura (e si chiude tra i muri se un nemico è vicino)
//   storm  → corre verso la zona sicura
// In più: se resta bloccato rompe l'ostacolo col piccone, e se ha pochi materiali abbatte alberi.

import { CONFIG } from '../config.js';
import { WEAPONS, weaponPower } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { circleHits } from '../systems/physics.js';
import { angleDiff, clamp, gauss } from '../utils.js';

const PROBES = [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7, 2.3, -2.3, Math.PI];

export class BotBrain {
  constructor(me) {
    this.me = me;
    this.skill = 0.3 + Math.random() * 0.55; // 0 = scarso, 1 = fortissimo
    this.state = 'loot';
    this.thinkT = Math.random() * 0.3;
    this.enemy = null;
    this.prevEnemy = null;
    this.reactT = 0;
    this.target = null;
    this.targetT = 0;
    this.retargetT = 0;
    this.blacklist = new Map();
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.aimErr = 0;
    this.aimErrT = 0;
    this.coverCd = 0;
    this.buildQueue = [];
    this.lastX = me.x;
    this.lastY = me.y;
    this.posT = 0.5;
    this.stuckCount = 0;
    this.unstuckT = 0;
    this.unstuckAngle = 0;
    this.smash = null;
    this.wander = null;
    this.side = Math.random() < 0.5 ? 1 : -1;
    this.wantMove = false;
    this.steerCache = null;
    this.steerT = 0;
  }

  update(dt, game) {
    const me = this.me;
    const it = me.intent;
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
    it.aim = me.angle;
    this.wantMove = false;

    this.thinkT -= dt;
    this.reactT -= dt;
    this.strafeT -= dt;
    this.aimErrT -= dt;
    this.coverCd -= dt;
    this.unstuckT -= dt;
    this.steerT -= dt;
    this.targetT += dt;

    if (this.thinkT <= 0) {
      this.thinkT = 0.2 + Math.random() * 0.1;
      this.think(game);
    }

    if (this.smash) this.doSmash(dt, game);
    else if (this.state === 'fight') this.fight(game);
    else if (this.state === 'flee') this.flee(game);
    else if (this.state === 'heal') this.heal(game);
    else if (this.state === 'storm') this.goStorm(game);
    else this.loot(game);

    if (this.buildQueue.length && me.buildCd <= 0 && me.mats >= CONFIG.WALL_COST && !it.build) {
      it.build = this.buildQueue.shift();
    }
    this.checkStuck(dt, game);
  }

  // ------------------------------------------------------------ Decisioni

  think(g) {
    const me = this.me;
    this.enemy = this.findEnemy(g);
    if (this.enemy !== this.prevEnemy) {
      // tempo di reazione: i bot bravi reagiscono prima
      this.reactT = 0.3 + (1 - this.skill) * 0.6;
      this.prevEnemy = this.enemy;
    }
    const e = this.enemy;
    const d = e ? Math.hypot(e.x - me.x, e.y - me.y) : Infinity;
    const total = me.hp + me.shield;
    const heal = this.healSlot();
    const gun = this.gunSlots().length > 0;
    const outside = !g.storm.contains(me.x, me.y, 30);
    const stormBad = outside && (g.storm.dps >= 2 || g.storm.state === 'shrink' || me.hp < 50);

    let s;
    if (me.channel && me.channel.kind === 'heal' && (!e || d > 260) && !stormBad) s = 'heal';
    else if (e && (!gun || (total < 35 && d < 600))) s = 'flee';
    else if (stormBad) s = 'storm';
    else if (heal >= 0 && (!e || d > 550)) s = 'heal';
    else if (e && gun) s = 'fight';
    else if (outside) s = 'storm';
    else s = 'loot';

    if (s !== 'loot' && this.smash && this.smash.harvest) this.smash = null;
    this.state = s;

    for (const [obj, until] of this.blacklist) if (until < g.time) this.blacklist.delete(obj);
    if (s === 'loot') {
      this.retargetT -= 0.25;
      if (!this.target || this.isGone(this.target) || this.retargetT <= 0) {
        this.pickTarget(g);
        this.retargetT = 1.5;
      }
    }
  }

  findEnemy(g) {
    const me = this.me;
    let best = null;
    let bd = Infinity;
    for (const c of g.chars) {
      if (c === me || !c.alive) continue;
      const d = Math.hypot(c.x - me.x, c.y - me.y);
      // chi è nascosto in un cespuglio e non spara si vede solo da vicino
      const range = g.map.inBush(c.x, c.y) && g.time - c.lastShot > 1.2 ? 160 : 720;
      if (d > range || d >= bd) continue;
      if (g.map.lineBlocked(me.x, me.y, c.x, c.y)) continue;
      best = c;
      bd = d;
    }
    // ricorda chi gli ha sparato
    if (!best && me.lastHitBy && me.lastHitBy !== 'storm' && me.lastHitBy.alive && g.time - me.lastHitTime < 3) {
      best = me.lastHitBy;
    }
    return best;
  }

  gunSlots() {
    const me = this.me;
    const out = [];
    me.slots.forEach((s, i) => {
      if (s && s.kind === 'weapon' && (s.mag > 0 || me.ammo[WEAPONS[s.id].ammo] > 0)) out.push(i);
    });
    return out;
  }

  bestWeaponFor(d) {
    const me = this.me;
    let best = -1;
    let bs = -1;
    for (const i of this.gunSlots()) {
      const s = me.slots[i];
      const def = WEAPONS[s.id];
      const fit = d >= def.botRange[0] && d <= def.botRange[1] ? 1 : d > def.botRange[1] ? 0.25 : 0.55;
      const score = weaponPower(s) * fit * (s.mag > 0 ? 1 : 0.6);
      if (score > bs) {
        bs = score;
        best = i;
      }
    }
    return best;
  }

  healSlot() {
    const me = this.me;
    let best = -1;
    let bestScore = 0;
    me.slots.forEach((s, i) => {
      if (!s || s.kind !== 'item' || !me.canUse(s.id)) return;
      const d = ITEMS[s.id];
      let score = d.kind === 'hp' ? (me.hp < 50 ? 3 : 1.5) : 2;
      score += d.amount / 100;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  }

  isGone(t) {
    return t.type === 'chest' ? t.obj.opened : t.obj.dead;
  }

  // Quanto è utile un oggetto a terra (0 = non serve)
  usefulness(data) {
    const me = this.me;
    if (data.kind === 'weapon') {
      const weapons = me.slots.filter((s) => s && s.kind === 'weapon');
      const hasEmpty = me.slots.some((s) => !s);
      const noGun = this.gunSlots().length === 0;
      if (hasEmpty && weapons.length < 3) return noGun ? 3 : 1.5;
      const worst = Math.min(...weapons.map(weaponPower));
      return weaponPower(data) > worst * 1.15 ? 1.2 : 0;
    }
    if (data.kind === 'item') {
      const def = ITEMS[data.id];
      const stack = me.slots.some((s) => s && s.kind === 'item' && s.id === data.id && s.count < def.stack);
      return stack || me.slots.some((s) => !s) ? 1 : 0;
    }
    if (data.kind === 'ammo') {
      const uses = me.slots.some((s) => s && s.kind === 'weapon' && WEAPONS[s.id].ammo === data.id);
      return uses ? (me.ammo[data.id] < 60 ? 1.2 : 0.3) : 0.1;
    }
    if (data.kind === 'mats') return me.mats < 300 ? 0.8 : 0;
    return 0;
  }

  pickTarget(g) {
    const me = this.me;
    let best = null;
    let bs = Infinity;
    const consider = (type, obj, score) => {
      if (score < bs) {
        bs = score;
        best = { type, obj, x: obj.x, y: obj.y };
      }
    };
    for (const chest of g.map.chests) {
      if (chest.opened || this.blacklist.has(chest)) continue;
      const d = Math.hypot(chest.x - me.x, chest.y - me.y);
      if (d > 2200) continue;
      if (chest.island && me.mats < 90) continue; // servono materiali per il ponte
      let s = d * (chest.luck > 0 ? 0.75 : 1);
      if (!g.storm.contains(chest.x, chest.y, 50)) s *= 3;
      consider('chest', chest, s);
    }
    for (const p of g.pickups) {
      if (p.dead || this.blacklist.has(p)) continue;
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      if (d > 1400) continue;
      const u = this.usefulness(p.data);
      if (u <= 0) continue;
      consider('pickup', p, d / u);
    }
    // tieni il bersaglio attuale se non c'è niente di molto migliore
    if (this.target && !this.isGone(this.target) && best && best.obj !== this.target.obj) {
      const cur = Math.hypot(this.target.x - me.x, this.target.y - me.y);
      if (cur < bs * 1.4) return;
    }
    if (!best || !this.target || best.obj !== this.target.obj) this.targetT = 0;
    this.target = best;
  }

  // ------------------------------------------------------------ Stati

  fight(g) {
    const me = this.me;
    const it = me.intent;
    const e = this.enemy;
    if (!e || !e.alive) return this.loot(g);
    const dx = e.x - me.x;
    const dy = e.y - me.y;
    const d = Math.hypot(dx, dy) || 1;
    const slot = this.bestWeaponFor(d);
    if (slot < 0) return this.flee(g);
    if (me.active !== slot) it.slot = slot;
    const inst = me.slots[slot];
    const w = WEAPONS[inst.id];

    // Mira: anticipa il movimento del bersaglio + un errore che dipende dall'abilità
    if (this.aimErrT <= 0) {
      this.aimErrT = 0.25 + Math.random() * 0.3;
      this.aimErr = gauss() * (1 - this.skill) * 0.16;
    }
    const lead = (d / w.speed) * this.skill;
    it.aim = Math.atan2(e.y + e.vy * lead - me.y, e.x + e.vx * lead - me.x) + this.aimErr;

    // Movimento: si avvicina/allontana verso la distanza ideale e si sposta di lato
    if (this.strafeT <= 0) {
      this.strafeT = 0.6 + Math.random() * 1.2;
      this.strafe = Math.random() < 0.5 ? 1 : -1;
    }
    let radial = 0;
    if (d > w.ideal * 1.25) radial = 1;
    else if (d < w.ideal * 0.6) radial = -0.8;
    const ux = dx / d;
    const uy = dy / d;
    const mx = ux * radial - uy * this.strafe * 0.85;
    const my = uy * radial + ux * this.strafe * 0.85;
    this.steer(g, Math.atan2(my, mx));

    // Sparo
    const blocker = g.map.lineBlocked(me.x, me.y, e.x, e.y);
    if (!blocker) {
      if (this.reactT <= 0 && d < w.range) {
        it.fire = true;
        it.firePressed = me.fireCd <= 0 && Math.random() < 0.15 + this.skill * 0.35;
      }
    } else if ((blocker.kind === 'wall' && blocker.owner !== me.id) || (blocker.kind === 'hwall' && d < 350)) {
      // il nemico si è coperto: distruggi il muro
      if (this.reactT <= 0 && d < 600) {
        it.aim = Math.atan2(blocker.y + blocker.h / 2 - me.y, blocker.x + blocker.w / 2 - me.x);
        it.fire = true;
        it.firePressed = me.fireCd <= 0;
      }
    } else if (blocker.kind !== 'wall') {
      this.steer(g, Math.atan2(dy, dx) + this.strafe * 0.6);
    }

    // Copertura: se lo colpiscono costruisce un muro verso il nemico
    if (g.time - me.lastHitTime < 0.5 && this.coverCd <= 0 && me.mats >= CONFIG.WALL_COST && Math.random() < 0.4 + this.skill * 0.4) {
      const a = Math.atan2(dy, dx);
      this.buildQueue.push({ x: me.x + Math.cos(a) * 70, y: me.y + Math.sin(a) * 70 });
      this.coverCd = 3 + Math.random() * 3;
    }
  }

  flee(g) {
    const me = this.me;
    const it = me.intent;
    const e = this.enemy;
    if (!e || !e.alive) return this.loot(g);
    const d = Math.hypot(e.x - me.x, e.y - me.y);
    let a = Math.atan2(me.y - e.y, me.x - e.x);
    if (!g.storm.contains(me.x, me.y, 150)) {
      const s = g.storm.safeTarget();
      const toSafe = Math.atan2(s.y - me.y, s.x - me.x);
      a += angleDiff(a, toSafe) * 0.6;
    }
    it.sprint = true;
    this.steer(g, a);
    it.aim = a;

    // muro tra sé e il nemico
    if (this.coverCd <= 0 && me.mats >= CONFIG.WALL_COST && d < 500) {
      const b = a + Math.PI;
      this.buildQueue.push({ x: me.x + Math.cos(b) * 70, y: me.y + Math.sin(b) * 70 });
      this.coverCd = 2.5;
    }
    // se il nemico è vicinissimo e ha un'arma, si difende
    const slot = this.bestWeaponFor(d);
    if (slot >= 0 && d < 220) {
      if (me.active !== slot) it.slot = slot;
      it.aim = Math.atan2(e.y - me.y, e.x - me.x) + gauss() * 0.08;
      it.fire = true;
      it.firePressed = me.fireCd <= 0;
    }
  }

  heal(g) {
    const me = this.me;
    const it = me.intent;
    const e = this.enemy;
    if (!me.channel || me.channel.kind !== 'heal') {
      const slot = this.healSlot();
      if (slot < 0) return this.loot(g);
      if (me.active !== slot) it.slot = slot;
      else it.firePressed = true;
    }
    // Se un nemico è vicino si chiude in una "scatola" di muri
    if (e && this.coverCd <= 0 && me.mats >= CONFIG.WALL_COST * 2) {
      const d = Math.hypot(e.x - me.x, e.y - me.y);
      if (d < 650) {
        const a = Math.atan2(e.y - me.y, e.x - me.x);
        for (const off of [0, 0.9, -0.9]) {
          this.buildQueue.push({ x: me.x + Math.cos(a + off) * 70, y: me.y + Math.sin(a + off) * 70 });
        }
        this.coverCd = 7;
      }
    }
    if (!g.storm.contains(me.x, me.y, 30)) {
      const s = g.storm.safeTarget();
      this.moveTo(g, s.x, s.y, true);
    }
  }

  goStorm(g) {
    const me = this.me;
    const it = me.intent;
    const s = g.storm.safeTarget();
    it.sprint = true;
    this.moveTo(g, s.x, s.y, true);
    this.readyWeapon();
    const e = this.enemy;
    if (e && this.reactT <= 0) {
      const d = Math.hypot(e.x - me.x, e.y - me.y);
      const slot = this.bestWeaponFor(d);
      if (slot >= 0 && d < WEAPONS[me.slots[slot].id].range && !g.map.lineBlocked(me.x, me.y, e.x, e.y)) {
        if (me.active !== slot) it.slot = slot;
        it.aim = Math.atan2(e.y - me.y, e.x - me.x) + gauss() * (1 - this.skill) * 0.2;
        it.fire = true;
        it.firePressed = me.fireCd <= 0 && Math.random() < 0.3;
      }
    }
  }

  loot(g) {
    const me = this.me;
    const it = me.intent;
    this.readyWeapon();
    const t = this.target;
    if (!t || this.isGone(t)) {
      this.target = null;
      // pochi materiali: abbatti un albero o una roccia
      if (me.mats < 60) {
        const ob = this.nearestHarvest(g);
        if (ob) {
          this.smash = { ob, t: 7, harvest: true };
          return;
        }
      }
      if (!this.wander || Math.hypot(me.x - this.wander.x, me.y - this.wander.y) < 90 || this.targetT > 15) {
        const s = g.storm.safeTarget();
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * s.r * 0.7;
        this.wander = {
          x: clamp(s.x + Math.cos(a) * d, 200, g.map.width - 200),
          y: clamp(s.y + Math.sin(a) * d, 200, g.map.height - 200),
        };
        this.targetT = 0;
      }
      this.moveTo(g, this.wander.x, this.wander.y, false);
      return;
    }

    const d = Math.hypot(t.x - me.x, t.y - me.y);
    if (t.type === 'chest') {
      if (d < 48) {
        it.interact = true;
        it.aim = Math.atan2(t.y - me.y, t.x - me.x);
      } else this.moveTo(g, t.x, t.y, true);
    } else if (d < 44) {
      it.interactPressed = true;
      this.blacklist.set(t.obj, g.time + 20); // se non riesce a raccoglierlo non ci riprova subito
      this.target = null;
    } else this.moveTo(g, t.x, t.y, true);

    if (this.targetT > 14 && this.target) {
      this.blacklist.set(this.target.obj, g.time + 40);
      this.target = null;
    }
  }

  // Tiene in mano l'arma migliore e la ricarica quando è tranquillo
  readyWeapon() {
    const me = this.me;
    const it = me.intent;
    if (!me.weapon) {
      const s = this.bestWeaponFor(400);
      if (s >= 0 && !me.channel) it.slot = s;
    } else if (me.current.mag < me.weapon.mag && me.ammo[me.weapon.ammo] > 0) {
      it.reload = true;
    }
  }

  nearestHarvest(g) {
    const me = this.me;
    let best = null;
    let bd = 500;
    for (const ob of g.map.queryObstacles(me.x, me.y, 500)) {
      if (ob.kind !== 'tree' && ob.kind !== 'rock') continue;
      const d = Math.hypot(ob.x - me.x, ob.y - me.y);
      if (d < bd) {
        bd = d;
        best = ob;
      }
    }
    return best;
  }

  doSmash(dt, g) {
    const me = this.me;
    const it = me.intent;
    const s = this.smash;
    s.t -= dt;
    const ob = s.ob;
    if (ob.dead || s.t <= 0 || (s.harvest && (me.mats >= 200 || this.enemy))) {
      this.smash = null;
      return;
    }
    const cx = ob.shape === 'circle' ? ob.x : clamp(me.x, ob.x, ob.x + ob.w);
    const cy = ob.shape === 'circle' ? ob.y : clamp(me.y, ob.y, ob.y + ob.h);
    const d = Math.hypot(cx - me.x, cy - me.y);
    const a = Math.atan2(cy - me.y, cx - me.x);
    it.slot = -1;
    it.aim = a;
    const reach = me.r + 20 + (ob.shape === 'circle' ? ob.r : 0);
    if (d > reach - 4) {
      it.mx = Math.cos(a);
      it.my = Math.sin(a);
      this.wantMove = true;
    } else {
      it.fire = true;
    }
  }

  // ------------------------------------------------------------ Movimento

  moveTo(g, x, y, allowBridge) {
    const me = this.me;
    const it = me.intent;
    const a = Math.atan2(y - me.y, x - me.x);
    it.aim = a;
    // acqua davanti: costruisci un ponte
    if (allowBridge && me.mats >= CONFIG.WALL_COST) {
      const px = me.x + Math.cos(a) * 50;
      const py = me.y + Math.sin(a) * 50;
      if (g.map.isWaterAt(px, py)) {
        it.build = { x: px, y: py };
        it.mx = Math.cos(a);
        it.my = Math.sin(a);
        this.wantMove = true;
        return;
      }
    }
    this.steer(g, a);
  }

  // Sceglie la direzione libera più vicina a quella desiderata
  steer(g, angle) {
    const me = this.me;
    const it = me.intent;
    this.wantMove = true;
    if (this.unstuckT > 0) angle = this.unstuckAngle;
    let chosen = angle;
    if (this.steerT > 0 && this.steerCache && Math.abs(angleDiff(this.steerCache.want, angle)) < 0.25) {
      chosen = this.steerCache.got;
    } else {
      for (const off of PROBES) {
        const a = angle + off * this.side;
        if (this.clear(g, a)) {
          chosen = a;
          break;
        }
      }
      this.steerCache = { want: angle, got: chosen };
      this.steerT = 0.12;
    }
    it.mx = Math.cos(chosen);
    it.my = Math.sin(chosen);
  }

  clear(g, a) {
    const me = this.me;
    const r = me.r - 3;
    for (const dist of [26, 52]) {
      const px = me.x + Math.cos(a) * dist;
      const py = me.y + Math.sin(a) * dist;
      if (px < r || py < r || px > g.map.width - r || py > g.map.height - r) return false;
      if (g.map.isWaterAt(px, py)) return false;
      for (const ob of g.map.queryObstacles(px, py, r)) {
        if (circleHits(ob, px, py, r)) return false;
      }
    }
    return true;
  }

  checkStuck(dt, g) {
    const me = this.me;
    this.posT -= dt;
    if (this.posT > 0) return;
    this.posT = 0.5;
    const moved = Math.hypot(me.x - this.lastX, me.y - this.lastY);
    this.lastX = me.x;
    this.lastY = me.y;
    if (!this.wantMove || me.channel || this.smash) {
      this.stuckCount = 0;
      return;
    }
    this.stuckCount = moved < 14 ? this.stuckCount + 1 : 0;
    if (this.stuckCount < 2) return;
    this.stuckCount = 0;

    const a = Math.atan2(me.intent.my, me.intent.mx);
    const px = me.x + Math.cos(a) * 30;
    const py = me.y + Math.sin(a) * 30;
    const ob = g.map.queryObstacles(px, py, 14).find((o) => o.maxHp && circleHits(o, px, py, 14));
    if (ob && Math.random() < 0.7) {
      this.smash = { ob, t: 4, harvest: false }; // bloccato: rompi l'ostacolo
    } else {
      this.unstuckT = 0.8 + Math.random() * 0.6;
      this.unstuckAngle = a + (Math.random() < 0.5 ? 1 : -1) * (1.3 + Math.random());
      this.side *= -1;
    }
  }
}
