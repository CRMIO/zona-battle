import { CONFIG } from '../config.js';

const CELL = 128; // dimensione delle celle della griglia spaziale

// Generatore casuale con seed: la stessa mappa a ogni avvio
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameMap {
  constructor() {
    const T = CONFIG.TILE;
    this.cols = CONFIG.MAP_W;
    this.rows = CONFIG.MAP_H;
    this.width = this.cols * T;
    this.height = this.rows * T;
    this.rng = mulberry32(CONFIG.SEED);

    this.tiles = [];       // tipo di terreno per ogni tile
    this.obstacles = [];   // case, rocce, tronchi (solidi)
    this.trees = [];       // chiome degli alberi (disegnate sopra i personaggi)
    this.grid = new Map(); // griglia spaziale: "cx,cy" -> [ostacoli]

    this.spawn = { x: this.width / 2, y: this.height / 2 };

    this.generateGround();
    this.generateHouses(9);
    this.generateRocks(45);
    this.generateTrees(110);
  }

  // ---------- Generazione ----------

  generateGround() {
    const rng = this.rng;
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.tiles.push({ type: 'grass', shade: rng() });
    }
    // Qualche sentiero di terra che parte dal centro
    for (let p = 0; p < 5; p++) {
      let cx = this.cols / 2;
      let cy = this.rows / 2;
      let angle = rng() * Math.PI * 2;
      for (let step = 0; step < 60; step++) {
        angle += (rng() - 0.5) * 0.6;
        cx += Math.cos(angle);
        cy += Math.sin(angle);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const t = this.tileAt(Math.floor(cx) + ox, Math.floor(cy) + oy);
            if (t && (ox === 0 || oy === 0)) t.type = 'dirt';
          }
        }
      }
    }
  }

  generateHouses(count) {
    const T = CONFIG.TILE;
    const rng = this.rng;
    let tries = 0;
    while (count > 0 && tries++ < 500) {
      const w = (3 + Math.floor(rng() * 4)) * T;
      const h = (3 + Math.floor(rng() * 3)) * T;
      const x = Math.floor(rng() * (this.cols - 6) + 2) * T;
      const y = Math.floor(rng() * (this.rows - 6) + 2) * T;
      const house = { kind: 'house', shape: 'rect', x, y, w, h, hue: Math.floor(rng() * 4) };
      if (!this.isFree(house, T)) continue;
      this.addObstacle(house);
      count--;
    }
  }

  generateRocks(count) {
    const rng = this.rng;
    let tries = 0;
    while (count > 0 && tries++ < 2000) {
      const r = 16 + rng() * 22;
      const rock = { kind: 'rock', shape: 'circle', x: rng() * this.width, y: rng() * this.height, r };
      if (!this.isFree(rock, 20)) continue;
      this.addObstacle(rock);
      count--;
    }
  }

  generateTrees(count) {
    const rng = this.rng;
    let tries = 0;
    while (count > 0 && tries++ < 3000) {
      const trunk = { kind: 'trunk', shape: 'circle', x: rng() * this.width, y: rng() * this.height, r: 13 };
      if (!this.isFree(trunk, 40)) continue;
      this.addObstacle(trunk);
      this.trees.push({ x: trunk.x, y: trunk.y, r: 46 + rng() * 18, fade: 1 });
      count--;
    }
  }

  // Controlla che un nuovo oggetto non si sovrapponga ad altri né allo spawn
  isFree(ob, margin) {
    const b = bounds(ob, margin);
    if (b.left < 0 || b.top < 0 || b.right > this.width || b.bottom > this.height) return false;
    const s = this.spawn;
    if (s.x > b.left - 150 && s.x < b.right + 150 && s.y > b.top - 150 && s.y < b.bottom + 150) return false;
    for (const other of this.obstacles) {
      const o = bounds(other, 0);
      if (b.left < o.right && b.right > o.left && b.top < o.bottom && b.bottom > o.top) return false;
    }
    return true;
  }

  // ---------- Griglia spaziale ----------

  addObstacle(ob) {
    this.obstacles.push(ob);
    const b = bounds(ob, 0);
    for (let cx = Math.floor(b.left / CELL); cx <= Math.floor(b.right / CELL); cx++) {
      for (let cy = Math.floor(b.top / CELL); cy <= Math.floor(b.bottom / CELL); cy++) {
        const key = cx + ',' + cy;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(ob);
      }
    }
  }

  // Restituisce gli ostacoli vicini al punto (x, y) entro il raggio r
  query(x, y, r) {
    const found = new Set();
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) {
        const list = this.grid.get(cx + ',' + cy);
        if (list) for (const ob of list) found.add(ob);
      }
    }
    return found;
  }

  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return null;
    return this.tiles[row * this.cols + col];
  }

  // ---------- Disegno ----------

  drawGround(ctx, view) {
    const T = CONFIG.TILE;
    const c0 = Math.max(0, Math.floor(view.left / T));
    const r0 = Math.max(0, Math.floor(view.top / T));
    const c1 = Math.min(this.cols - 1, Math.floor(view.right / T));
    const r1 = Math.min(this.rows - 1, Math.floor(view.bottom / T));

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.tiles[r * this.cols + c];
        if (t.type === 'dirt') ctx.fillStyle = `hsl(33, 38%, ${40 + t.shade * 4}%)`;
        else ctx.fillStyle = `hsl(${100 + t.shade * 12}, 42%, ${34 + t.shade * 5}%)`;
        ctx.fillRect(c * T, r * T, T + 1, T + 1);
      }
    }

    // Bordo della mappa
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, this.width, this.height);
  }

  drawObstacles(ctx, view) {
    for (const ob of this.obstacles) {
      if (!inView(ob, view)) continue;
      if (ob.kind === 'house') drawHouse(ctx, ob);
      else if (ob.kind === 'rock') drawRock(ctx, ob);
      else if (ob.kind === 'trunk') drawTrunk(ctx, ob);
    }
  }

  // Le chiome vanno sopra i personaggi; diventano trasparenti se ci sei sotto
  drawCanopies(ctx, view, player, dt) {
    for (const tree of this.trees) {
      const under = Math.hypot(player.x - tree.x, player.y - tree.y) < tree.r;
      const goal = under ? 0.35 : 1;
      tree.fade += (goal - tree.fade) * Math.min(1, dt * 10);
      if (!inView({ shape: 'circle', ...tree }, view)) continue;

      ctx.globalAlpha = tree.fade;
      ctx.fillStyle = '#1f5a2a';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d7a37';
      ctx.beginPath();
      ctx.arc(tree.x - tree.r * 0.2, tree.y - tree.r * 0.2, tree.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function bounds(ob, margin) {
  if (ob.shape === 'circle') {
    return { left: ob.x - ob.r - margin, top: ob.y - ob.r - margin, right: ob.x + ob.r + margin, bottom: ob.y + ob.r + margin };
  }
  return { left: ob.x - margin, top: ob.y - margin, right: ob.x + ob.w + margin, bottom: ob.y + ob.h + margin };
}

function inView(ob, view) {
  const b = bounds(ob, 0);
  return b.right > view.left && b.left < view.right && b.bottom > view.top && b.top < view.bottom;
}

const ROOF_COLORS = ['#8c3b2e', '#4f5d75', '#6b4f3a', '#7a6c2f'];

function drawHouse(ctx, h) {
  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(h.x + 8, h.y + 8, h.w, h.h);
  // Tetto a due falde visto dall'alto
  ctx.fillStyle = ROOF_COLORS[h.hue];
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(h.x, h.y, h.w, h.h / 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(h.x, h.y, h.w, h.h);
  ctx.beginPath();
  ctx.moveTo(h.x, h.y + h.h / 2);
  ctx.lineTo(h.x + h.w, h.y + h.h / 2);
  ctx.stroke();
}

function drawRock(ctx, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(r.x + 5, r.y + 5, r.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a8f94';
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a7acb1';
  ctx.beginPath();
  ctx.arc(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTrunk(ctx, t) {
  ctx.fillStyle = '#5b3a22';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
}
