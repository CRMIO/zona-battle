import { CONFIG } from './config.js';
import { mulberry32, TAU } from './utils.js';
import { GameMap, WATER } from './world/map.js';
import { Storm } from './world/storm.js';
import { Camera } from './camera.js';
import { Character } from './entities/character.js';
import { BotBrain } from './entities/bot.js';
import { PlayerController } from './entities/player.js';
import { Bullet } from './entities/bullet.js';
import { WEAPONS, RARITIES, weaponPower } from './data/weapons.js';
import { ITEMS, AMMO } from './data/items.js';
import { SKINS, getSkin } from './data/skins.js';
import { chestLoot, floorLoot, itemLabel } from './systems/loot.js';
import { circleHits, overlapsRect } from './systems/physics.js';
import { drawCharacter, drawChest, drawPickup, pickupColor } from './render/art.js';
import { Hud } from './ui/hud.js';
import { botSkillRange } from './data/ranks.js';

// Pezzi da costruire: muro singolo, barriera (3 muri in fila), bunker (8 muri attorno a te)
export const PIECES = {
  wall: { name: 'Muro', key: 'Z' },
  barrier: { name: 'Barriera', key: 'X' },
  bunker: { name: 'Bunker', key: 'C' },
};

const BOT_NAMES = [
  'Lupo', 'Falco', 'Zanzara', 'Tornado', 'Pixel', 'Ninja', 'Bomber', 'Cometa', 'Volpe', 'Razzo',
  'Saetta', 'Gufo', 'Squalo', 'Vortice', 'Tigre', 'Orso', 'Fulmine', 'Ombra', 'Corvo', 'Scheggia',
  'Cobra', 'Mirtillo', 'Biscotto', 'Turbo', 'Riccio', 'Grillo', 'Meteora', 'Lince',
];

export class Game {
  constructor({ ctx, input, skinId, onEnd, mode, rankRP = 0 }) {
    this.ctx = ctx;
    this.mode = mode || { build: true, ranked: false };
    this.skillRange = botSkillRange(this.mode.ranked, rankRP);
    this.input = input;
    this.onEnd = onEnd;
    const seed = (Math.random() * 1e9) | 0;
    this.rng = mulberry32(seed ^ 0x5bd1e995);
    this.map = new GameMap(seed);
    // In Zero Costruzioni non si può costruire: le isole hanno già un ponte
    if (!this.mode.build) this.map.buildIslandBridges();
    this.storm = new Storm(this.map, this.rng);
    this.camera = new Camera();
    this.camera.zoom = CONFIG.ZOOM;

    this.time = 0;
    this.over = false;
    this.paused = false;
    this.result = null;
    this.chars = [];
    this.bots = [];
    this.bullets = [];
    this.pickups = [];
    this.particles = [];
    this.floats = []; // numeri del danno e testi che salgono
    this.killFeed = [];
    this.message = null;
    this.growingWalls = [];
    this.hurtFlash = 0;
    this.showBigMap = false;

    this.spawnCharacters(skinId);
    for (const spot of this.map.lootSpots) this.dropItems(spot.x, spot.y, floorLoot(this.rng), 18);

    this.playerCtl = new PlayerController(this.player);
    this.hud = new Hud(this);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.flashMessage('Trova armi nelle casse e sopravvivi alla tempesta!', '#ffffff', 4);
  }

  spawnCharacters(skinId) {
    const map = this.map;
    const used = [];
    const findSpot = () => {
      for (let i = 0; i < 600; i++) {
        const x = 300 + this.rng() * (map.width - 600);
        const y = 300 + this.rng() * (map.height - 600);
        if (map.isWaterAt(x, y)) continue;
        if (map.queryObstacles(x, y, 30).some((o) => circleHits(o, x, y, 30))) continue;
        if (map.houseAt(x, y)) continue;
        const minD = i < 400 ? 900 : 350;
        if (used.some((u) => Math.hypot(u.x - x, u.y - y) < minD)) continue;
        used.push({ x, y });
        return { x, y };
      }
      return { x: map.width / 2, y: map.height / 2 };
    };

    const p = findSpot();
    this.player = new Character(p.x, p.y, 'Tu', getSkin(skinId), true);
    this.chars.push(this.player);

    const names = BOT_NAMES.slice().sort(() => this.rng() - 0.5);
    for (let i = 0; i < CONFIG.BOTS; i++) {
      const s = findSpot();
      const pool = SKINS.filter((k) => k.tier !== 'rank'); // le skin dei rank restano speciali
      const skin = pool[Math.floor(this.rng() * pool.length)];
      const round = Math.floor(i / names.length);
      const name = names[i % names.length] + (round ? ' ' + (round + 1) : '');
      const bot = new Character(s.x, s.y, name, skin, false);
      bot.brain = new BotBrain(bot, this.skillRange);
      this.chars.push(bot);
      this.bots.push(bot);
    }
  }

  get aliveCount() {
    let n = 0;
    for (const c of this.chars) if (c.alive) n++;
    return n;
  }

  // ================================================================ Aggiornamento

  update(dt) {
    this.time += dt;
    this.playerCtl.update(dt, this);
    for (const b of this.bots) if (b.alive) b.brain.update(dt, this);

    for (const c of this.chars) {
      if (!c.alive) continue;
      const px = c.x;
      const py = c.y;
      c.update(dt, this);
      c.vx = (c.x - px) / dt;
      c.vy = (c.y - py) / dt;
    }

    // Muri in costruzione
    for (const w of this.growingWalls) {
      if (w.dead) continue;
      w.build = Math.min(1, w.build + dt / CONFIG.WALL_BUILD_TIME);
      w.hp = Math.min(w.maxHp, w.hp + (w.maxHp * 0.9 * dt) / CONFIG.WALL_BUILD_TIME);
    }
    this.growingWalls = this.growingWalls.filter((w) => !w.dead && w.build < 1);

    for (const b of this.bullets) b.update(dt, this);
    this.bullets = this.bullets.filter((b) => !b.dead);

    this.updatePickups(dt);
    this.updateStorm(dt);

    // Effetti
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * 4);
      p.vy *= 1 - Math.min(1, dt * 4);
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.t -= dt;
      f.y += f.vy * dt;
      f.x += f.vx * dt;
      f.vy += 60 * dt;
    }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const k of this.killFeed) k.t -= dt;
    this.killFeed = this.killFeed.filter((k) => k.t > 0);
    if (this.message) {
      this.message.t -= dt;
      if (this.message.t <= 0) this.message = null;
    }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    for (const ob of this.map.visibleObstacles(this.camera.viewRect(200))) {
      if (ob.shake > 0) ob.shake -= dt;
    }

    const w = this.player.alive ? this.player.weapon : null;
    // sugli schermi piccoli (telefono) la visuale si allarga un po'
    const screen = Math.max(0.55, Math.min(1, Math.min(this.camera.width, this.camera.height) / 720));
    const zoom = (w && w.id === 'sniper' ? CONFIG.SNIPER_ZOOM : CONFIG.ZOOM) * screen;
    this.camera.follow(this.player, dt, this.map.width, this.map.height, zoom);
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      if (p.dead) continue;
      if (p.vx || p.vy) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const f = 1 - Math.min(1, dt * 5);
        p.vx *= f;
        p.vy *= f;
        if (Math.abs(p.vx) + Math.abs(p.vy) < 5) p.vx = p.vy = 0;
        if (this.map.isWaterAt(p.x, p.y)) {
          p.vx *= -1;
          p.vy *= -1;
        }
      }
      // munizioni e materiali si raccolgono passandoci sopra
      if (p.data.kind === 'ammo' || p.data.kind === 'mats') {
        for (const c of this.chars) {
          if (!c.alive) continue;
          if (Math.hypot(c.x - p.x, c.y - p.y) < CONFIG.AUTO_PICKUP_RANGE) {
            if (p.data.kind === 'mats' && c.mats >= CONFIG.MAX_MATS) continue;
            this.givePickup(c, p);
            break;
          }
        }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);
  }

  updateStorm(dt) {
    this.storm.update(dt);
    for (const c of this.chars) {
      if (!c.alive) continue;
      if (this.storm.contains(c.x, c.y)) {
        c.stormAcc = 0.5;
        continue;
      }
      c.stormAcc += dt;
      if (c.stormAcc >= 1) {
        c.stormAcc -= 1;
        // la tempesta toglie vita direttamente, non lo scudo
        c.hp -= this.storm.dps;
        c.hurtT = 0.15;
        if (c === this.player) {
          this.hurtFlash = 0.3;
          this.addFloat(c.x, c.y - 30, '-' + this.storm.dps, '#d9a6ff', 16);
        }
        if (c.hp <= 0) this.kill(c, 'storm');
      }
    }
  }

  // ================================================================ Combattimento

  fireWeapon(c, inst, w) {
    inst.mag--;
    c.fireCd = 1 / w.fireRate;
    c.lastShot = this.time;
    const dmg = w.damage * RARITIES[inst.rarity].mult;
    const moving = Math.hypot(c.intent.mx, c.intent.my) > 0.1;
    const spread = w.spread * (moving ? 1.4 : 1);
    const muzzle = c.r - 6 + w.len;
    for (let i = 0; i < w.pellets; i++) {
      const a = c.angle + (Math.random() - 0.5) * 2 * spread;
      const b = new Bullet(c, c.x, c.y, a, w, dmg);
      // il proiettile parte dal centro e percorre subito la canna: così non attraversa i muri a contatto
      b.travel(muzzle, this);
      b.prevX = b.x;
      b.prevY = b.y;
      if (!b.dead) this.bullets.push(b);
    }
    const mx = c.x + Math.cos(c.angle) * muzzle - Math.sin(c.angle) * 4;
    const my = c.y + Math.sin(c.angle) * muzzle + Math.cos(c.angle) * 4;
    this.particles.push({ x: mx, y: my, vx: 0, vy: 0, life: 0.06, max: 0.06, color: '#ffd34d', size: w.id === 'shotgun' ? 12 : 8 });
    if (c === this.player) this.camera.shake = Math.min(12, this.camera.shake + (w.id === 'sniper' ? 10 : w.id === 'shotgun' ? 7 : 2.5));
  }

  swingPickaxe(c) {
    c.swingT = 1 / CONFIG.PICKAXE_RATE;
    c.swingAnim = 0.25;
    const hx = c.x + Math.cos(c.angle) * (c.r + 20);
    const hy = c.y + Math.sin(c.angle) * (c.r + 20);
    for (const o of this.chars) {
      if (o === c || !o.alive) continue;
      if (Math.hypot(o.x - hx, o.y - hy) < o.r + 14) {
        this.damage(o, CONFIG.PICKAXE_DAMAGE, c);
        this.spark(hx, hy, '#ff5a4a', 6);
        return;
      }
    }
    for (const ob of this.map.queryObstacles(hx, hy, 14)) {
      if (ob.maxHp && circleHits(ob, hx, hy, 14)) {
        this.damageObstacle(ob, CONFIG.PICKAXE_STRUCT_DAMAGE, c, hx, hy);
        return;
      }
    }
  }

  damage(target, amount, source) {
    if (!target.alive) return;
    const toShield = Math.min(target.shield, amount);
    target.shield -= toShield;
    const rest = amount - toShield;
    target.hp -= rest;
    target.lastHitBy = source;
    target.lastHitTime = this.time;
    target.hurtT = 0.15;
    if (target.channel && target.channel.kind === 'open') target.channel = null;

    if (source === this.player) {
      target.showBarT = 4;
      this.addDamageNumber(target, amount, rest > 0 ? 'hp' : 'shield');
    }
    if (target === this.player) {
      this.hurtFlash = 0.35;
      this.camera.shake = Math.min(14, this.camera.shake + 4);
    }
    if (target.hp <= 0) this.kill(target, source);
  }

  // Numero del danno che sale sopra il nemico. I pallini del fucile a pompa si sommano in un numero solo.
  addDamageNumber(target, amount, type) {
    const recent = this.floats.find((f) => f.target === target && f.age < 0.1 && f.type === type);
    if (recent) {
      recent.value += amount;
      recent.text = String(Math.round(recent.value));
      return;
    }
    this.floats.push({
      target, type, value: amount, text: String(Math.round(amount)),
      x: target.x + (Math.random() - 0.5) * 24, y: target.y - 30,
      vx: (Math.random() - 0.5) * 40, vy: -110,
      t: 0.9, max: 0.9, age: 0,
      color: type === 'shield' ? '#6fc8ff' : '#ffffff', size: 22,
    });
  }

  addFloat(x, y, text, color, size = 16) {
    this.floats.push({ x, y, text, color, size, vx: 0, vy: -60, t: 0.9, max: 0.9, age: 0 });
  }

  kill(target, source) {
    if (!target.alive) return;
    target.alive = false;
    target.hp = 0;
    target.channel = null;

    // Lascia cadere tutto lo zaino
    const drops = [];
    for (const s of target.slots) if (s) drops.push(s);
    for (const id in target.ammo) if (target.ammo[id] > 0) drops.push({ kind: 'ammo', id, count: target.ammo[id] });
    if (target.mats > 0) drops.push({ kind: 'mats', count: Math.min(target.mats, 150) });
    this.dropItems(target.x, target.y, drops, 30);

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const sp = 60 + Math.random() * 180;
      this.particles.push({
        x: target.x, y: target.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.6, max: 0.6, color: i % 2 ? target.skin.body : '#ffffff', size: 4,
      });
    }

    let text;
    const weaponName = source && source !== 'storm' && source.weapon ? source.weapon.name : 'piccone';
    if (source === 'storm') text = `${target.name} è stato eliminato dalla tempesta`;
    else if (source) {
      source.kills++;
      if (source === this.player) text = `Hai eliminato ${target.name} (${weaponName})`;
      else if (target === this.player) text = `${source.name} ti ha eliminato (${weaponName})`;
      else text = `${source.name} ha eliminato ${target.name}`;
    } else text = `${target.name} è stato eliminato`;
    this.killFeed.push({ text, t: 6, me: source === this.player || target === this.player });
    if (this.killFeed.length > 6) this.killFeed.shift();

    if (source === this.player) this.flashMessage(`ELIMINATO: ${target.name}`, '#ffd34d', 2);

    const alive = this.aliveCount;
    if (target === this.player) this.finish(false, alive + 1, source);
    else if (alive === 1 && this.player.alive) this.finish(true, 1, null);
  }

  finish(win, place, killer, immediate = false) {
    if (this.over) return;
    this.over = true;
    this.playerCtl.buildMode = false;
    this.result = {
      win,
      place,
      total: this.chars.length,
      kills: this.player.kills,
      killer: killer === 'storm' ? 'la tempesta' : killer ? killer.name : null,
      coins: win ? CONFIG.WIN_COINS : 0,
      mode: this.mode,
    };
    if (win) this.flashMessage('VITTORIA!', '#ffd34d', 5);
    if (immediate) this.onEnd(this.result);
    else setTimeout(() => this.onEnd(this.result), win ? 1800 : 1400);
  }

  abandon() {
    this.paused = false;
    this.finish(false, this.aliveCount, null, true);
  }

  // ================================================================ Strutture

  damageObstacle(ob, dmg, harvester, hx, hy) {
    if (!ob.maxHp || ob.dead) return;
    ob.hp -= dmg;
    ob.shake = 0.25;
    const color = ob.kind === 'rock' ? '#b9bec4' : ob.kind === 'hwall' ? '#e3d6bb' : '#b57d46';
    const px = hx !== undefined ? hx : ob.shape === 'circle' ? ob.x : ob.x + ob.w / 2;
    const py = hy !== undefined ? hy : ob.shape === 'circle' ? ob.y : ob.y + ob.h / 2;
    if (harvester) {
      const gain = { tree: 8, rock: 10, wall: 5, hwall: 6 }[ob.kind] || 0;
      const before = harvester.mats;
      harvester.mats = Math.min(CONFIG.MAX_MATS, harvester.mats + gain);
      if (harvester === this.player && harvester.mats > before) {
        this.addFloat(px, py - 20, '+' + (harvester.mats - before) + ' mat', '#f0c890', 15);
      }
      this.spark(px, py, color, 6);
    }
    if (ob.hp <= 0) {
      this.map.removeObstacle(ob);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU;
        const sp = 40 + Math.random() * 160;
        this.particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, color, size: 4 });
      }
    }
  }

  // Costruisce un muro (o un ponte sull'acqua). Con dryRun controlla solo se si può.
  tryBuild(c, wx, wy, dryRun = false) {
    const map = this.map;
    const T = map.T;
    const col = Math.floor(wx / T);
    const row = Math.floor(wy / T);
    if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) return false;
    const cx = (col + 0.5) * T;
    const cy = (row + 0.5) * T;
    if (Math.hypot(cx - c.x, cy - c.y) > CONFIG.BUILD_RANGE) return false;
    if (c.mats < CONFIG.WALL_COST || !this.mode.build) return false;

    const idx = row * map.cols + col;
    if (map.tile(col, row) === WATER) {
      if (map.bridges[idx]) return false;
      if (dryRun) return true;
      map.bridges[idx] = 1;
      this.afterBuild(c, cx, cy);
      return true;
    }

    const rect = { shape: 'rect', x: col * T + 3, y: row * T + 3, w: T - 6, h: T - 6 };
    for (const ob of map.obstacles.queryRect(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h)) {
      if (overlapsRect(ob, rect)) return false;
    }
    for (const o of this.chars) {
      if (o.alive && circleHits(rect, o.x, o.y, o.r - 2)) return false;
    }
    for (const d of map.doors.queryRect(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h)) {
      if (overlapsRect(d, rect)) return false;
    }
    for (const ch of map.chestGrid.queryRect(rect.x - 30, rect.y - 30, rect.x + rect.w + 30, rect.y + rect.h + 30)) {
      if (circleHits(rect, ch.x, ch.y, 10)) return false;
    }
    if (dryRun) return true;

    const wall = {
      kind: 'wall', shape: 'rect', x: col * T, y: row * T, w: T, h: T,
      hp: CONFIG.WALL_HP * 0.1, maxHp: CONFIG.WALL_HP, build: 0, owner: c.id, shake: 0,
    };
    map.addObstacle(wall);
    this.growingWalls.push(wall);
    this.afterBuild(c, cx, cy);
    return true;
  }

  // Le celle occupate da un pezzo. (tx, ty) = punto mirato, angle = direzione dello sguardo.
  pieceCells(c, piece, tx, ty, angle) {
    const T = this.map.T;
    if (piece === 'bunker') {
      const pc = Math.floor(c.x / T);
      const pr = Math.floor(c.y / T);
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.push([pc + dx, pr + dy]);
      return out;
    }
    const col = Math.floor(tx / T);
    const row = Math.floor(ty / T);
    if (piece === 'barrier') {
      // la barriera è perpendicolare a dove guardi
      return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
        ? [[col, row - 1], [col, row], [col, row + 1]]
        : [[col - 1, row], [col, row], [col + 1, row]];
    }
    return [[col, row]];
  }

  buildPiece(c, piece, tx, ty) {
    if (!this.mode.build) return 0;
    const T = this.map.T;
    let placed = 0;
    if (piece === 'bunker') {
      // centra il personaggio nella sua cella, così il bunker si chiude su tutti i lati
      c.x = (Math.floor(c.x / T) + 0.5) * T;
      c.y = (Math.floor(c.y / T) + 0.5) * T;
    }
    for (const [col, row] of this.pieceCells(c, piece, tx, ty, c.angle)) {
      if (c.mats < CONFIG.WALL_COST) break;
      // solo il muro singolo diventa ponte sull'acqua
      if (piece !== 'wall' && this.map.tile(col, row) === WATER) continue;
      if (this.tryBuild(c, (col + 0.5) * T, (row + 0.5) * T)) placed++;
    }
    if (placed) c.buildCd = CONFIG.BUILD_COOLDOWN * (piece === 'wall' ? 1 : 2.5);
    return placed;
  }

  // Modifica una tua struttura: muro → finestra (ci spari attraverso) → porta (ci passi) → muro
  tryEdit(c, x, y) {
    if (!this.mode.build) return false;
    const map = this.map;
    const T = map.T;
    const col = Math.floor(x / T);
    const row = Math.floor(y / T);
    const cx = (col + 0.5) * T;
    const cy = (row + 0.5) * T;
    if (Math.hypot(cx - c.x, cy - c.y) > CONFIG.BUILD_RANGE) return false;
    const same = (o) => o.kind === 'wall' && o.x === col * T && o.y === row * T;
    const wall = map.obstacles.query(cx, cy, 1).find(same) || map.doors.query(cx, cy, 1).find(same);
    if (!wall || wall.owner !== c.id || wall.build < 1) {
      if (c === this.player) this.flashMessage('Puoi modificare solo le tue strutture', '#ff8a6b', 1.2);
      return false;
    }
    if (wall.door) {
      const rect = { shape: 'rect', x: wall.x, y: wall.y, w: T, h: T };
      if (this.chars.some((o) => o.alive && circleHits(rect, o.x, o.y, o.r - 2))) return false;
      map.doors.remove(wall);
      wall.door = false;
      map.addObstacle(wall);
    } else if (wall.window) {
      wall.window = false;
      wall.door = true;
      map.obstacles.remove(wall);
      map.doors.insert(wall);
    } else {
      wall.window = true;
    }
    this.spark(cx, cy, '#cfe8ff', 6);
    return true;
  }

  afterBuild(c, cx, cy) {
    c.mats -= CONFIG.WALL_COST;
    c.buildCd = CONFIG.BUILD_COOLDOWN;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.35, max: 0.35, color: '#d8b48a', size: 4 });
    }
  }

  // ================================================================ Casse e oggetti

  handleInteract(c, held, pressed) {
    let chest = null;
    let bd = CONFIG.INTERACT_RANGE;
    for (const ch of this.map.chestGrid.query(c.x, c.y, CONFIG.INTERACT_RANGE)) {
      if (ch.opened) continue;
      const d = Math.hypot(ch.x - c.x, ch.y - c.y);
      if (d < bd) {
        bd = d;
        chest = ch;
      }
    }
    c.nearChest = chest;
    if (chest && held) {
      if (!c.channel || c.channel.kind !== 'open' || c.channel.chest !== chest) {
        c.channel = { kind: 'open', chest, t: 0, total: CONFIG.CHEST_OPEN_TIME };
      }
    } else if (c.channel && c.channel.kind === 'open') {
      c.channel = null;
    }
    if (pressed && !chest) {
      const p = this.nearestPickup(c, CONFIG.INTERACT_RANGE, true);
      if (p) this.givePickup(c, p);
    }
  }

  nearestPickup(c, range, manualOnly) {
    let best = null;
    let bd = range;
    for (const p of this.pickups) {
      if (p.dead) continue;
      if (manualOnly && p.data.kind !== 'weapon' && p.data.kind !== 'item') continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  openChest(chest, c) {
    if (chest.opened) return;
    chest.opened = true;
    this.dropItems(chest.x, chest.y, chestLoot(this.rng, chest.luck), 30);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const sp = 60 + Math.random() * 140;
      this.particles.push({ x: chest.x, y: chest.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, color: '#ffe27a', size: 3 });
    }
  }

  dropItems(x, y, list, spread) {
    if (!this.mode.build) list = list.filter((d) => d.kind !== 'mats');
    list.forEach((data, i) => {
      const a = (i / Math.max(1, list.length)) * TAU + Math.random() * 0.8;
      const sp = spread * (3 + Math.random() * 3);
      this.pickups.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, data, dead: false, seed: Math.random() * 10 });
    });
  }

  // Raccoglie un oggetto. Restituisce true se l'ha preso.
  givePickup(c, p) {
    const d = p.data;
    if (d.kind === 'ammo') {
      c.ammo[d.id] += d.count;
      p.dead = true;
      if (c === this.player) this.addFloat(c.x, c.y - 34, `+${d.count} ${AMMO[d.id].short}`, AMMO[d.id].color, 14);
      return true;
    }
    if (d.kind === 'mats') {
      const take = Math.min(CONFIG.MAX_MATS - c.mats, d.count);
      if (take <= 0) return false;
      c.mats += take;
      d.count -= take;
      if (d.count <= 0) p.dead = true;
      if (c === this.player) this.addFloat(c.x, c.y - 34, `+${take} mat`, '#f0c890', 14);
      return true;
    }

    const empty = c.slots.findIndex((s) => !s);
    if (d.kind === 'item') {
      const def = ITEMS[d.id];
      for (const s of c.slots) {
        if (s && s.kind === 'item' && s.id === d.id && s.count < def.stack) {
          const add = Math.min(def.stack - s.count, d.count);
          s.count += add;
          d.count -= add;
        }
      }
      if (d.count > 0 && empty >= 0) {
        c.slots[empty] = { kind: 'item', id: d.id, count: d.count };
        d.count = 0;
      }
      if (d.count > 0) return this.swapIntoActive(c, p);
      p.dead = true;
      if (c === this.player) this.flashMessage('+ ' + def.name, def.color, 1.5);
      return true;
    }

    // Arma
    if (empty >= 0) {
      c.slots[empty] = d;
      p.dead = true;
      if (c.active === -1 || !c.current) c.select(empty);
      if (c === this.player) this.flashMessage('+ ' + itemLabel(d), RARITIES[d.rarity].color, 1.5);
      return true;
    }
    if (!c.isPlayer) {
      // il bot scambia l'arma peggiore se quella nuova è migliore
      let worst = -1;
      let wp = Infinity;
      c.slots.forEach((s, i) => {
        if (s.kind === 'weapon' && weaponPower(s) < wp) {
          wp = weaponPower(s);
          worst = i;
        }
      });
      if (worst < 0 || weaponPower(d) <= wp * 1.1) return false;
      this.dropItems(c.x, c.y, [c.slots[worst]], 12);
      c.slots[worst] = d;
      p.dead = true;
      if (c.active === worst) c.reloadT = 0;
      return true;
    }
    return this.swapIntoActive(c, p);
  }

  // Inventario pieno: il giocatore scambia l'oggetto in mano con quello a terra
  swapIntoActive(c, p) {
    if (!c.isPlayer) return false;
    if (c.active < 0) {
      this.flashMessage('Inventario pieno: scegli lo slot (1-5) da scambiare', '#ff8a6b', 2);
      return false;
    }
    const old = c.slots[c.active];
    c.slots[c.active] = p.data.kind === 'item' ? { kind: 'item', id: p.data.id, count: p.data.count } : p.data;
    p.dead = true;
    c.reloadT = 0;
    c.channel = null;
    this.dropItems(c.x, c.y, [old], 12);
    this.flashMessage('+ ' + itemLabel(c.slots[c.active]), pickupColor(c.slots[c.active]), 1.5);
    return true;
  }

  // ================================================================ Effetti

  spark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 50 + Math.random() * 150;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25, max: 0.25, color, size: 2.5 });
    }
  }

  flashMessage(text, color = '#ffffff', t = 2) {
    this.message = { text, color, t, max: t };
  }

  // ================================================================ Disegno

  render(dt) {
    const ctx = this.ctx;
    const cam = this.camera;
    for (const f of this.floats) f.age = (f.age || 0) + dt;

    ctx.fillStyle = '#0f1a12';
    ctx.fillRect(0, 0, cam.width, cam.height);
    const view = cam.viewRect(140);
    const visible = this.map.visibleObstacles(view);
    const inView = (o, m = 60) => o.x > view.left - m && o.x < view.right + m && o.y > view.top - m && o.y < view.bottom + m;

    ctx.save();
    cam.apply(ctx);

    this.map.drawGround(ctx, view);
    this.map.drawWater(ctx, view, this.time);
    this.map.drawShadows(ctx, visible);
    this.map.drawStructures(ctx, visible, this.time);
    this.map.drawDoors(ctx, view);

    for (const ch of this.map.chestGrid.queryRect(view.left, view.top, view.right, view.bottom)) drawChest(ctx, ch, this.time);
    for (const p of this.pickups) if (inView(p)) drawPickup(ctx, p, this.time);

    for (const c of this.chars) {
      if (!c.alive || !inView(c)) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      drawCharacter(ctx, c.skin, {
        angle: c.angle,
        walk: c.walk,
        item: c.current,
        swing: c.swingAnim > 0 ? c.swingAnim / 0.25 : 0,
        t: this.time,
        hurt: c.hurtT > 0 ? c.hurtT / 0.15 : 0,
      });
      ctx.restore();
    }

    for (const b of this.bullets) b.draw(ctx);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.map.drawOverlay(ctx, view, visible, this.player, dt, this.time);

    // Barre vita dei nemici colpiti di recente (sopra tetti e alberi)
    for (const c of this.chars) {
      if (!c.alive || c === this.player || c.showBarT <= 0 || !inView(c)) continue;
      ctx.globalAlpha = Math.min(1, c.showBarT);
      const w = 44;
      const x = c.x - w / 2;
      let y = c.y - c.r - 20;
      if (c.shield > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 1, y - 7, w + 2, 6);
        ctx.fillStyle = '#3fa9ff';
        ctx.fillRect(x, y - 6, (w * c.shield) / 100, 4);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 1, y - 1, w + 2, 7);
      ctx.fillStyle = '#5fdc5f';
      ctx.fillRect(x, y, (w * c.hp) / 100, 5);
      ctx.globalAlpha = 1;
    }

    this.storm.draw(ctx, view, this.time);

    // Anteprima del pezzo in modalità costruzione
    const pc = this.playerCtl;
    if (pc.buildMode && pc.ghost && this.player.alive) {
      const T = this.map.T;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const g of pc.ghost.cells) {
        ctx.fillStyle = g.valid ? 'rgba(90,170,255,0.35)' : 'rgba(255,70,70,0.25)';
        ctx.strokeStyle = g.valid ? '#7cc4ff' : '#ff6b6b';
        ctx.fillRect(g.col * T, g.row * T, T, T);
        ctx.strokeRect(g.col * T + 1.5, g.row * T + 1.5, T - 3, T - 3);
      }
      ctx.setLineDash([]);
      const first = pc.ghost.cells[pc.ghost.piece === 'bunker' ? 1 : Math.floor(pc.ghost.cells.length / 2)];
      if (first) {
        const water = pc.ghost.piece === 'wall' && this.map.tile(first.col, first.row) === WATER;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(water ? 'PONTE' : PIECES[pc.ghost.piece].name.toUpperCase(), (first.col + 0.5) * T, (first.row + 0.5) * T + 4);
      }
    }

    // Sul telefono: linea di mira
    if (this.input.touch.enabled && this.player.alive && !pc.buildMode && this.player.weapon) {
      const p = this.player;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40);
      ctx.lineTo(p.x + Math.cos(p.angle) * 260, p.y + Math.sin(p.angle) * 260);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    this.drawFloats(ctx);
    this.hud.draw(ctx);
  }

  drawFloats(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      const s = this.camera.worldToScreen(f.x, f.y);
      const k = f.t / f.max;
      const pop = f.age < 0.1 ? 1 + (0.1 - f.age) * 4 : 1;
      const size = Math.round(f.size * pop * (f.value > 60 ? 1.25 : 1));
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `900 ${size}px system-ui, "Segoe UI", sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(f.text, s.x, s.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }
}
