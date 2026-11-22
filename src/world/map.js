import { CONFIG } from '../config.js';
import { mulberry32, makeNoise, SpatialGrid, boundsOf, lerp, shuffle, TAU } from '../utils.js';
import { makeOakSprite, makePineSprite, makeRockSprite, makeBushSprite, drawBuiltWall } from '../render/art.js';
import { circleHits } from '../systems/physics.js';

export const GRASS = 0;
export const DIRT = 1;
export const SAND = 2;
export const WATER = 3;
const OUTSIDE = 4;

const POI_NAMES = [
  'Borgo Quieto', 'Pineta Alta', 'Fattoria Vecchia', 'Porto Sabbioso', 'Rocca Grigia',
  'Valle dei Fiori', 'Mulino Rosso', 'Campo Base', 'Villa Ombrosa', 'Colle Ventoso',
  'Baia Tranquilla', 'Forte Antico', 'Stazione Nord', 'Cava di Pietra', 'Boschetto Verde',
  'Piazza Grande', 'Faro Spento', 'Granaio Dorato', 'Vigneto Alto', 'Palude Nebbiosa',
  'Castelletto', 'Ponte Rotto', 'Rifugio Alpino', 'Mercato Vecchio', 'Torre di Guardia',
  'Lago Specchio', 'Orto Felice', 'Segheria', 'Capanne Blu', 'Fonte Chiara',
];
const ROOF_COLORS = ['#9c3d2e', '#4f5d75', '#6b4f3a', '#7a6c2f', '#2f6b5e', '#7b3f6b'];
const FLOOR_COLORS = ['#a47b52', '#8f6a45', '#b08c62', '#9a7a5a'];
const RUG_COLORS = ['#8e3b46', '#3b5b8e', '#5b8e3b', '#8e6b3b'];
const FLOWER_COLORS = ['#ffffff', '#ffd84d', '#ff8fb1', '#b48cff', '#ff6b6b'];

export class GameMap {
  constructor(seed) {
    const T = (this.T = CONFIG.TILE);
    this.cols = CONFIG.MAP_W;
    this.rows = CONFIG.MAP_H;
    this.width = this.cols * T;
    this.height = this.rows * T;
    this.rng = mulberry32(seed);
    // quanto è grande la mappa rispetto a quella base 130x130: le quantità di oggetti crescono di conseguenza
    this.k = (this.cols * this.rows) / (130 * 130);
    this.nA = makeNoise(seed + 11);
    this.nB = makeNoise(seed + 23);
    this.nC = makeNoise(seed + 37);

    this.terrain = new Uint8Array(this.cols * this.rows);
    this.bridges = new Uint8Array(this.cols * this.rows);
    this.obstacles = new SpatialGrid(128); // muri, rocce, alberi: bloccano movimento e proiettili
    this.bushGrid = new SpatialGrid(128);  // cespugli: nascondono ma non bloccano
    this.doors = new SpatialGrid(128);     // muri modificati in porta: non bloccano niente
    this.chestGrid = new SpatialGrid(256); // casse: per trovare in fretta quelle vicine
    this.reserved = new SpatialGrid(128);  // spazio già occupato durante la generazione

    this.houses = [];
    this.chests = [];
    this.bushes = [];
    this.islands = [];
    this.pois = [];
    this.lootSpots = [];
    this.chunks = new Map();
    this.chunkBudget = 0;

    this.makeSprites();
    this.genLakes();
    this.genSand();
    this.genPois();
    this.genPaths();
    this.genHouses();
    this.genRocks(Math.round(260 * this.k));
    this.genTrees(Math.round(700 * this.k));
    this.genBushes(Math.round(380 * this.k));
    this.genChests();
    this.genLootSpots(Math.round(170 * this.k));
    this.minimap = this.buildMinimap();
  }

  // ================================================================ Generazione

  makeSprites() {
    const rng = this.rng;
    this.oakSprites = [];
    this.pineSprites = [];
    this.bushSprites = [];
    for (let i = 0; i < 5; i++) this.oakSprites.push(makeOakSprite(rng, 64));
    for (let i = 0; i < 3; i++) this.pineSprites.push(makePineSprite(rng, 56));
    for (let i = 0; i < 4; i++) this.bushSprites.push(makeBushSprite(rng, 34));
    this.rockSprites = [];
    for (let i = 0; i < 12; i++) this.rockSprites.push(makeRockSprite(rng, 30));
  }

  genLakes() {
    const rng = this.rng;
    const T = this.T;
    for (let i = 0; i < Math.round(9 * this.k); i++) {
      const R = 4.5 + rng() * 6.5;
      const cx = R + 5 + rng() * (this.cols - 2 * R - 10);
      const cy = R + 5 + rng() * (this.rows - 2 * R - 10);
      const blobs = [{ x: cx, y: cy, r: R }];
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const a = rng() * TAU;
        const d = R * (0.45 + rng() * 0.45);
        blobs.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: R * (0.45 + rng() * 0.35) });
      }
      // I laghi grandi hanno spesso un'isola con una cassa rara al centro
      const island = R >= 7.5 && rng() < 0.8 ? { x: cx, y: cy, r: 2.7 } : null;
      const ext = R * 2;
      for (let r = Math.floor(cy - ext); r <= Math.ceil(cy + ext); r++) {
        for (let c = Math.floor(cx - ext); c <= Math.ceil(cx + ext); c++) {
          if (c < 1 || r < 1 || c >= this.cols - 1 || r >= this.rows - 1) continue;
          const px = c + 0.5;
          const py = r + 0.5;
          let inside = blobs.some((b) => (px - b.x) ** 2 + (py - b.y) ** 2 < b.r * b.r);
          if (island && (px - island.x) ** 2 + (py - island.y) ** 2 < island.r ** 2) inside = false;
          if (inside) this.terrain[r * this.cols + c] = WATER;
        }
      }
      if (island) this.islands.push({ x: cx * T, y: cy * T, c: cx, r: cy, rad: island.r });
    }
    // Le isole si "scavano" alla fine, così un altro lago non può sommergerle
    for (const isl of this.islands) {
      for (let r = Math.floor(isl.r - isl.rad); r <= Math.ceil(isl.r + isl.rad); r++) {
        for (let c = Math.floor(isl.c - isl.rad); c <= Math.ceil(isl.c + isl.rad); c++) {
          if ((c + 0.5 - isl.c) ** 2 + (r + 0.5 - isl.r) ** 2 < isl.rad ** 2) this.setTerrainIf(c, r, WATER, GRASS);
        }
      }
      this.reserved.insert({ shape: 'circle', x: isl.x, y: isl.y, r: 70 });
    }
  }

  genSand() {
    const copy = this.terrain.slice();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (copy[r * this.cols + c] === WATER) continue;
        let near = false;
        const reach = this.nA(c * 0.3, r * 0.3) > 0.6 ? 2 : 1;
        for (let dy = -reach; dy <= reach && !near; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const cc = c + dx;
            const rr = r + dy;
            if (cc >= 0 && rr >= 0 && cc < this.cols && rr < this.rows && copy[rr * this.cols + cc] === WATER) {
              near = true;
              break;
            }
          }
        }
        if (near) this.terrain[r * this.cols + c] = SAND;
      }
    }
  }

  genPois() {
    const rng = this.rng;
    for (const name of shuffle(rng, POI_NAMES.slice())) {
      for (let tries = 0; tries < 300; tries++) {
        const c = Math.floor(12 + rng() * (this.cols - 24));
        const r = Math.floor(12 + rng() * (this.rows - 24));
        if (this.pois.some((p) => Math.hypot(p.c - c, p.r - r) < 26)) continue;
        if (!this.areaIsLand(c - 8, r - 8, c + 8, r + 8)) continue;
        this.pois.push({ name, c, r, x: (c + 0.5) * this.T, y: (r + 0.5) * this.T });
        // piazza di terra battuta
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx * dx + dy * dy <= 9) this.setTerrainIf(c + dx, r + dy, GRASS, DIRT);
          }
        }
        break;
      }
    }
  }

  genPaths() {
    if (this.pois.length < 2) return;
    const mx = this.cols / 2;
    const my = this.rows / 2;
    const sorted = this.pois.slice().sort((a, b) => Math.atan2(a.r - my, a.c - mx) - Math.atan2(b.r - my, b.c - mx));
    for (let i = 0; i < sorted.length; i++) this.walkPath(sorted[i], sorted[(i + 1) % sorted.length]);
    if (sorted.length > 4) this.walkPath(sorted[0], sorted[Math.floor(sorted.length / 2)]);
  }

  walkPath(a, b) {
    let x = a.c;
    let y = a.r;
    for (let step = 0; step < 600; step++) {
      const dx = b.c - x;
      const dy = b.r - y;
      if (Math.hypot(dx, dy) < 1.5) break;
      const ang = Math.atan2(dy, dx) + (this.nA(x * 0.12, y * 0.12) - 0.5) * 1.6;
      x += Math.cos(ang) * 0.8;
      y += Math.sin(ang) * 0.8;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (Math.abs(ox) + Math.abs(oy) <= 1) this.setTerrainIf(Math.floor(x) + ox, Math.floor(y) + oy, GRASS, DIRT);
        }
      }
    }
  }

  genHouses() {
    const rng = this.rng;
    for (const poi of this.pois) {
      const want = 3 + Math.floor(rng() * 3);
      let placed = 0;
      for (let tries = 0; tries < 120 && placed < want; tries++) {
        const wT = 5 + Math.floor(rng() * 4);
        const hT = 4 + Math.floor(rng() * 3);
        const c = Math.floor(poi.c + (rng() - 0.5) * 22 - wT / 2);
        const r = Math.floor(poi.r + (rng() - 0.5) * 22 - hT / 2);
        if (this.tryHouse(c, r, wT, hT)) placed++;
      }
    }
    let lone = 0;
    for (let tries = 0; tries < 600 * this.k && lone < 16 * this.k; tries++) {
      const wT = 4 + Math.floor(rng() * 3);
      const hT = 4 + Math.floor(rng() * 2);
      const c = Math.floor(3 + rng() * (this.cols - wT - 6));
      const r = Math.floor(3 + rng() * (this.rows - hT - 6));
      if (this.tryHouse(c, r, wT, hT)) lone++;
    }
  }

  tryHouse(c, r, wT, hT) {
    if (c < 2 || r < 2 || c + wT > this.cols - 2 || r + hT > this.rows - 2) return false;
    if (!this.areaIsLand(c - 1, r - 1, c + wT, r + hT)) return false;
    const T = this.T;
    const x = c * T;
    const y = r * T;
    const w = wT * T;
    const h = hT * T;
    if (!this.isFree(x - 56, y - 56, x + w + 56, y + h + 56)) return false;
    this.createHouse(x, y, w, h);
    return true;
  }

  createHouse(x, y, w, h) {
    const rng = this.rng;
    const th = 14;
    const door = 84;
    const house = {
      shape: 'rect', x, y, w, h,
      roof: ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)],
      floor: FLOOR_COLORS[Math.floor(rng() * FLOOR_COLORS.length)],
      rug: rng() < 0.7 ? RUG_COLORS[Math.floor(rng() * RUG_COLORS.length)] : null,
      fade: 1,
      walls: [],
    };
    const sides = ['top', 'bottom', 'left', 'right'];
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const first = sides[Math.floor(rng() * 4)];
    const doors = new Set([first]);
    if (rng() < 0.6) doors.add(opposite[first]);

    // I muri sono divisi in pezzi da max 64 px: si possono distruggere un pezzo alla volta
    const addRun = (sx, sy, len, horizontal) => {
      let pos = 0;
      while (pos < len - 0.5) {
        const piece = Math.min(64, len - pos);
        const ob = {
          kind: 'hwall', shape: 'rect',
          x: horizontal ? sx + pos : sx,
          y: horizontal ? sy : sy + pos,
          w: horizontal ? piece : th,
          h: horizontal ? th : piece,
          hp: CONFIG.HOUSE_WALL_HP, maxHp: CONFIG.HOUSE_WALL_HP, house,
        };
        house.walls.push(ob);
        this.obstacles.insert(ob);
        pos += piece;
      }
    };
    const side = (name, sx, sy, len, horizontal) => {
      if (!doors.has(name)) return addRun(sx, sy, len, horizontal);
      const mid = len / 2 + (rng() - 0.5) * Math.max(0, len - door - 80);
      addRun(sx, sy, mid - door / 2, horizontal);
      const after = mid + door / 2;
      if (horizontal) addRun(sx + after, sy, len - after, true);
      else addRun(sx, sy + after, len - after, false);
    };
    side('top', x, y, w, true);
    side('bottom', x, y + h - th, w, true);
    side('left', x, y + th, h - th * 2, false);
    side('right', x + w - th, y + th, h - th * 2, false);

    this.houses.push(house);
    this.reserved.insert({ shape: 'rect', x: x - 24, y: y - 24, w: w + 48, h: h + 48 });

    const n = 1 + (rng() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      this.addChest(x + 44 + rng() * (w - 88), y + 44 + rng() * (h - 88), 0);
    }
  }

  genRocks(count) {
    const rng = this.rng;
    let placed = 0;
    for (let tries = 0; tries < count * 8 && placed < count; tries++) {
      const r = 16 + rng() * 24;
      const x = 60 + rng() * (this.width - 120);
      const y = 60 + rng() * (this.height - 120);
      const code = this.codeAt(x, y);
      if (code === WATER || code === DIRT) continue;
      if (!this.isFree(x - r - 10, y - r - 10, x + r + 10, y + r + 10)) continue;
      const hp = CONFIG.ROCK_HP * (r / 28);
      const rock = { kind: 'rock', shape: 'circle', x, y, r, hp, maxHp: hp, shake: 0, sprite: this.rockSprites[Math.floor(rng() * this.rockSprites.length)], scale: r / 30 };
      this.obstacles.insert(rock);
      this.reserved.insert({ shape: 'circle', x, y, r: r + 8 });
      placed++;
    }
  }

  genTrees(count) {
    const rng = this.rng;
    let placed = 0;
    for (let tries = 0; tries < count * 10 && placed < count; tries++) {
      const x = 60 + rng() * (this.width - 120);
      const y = 60 + rng() * (this.height - 120);
      // più alberi dove il "rumore foresta" è alto
      const forest = this.nB(x / 900, y / 900);
      if (forest < 0.45 && rng() > 0.25) continue;
      if (this.codeAt(x, y) !== GRASS) continue;
      if (!this.isFree(x - 30, y - 30, x + 30, y + 30)) continue;
      const pine = forest > 0.6 ? rng() < 0.7 : rng() < 0.25;
      const scale = 0.8 + rng() * 0.4;
      const sprites = pine ? this.pineSprites : this.oakSprites;
      const tree = {
        kind: 'tree', shape: 'circle', x, y, r: 13,
        hp: CONFIG.TREE_HP, maxHp: CONFIG.TREE_HP,
        pine, scale, canopyR: (pine ? 56 : 64) * scale,
        sprite: sprites[Math.floor(rng() * sprites.length)],
        fade: 1, shake: 0,
      };
      this.obstacles.insert(tree);
      this.reserved.insert({ shape: 'circle', x, y, r: 30 });
      placed++;
    }
  }

  genBushes(count) {
    const rng = this.rng;
    let placed = 0;
    for (let tries = 0; tries < count * 8 && placed < count; tries++) {
      const x = 60 + rng() * (this.width - 120);
      const y = 60 + rng() * (this.height - 120);
      const code = this.codeAt(x, y);
      if (code !== GRASS && code !== SAND) continue;
      const r = 28 + rng() * 10;
      if (!this.isFree(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6)) continue;
      const bush = {
        shape: 'circle', x, y, r, fade: 1,
        sprite: this.bushSprites[Math.floor(rng() * this.bushSprites.length)],
      };
      this.bushes.push(bush);
      this.bushGrid.insert(bush);
      this.reserved.insert({ shape: 'circle', x, y, r: r * 0.6 });
      placed++;
    }
  }

  genChests() {
    const rng = this.rng;
    for (const isl of this.islands) this.addChest(isl.x, isl.y, 2, true);
    for (const poi of this.pois) {
      let n = 0;
      for (let tries = 0; tries < 60 && n < 2; tries++) {
        const x = poi.x + (rng() - 0.5) * 14 * this.T;
        const y = poi.y + (rng() - 0.5) * 14 * this.T;
        if (this.tryChest(x, y)) n++;
      }
    }
    let n = 0;
    for (let tries = 0; tries < 800 * this.k && n < 40 * this.k; tries++) {
      if (this.tryChest(100 + rng() * (this.width - 200), 100 + rng() * (this.height - 200))) n++;
    }
  }

  tryChest(x, y) {
    const code = this.codeAt(x, y);
    if (code === WATER || code === OUTSIDE) return false;
    if (!this.isFree(x - 26, y - 26, x + 26, y + 26)) return false;
    this.addChest(x, y, 0);
    return true;
  }

  addChest(x, y, luck, force = false) {
    const chest = { shape: 'circle', x, y, r: 20, opened: false, luck, island: force };
    this.chests.push(chest);
    this.chestGrid.insert(chest);
    this.reserved.insert({ shape: 'circle', x, y, r: 30 });
  }

  genLootSpots(count) {
    const rng = this.rng;
    for (let tries = 0; tries < count * 10 && this.lootSpots.length < count; tries++) {
      const x = 100 + rng() * (this.width - 200);
      const y = 100 + rng() * (this.height - 200);
      const code = this.codeAt(x, y);
      if (code === WATER || code === OUTSIDE) continue;
      if (!this.isFree(x - 20, y - 20, x + 20, y + 20)) continue;
      this.lootSpots.push({ x, y });
      this.reserved.insert({ shape: 'circle', x, y, r: 24 });
    }
  }

  // ================================================================ Utilità

  idx(c, r) {
    return r * this.cols + c;
  }

  tile(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return OUTSIDE;
    return this.terrain[r * this.cols + c];
  }

  codeAt(x, y) {
    return this.tile(Math.floor(x / this.T), Math.floor(y / this.T));
  }

  setTerrainIf(c, r, from, to) {
    if (this.tile(c, r) === from) this.terrain[r * this.cols + c] = to;
  }

  areaIsLand(c0, r0, c1, r1) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.tile(c, r);
        if (t === WATER || t === OUTSIDE) return false;
      }
    }
    return true;
  }

  isFree(l, t, r, b) {
    for (const o of this.reserved.queryRect(l, t, r, b)) {
      const ob = boundsOf(o);
      if (ob.l < r && ob.r > l && ob.t < b && ob.b > t) return false;
    }
    return true;
  }

  isWaterTile(c, r) {
    return this.tile(c, r) === WATER && !this.bridges[r * this.cols + c];
  }

  isWaterAt(x, y) {
    return this.isWaterTile(Math.floor(x / this.T), Math.floor(y / this.T));
  }

  queryObstacles(x, y, r) {
    return this.obstacles.query(x, y, r);
  }

  addObstacle(ob) {
    this.obstacles.insert(ob);
  }

  removeObstacle(ob) {
    ob.dead = true;
    this.obstacles.remove(ob);
  }

  inBush(x, y) {
    for (const b of this.bushGrid.query(x, y, 1)) {
      if (Math.hypot(x - b.x, y - b.y) < b.r * 0.85) return b;
    }
    return null;
  }

  // Restituisce il primo ostacolo tra due punti (o null se la linea è libera)
  lineBlocked(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 18);
    for (let i = 1; i < n; i++) {
      const px = lerp(x1, x2, i / n);
      const py = lerp(y1, y2, i / n);
      for (const ob of this.obstacles.query(px, py, 1)) {
        if (!ob.window && circleHits(ob, px, py, 1)) return ob;
      }
    }
    return null;
  }

  // Zero Costruzioni: un ponte già pronto dalla riva più vicina a ogni isola
  buildIslandBridges() {
    for (const isl of this.islands) {
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const tiles = [];
        let c = Math.floor(isl.c);
        let r = Math.floor(isl.r);
        let seen = false;
        for (let i = 0; i < 40; i++) {
          c += dx;
          r += dy;
          const t = this.tile(c, r);
          if (t === WATER) {
            seen = true;
            tiles.push([c, r]);
          } else if (seen) break;
          if (t === OUTSIDE) break;
        }
        if (seen && (!best || tiles.length < best.length)) best = tiles;
      }
      if (best) for (const [c, r] of best) this.bridges[r * this.cols + c] = 1;
    }
  }

  drawDoors(ctx, view) {
    for (const d of this.doors.queryRect(view.left, view.top, view.right, view.bottom)) {
      ctx.strokeStyle = '#7a4f28';
      ctx.lineWidth = 6;
      ctx.strokeRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
      ctx.fillStyle = 'rgba(181,125,70,0.25)';
      ctx.fillRect(d.x + 7, d.y + 7, d.w - 14, d.h - 14);
      ctx.fillStyle = '#5c3a1e';
      for (const [x, y] of [[d.x, d.y], [d.x + d.w - 10, d.y], [d.x, d.y + d.h - 10], [d.x + d.w - 10, d.y + d.h - 10]]) ctx.fillRect(x, y, 10, 10);
    }
  }

  houseAt(x, y) {
    for (const h of this.houses) {
      if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return h;
    }
    return null;
  }

  // ================================================================ Minimappa

  buildMinimap() {
    const S = 2;
    const c = document.createElement('canvas');
    c.width = this.cols * S;
    c.height = this.rows * S;
    const ctx = c.getContext('2d');
    const colors = ['#4f8a3f', '#a58456', '#d9c58f', '#3a86c4'];
    for (let r = 0; r < this.rows; r++) {
      for (let col = 0; col < this.cols; col++) {
        ctx.fillStyle = colors[this.terrain[r * this.cols + col]];
        ctx.fillRect(col * S, r * S, S, S);
      }
    }
    const k = S / this.T;
    ctx.fillStyle = '#2d5a26';
    for (const ob of this.obstacles.queryRect(0, 0, this.width, this.height)) {
      if (ob.kind === 'tree') ctx.fillRect(ob.x * k - 1, ob.y * k - 1, 2.5, 2.5);
    }
    for (const h of this.houses) {
      ctx.fillStyle = h.roof;
      ctx.fillRect(h.x * k, h.y * k, h.w * k, h.h * k);
    }
    return c;
  }

  // ================================================================ Disegno

  // Restituisce il blocco di terreno dalla cache, o lo disegna se c'è ancora "budget" in questo frame
  getChunk(cx, cy) {
    const key = cx * 1000 + cy;
    let c = this.chunks.get(key);
    if (c) {
      this.chunks.delete(key);
      this.chunks.set(key, c);
      return c;
    }
    if (this.chunkBudget <= 0) return null;
    this.chunkBudget--;
    c = this.renderChunk(cx, cy);
    this.chunks.set(key, c);
    if (this.chunks.size > 90) this.chunks.delete(this.chunks.keys().next().value);
    return c;
  }

  // Disegna un blocco di terreno 512x512 una volta sola (poi resta in cache)
  renderChunk(cx, cy) {
    const S = CONFIG.CHUNK;
    const RES = 4;
    const n = S / RES;
    if (!this.scratch) {
      this.scratch = document.createElement('canvas');
      this.scratch.width = this.scratch.height = n;
      this.sctx = this.scratch.getContext('2d');
    }
    const img = this.sctx.createImageData(n, n);
    const d = img.data;
    const ox0 = cx * S;
    const oy0 = cy * S;
    const T = this.T;
    // Valore "morbido" (0..1) di un tipo di terreno: interpolazione tra i centri dei tile.
    // Con la soglia 0.5 i bordi diventano curve invece che scalini.
    const field = (x, y, test) => {
      const fx = x / T - 0.5;
      const fy = y / T - 0.5;
      const c0 = Math.floor(fx);
      const r0 = Math.floor(fy);
      const tx = fx - c0;
      const ty = fy - r0;
      return lerp(
        lerp(test(this.tile(c0, r0)), test(this.tile(c0 + 1, r0)), tx),
        lerp(test(this.tile(c0, r0 + 1)), test(this.tile(c0 + 1, r0 + 1)), tx),
        ty
      );
    };
    const isWater = (t) => (t === WATER ? 1 : 0);
    const isShore = (t) => (t === WATER || t === SAND ? 1 : 0);
    const isDirt = (t) => (t === DIRT ? 1 : 0);
    const isOut = (t) => (t === OUTSIDE ? 1 : 0);

    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const wx = ox0 + px * RES + 2;
        const wy = oy0 + py * RES + 2;
        // leggera ondulazione dei bordi
        const sx = wx + (this.nA(wx / 90, wy / 90) - 0.5) * 30 + (this.nB(wx / 23 + 9, wy / 23) - 0.5) * 10;
        const sy = wy + (this.nB(wx / 90, wy / 90) - 0.5) * 30 + (this.nA(wx / 23, wy / 23 + 9) - 0.5) * 10;
        let code = GRASS;
        if (field(wx, wy, isOut) > 0.5) code = OUTSIDE;
        else if (field(sx, sy, isWater) > 0.5) code = WATER;
        else if (field(sx, sy, isShore) > 0.5) code = SAND;
        else if (field(sx, sy, isDirt) > 0.5) code = DIRT;
        const v = this.nC(wx / 320, wy / 320) * 0.65 + this.nA(wx / 70 + 50, wy / 70 + 50) * 0.35;
        const f = (this.nB(wx / 9, wy / 9) - 0.5) * 16;
        let r;
        let g;
        let b;
        if (code === GRASS) {
          r = lerp(48, 104, v); g = lerp(108, 166, v); b = lerp(42, 66, v);
        } else if (code === DIRT) {
          r = lerp(138, 180, v); g = lerp(102, 140, v); b = lerp(62, 92, v);
        } else if (code === SAND) {
          r = lerp(206, 236, v); g = lerp(186, 218, v); b = lerp(130, 166, v);
        } else if (code === WATER) {
          // più chiara vicino a riva, più scura al largo
          const depth =
            (field(sx + 70, sy, isWater) + field(sx - 70, sy, isWater) +
              field(sx, sy + 70, isWater) + field(sx, sy - 70, isWater)) / 4;
          const k = Math.min(1, Math.max(0, (1 - depth) * 1.6));
          r = lerp(28, 70, k) + v * 10; g = lerp(88, 168, k) + v * 14; b = lerp(156, 205, k) + v * 10;
        } else {
          r = 22; g = 36; b = 28;
        }
        const i = (py * n + px) * 4;
        d[i] = r + f;
        d[i + 1] = g + f;
        d[i + 2] = b + f * 0.6;
        d[i + 3] = 255;
      }
    }
    this.sctx.putImageData(img, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.drawImage(this.scratch, 0, 0, n, n, 0, 0, S, S);

    const rng = mulberry32(cx * 7919 + cy * 104729 + 1);
    c.save();
    c.translate(-ox0, -oy0);

    // Ciuffi d'erba
    const dark = new Path2D();
    const light = new Path2D();
    for (let i = 0; i < 1100; i++) {
      const x = ox0 + rng() * S;
      const y = oy0 + rng() * S;
      if (this.codeAt(x, y) !== GRASS || this.codeAt(x + 20, y + 20) !== GRASS || this.codeAt(x - 20, y - 20) !== GRASS) continue;
      const path = rng() < 0.55 ? dark : light;
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.5 + (rng() - 0.5) * 0.3;
        const len = 4 + rng() * 5;
        const bx = x + k * 2 - 2;
        path.moveTo(bx, y);
        path.lineTo(bx + Math.cos(a) * len, y + Math.sin(a) * len);
      }
    }
    c.lineWidth = 1.4;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(28,72,28,0.55)';
    c.stroke(dark);
    c.strokeStyle = 'rgba(160,210,100,0.45)';
    c.stroke(light);

    // Fiori
    for (let i = 0; i < 40; i++) {
      const x = ox0 + rng() * S;
      const y = oy0 + rng() * S;
      if (this.codeAt(x, y) !== GRASS) continue;
      c.fillStyle = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        c.beginPath();
        c.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.1, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#ffcf33';
      c.beginPath();
      c.arc(x, y, 1.6, 0, TAU);
      c.fill();
    }

    // Sassolini sulla terra e puntini sulla sabbia
    for (let i = 0; i < 160; i++) {
      const x = ox0 + rng() * S;
      const y = oy0 + rng() * S;
      const code = this.codeAt(x, y);
      if (code === DIRT) {
        c.fillStyle = rng() < 0.5 ? 'rgba(90,75,60,0.5)' : 'rgba(210,190,160,0.5)';
        c.beginPath();
        c.ellipse(x, y, 1.5 + rng() * 2, 1.2 + rng() * 1.5, rng() * 3, 0, TAU);
        c.fill();
      } else if (code === SAND) {
        c.fillStyle = 'rgba(160,140,100,0.35)';
        c.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Pavimenti delle case
    for (const h of this.houses) {
      if (h.x > ox0 + S || h.x + h.w < ox0 || h.y > oy0 + S || h.y + h.h < oy0) continue;
      c.fillStyle = h.floor;
      c.fillRect(h.x, h.y, h.w, h.h);
      c.strokeStyle = 'rgba(0,0,0,0.16)';
      c.lineWidth = 1;
      for (let y = h.y; y < h.y + h.h; y += 16) {
        c.beginPath();
        c.moveTo(h.x, y);
        c.lineTo(h.x + h.w, y);
        c.stroke();
        const off = ((y - h.y) / 16) % 2 ? 0 : 40;
        for (let x = h.x + off; x < h.x + h.w; x += 80) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 16);
          c.stroke();
        }
      }
      if (h.rug) {
        const rw = h.w * 0.42;
        const rh = h.h * 0.36;
        c.fillStyle = h.rug;
        c.fillRect(h.x + h.w / 2 - rw / 2, h.y + h.h / 2 - rh / 2, rw, rh);
        c.strokeStyle = 'rgba(255,230,180,0.6)';
        c.lineWidth = 3;
        c.strokeRect(h.x + h.w / 2 - rw / 2 + 6, h.y + h.h / 2 - rh / 2 + 6, rw - 12, rh - 12);
      }
    }
    c.restore();
    return canvas;
  }

  drawGround(ctx, view) {
    const S = CONFIG.CHUNK;
    const maxC = Math.ceil(this.width / S) - 1;
    const maxR = Math.ceil(this.height / S) - 1;
    // al massimo 1 blocco nuovo per frame (all'inizio di più), così correndo non ci sono scatti
    this.chunkBudget = this.chunks.size === 0 ? 20 : 1;
    const range = (m) => ({
      c0: Math.max(0, Math.floor((view.left - m) / S)),
      c1: Math.min(maxC, Math.floor((view.right + m) / S)),
      r0: Math.max(0, Math.floor((view.top - m) / S)),
      r1: Math.min(maxR, Math.floor((view.bottom + m) / S)),
    });
    const v = range(0);
    for (let r = v.r0; r <= v.r1; r++) {
      for (let c = v.c0; c <= v.c1; c++) {
        const chunk = this.getChunk(c, r);
        if (chunk) ctx.drawImage(chunk, c * S, r * S, S + 1, S + 1);
        else {
          ctx.fillStyle = '#4f8a3f';
          ctx.fillRect(c * S, r * S, S + 1, S + 1);
        }
      }
    }
    // con il budget avanzato prepara i blocchi appena fuori dallo schermo
    if (this.chunkBudget > 0) {
      const a = range(S);
      for (let r = a.r0; r <= a.r1 && this.chunkBudget > 0; r++) {
        for (let c = a.c0; c <= a.c1 && this.chunkBudget > 0; c++) {
          if (!this.chunks.has(c * 1000 + r)) this.getChunk(c, r);
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, this.width, this.height);
  }

  // Onde animate e ponti costruiti
  drawWater(ctx, view, t) {
    const T = this.T;
    const c0 = Math.max(0, Math.floor(view.left / T));
    const c1 = Math.min(this.cols - 1, Math.floor(view.right / T));
    const r0 = Math.max(0, Math.floor(view.top / T));
    const r1 = Math.min(this.rows - 1, Math.floor(view.bottom / T));
    const waves = new Path2D();
    const bridges = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.terrain[r * this.cols + c] !== WATER) continue;
        if (this.bridges[r * this.cols + c]) {
          bridges.push([c, r]);
          continue;
        }
        const ph = t * 1.4 + c * 0.9 + r * 1.7;
        const x = c * T + 10 + Math.sin(ph) * 6;
        const y = r * T + 20;
        waves.moveTo(x, y);
        waves.quadraticCurveTo(x + 9, y - 5, x + 18, y);
        const x2 = c * T + 34 + Math.sin(ph + 2) * 6;
        waves.moveTo(x2, y + 24);
        waves.quadraticCurveTo(x2 + 9, y + 19, x2 + 18, y + 24);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.stroke(waves);

    for (const [c, r] of bridges) {
      const x = c * T;
      const y = r * T;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 4, y + 6, T, T);
      ctx.fillStyle = '#9a6b3d';
      ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = '#6e4826';
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (i * T) / 6, y);
        ctx.lineTo(x + (i * T) / 6, y + T);
        ctx.stroke();
      }
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(x, y, T, 5);
      ctx.fillRect(x, y + T - 5, T, 5);
    }
  }

  visibleObstacles(view) {
    return this.obstacles.queryRect(view.left, view.top, view.right, view.bottom);
  }

  drawShadows(ctx, list) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (const ob of list) {
      if (ob.kind === 'tree') {
        ctx.beginPath();
        ctx.ellipse(ob.x + 16, ob.y + 20, ob.canopyR * 0.9, ob.canopyR * 0.8, 0, 0, TAU);
        ctx.fill();
      } else if (ob.kind === 'rock') {
        ctx.beginPath();
        ctx.ellipse(ob.x + 5, ob.y + 7, ob.r, ob.r * 0.9, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  // Muri delle case, rocce, muri costruiti, tronchi
  drawStructures(ctx, list, t) {
    for (const ob of list) {
      const sh = ob.shake > 0 ? Math.sin(t * 60) * ob.shake * 8 : 0;
      if (ob.kind === 'hwall') {
        ctx.fillStyle = '#e3d6bb';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        const dmg = 1 - ob.hp / ob.maxHp;
        if (dmg > 0.05) {
          ctx.fillStyle = `rgba(60,40,20,${dmg * 0.5})`;
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        }
        ctx.strokeStyle = '#7d6e57';
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x + 1, ob.y + 1, ob.w - 2, ob.h - 2);
      } else if (ob.kind === 'rock') {
        const s = ob.sprite;
        const w = s.width * ob.scale;
        ctx.drawImage(s, ob.x - w / 2 + sh, ob.y - w / 2, w, w);
      } else if (ob.kind === 'wall') {
        drawBuiltWall(ctx, ob);
      } else if (ob.kind === 'tree') {
        ctx.fillStyle = '#5b3a22';
        ctx.beginPath();
        ctx.arc(ob.x + sh, ob.y, ob.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#3a2414';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Cespugli, chiome degli alberi e tetti: vanno sopra i personaggi
  drawOverlay(ctx, view, list, player, dt, t) {
    const k = Math.min(1, dt * 8);
    for (const b of this.bushGrid.queryRect(view.left, view.top, view.right, view.bottom)) {
      const inside = player.alive && Math.hypot(player.x - b.x, player.y - b.y) < b.r;
      b.fade += ((inside ? 0.45 : 1) - b.fade) * k;
      const s = b.sprite;
      const sc = b.r / 34;
      ctx.globalAlpha = b.fade;
      ctx.drawImage(s, b.x - (s.width * sc) / 2, b.y - (s.height * sc) / 2, s.width * sc, s.height * sc);
    }
    for (const ob of list) {
      if (ob.kind !== 'tree') continue;
      const under = player.alive && Math.hypot(player.x - ob.x, player.y - ob.y) < ob.canopyR * 0.9;
      ob.fade += ((under ? 0.3 : 1) - ob.fade) * k;
      const sh = ob.shake > 0 ? Math.sin(t * 50) * ob.shake * 10 : 0;
      const s = ob.sprite;
      const sc = ob.scale;
      ctx.globalAlpha = ob.fade;
      ctx.drawImage(s, ob.x - (s.width * sc) / 2 + sh, ob.y - (s.height * sc) / 2, s.width * sc, s.height * sc);
    }
    ctx.globalAlpha = 1;

    for (const h of this.houses) {
      if (h.x > view.right || h.x + h.w < view.left || h.y > view.bottom || h.y + h.h < view.top) continue;
      const inside = player.alive && player.x > h.x && player.x < h.x + h.w && player.y > h.y && player.y < h.y + h.h;
      h.fade += ((inside ? 0 : 1) - h.fade) * k;
      if (h.fade < 0.02) continue;
      ctx.globalAlpha = h.fade;
      drawRoof(ctx, h);
      ctx.globalAlpha = 1;
    }
  }
}

function drawRoof(ctx, h) {
  const o = 6;
  const x = h.x - o;
  const y = h.y - o;
  const w = h.w + o * 2;
  const hh = h.h + o * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 12, y + 14, w, hh);
  ctx.fillStyle = h.roof;
  ctx.fillRect(x, y, w, hh);

  const horizontal = w >= hh;
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 2;
  if (horizontal) {
    for (let yy = y + 9; yy < y + hh; yy += 9) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, hh / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y + hh / 2, w, hh / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, y + hh / 2 - 3, w, 6);
  } else {
    for (let xx = x + 9; xx < x + w; xx += 9) {
      ctx.beginPath();
      ctx.moveTo(xx, y);
      ctx.lineTo(xx, y + hh);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w / 2, hh);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + w / 2, y, w / 2, hh);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + w / 2 - 3, y, 6, hh);
  }
  // Comignolo
  ctx.fillStyle = '#6d625a';
  ctx.fillRect(x + w * 0.72, y + hh * 0.2, 22, 22);
  ctx.fillStyle = '#2a2522';
  ctx.fillRect(x + w * 0.72 + 4, y + hh * 0.2 + 4, 14, 14);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, hh);
}
