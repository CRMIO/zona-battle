// Funzioni di utilità condivise.

export const TAU = Math.PI * 2;

// Generatore casuale con seed: stesso seed = stessi numeri
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

// Numero casuale con distribuzione circa normale (media 0, deviazione 1)
export function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 2;
}

export function pickWeighted(rng, list, weightOf) {
  let total = 0;
  for (const item of list) total += weightOf(item);
  let r = rng() * total;
  for (const item of list) {
    r -= weightOf(item);
    if (r <= 0) return item;
  }
  return list[list.length - 1];
}

export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Rumore "morbido" 2D (value noise): valori tra 0 e 1 che cambiano gradualmente
export function makeNoise(seed) {
  const hash = (ix, iy) => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  };
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  };
}

// Rettangolo che contiene un oggetto (cerchio o rettangolo)
export function boundsOf(o) {
  if (o.shape === 'circle') return { l: o.x - o.r, t: o.y - o.r, r: o.x + o.r, b: o.y + o.r };
  return { l: o.x, t: o.y, r: o.x + o.w, b: o.y + o.h };
}

// Griglia spaziale: trova velocemente gli oggetti vicini a un punto
export class SpatialGrid {
  constructor(cell = 128) {
    this.cell = cell;
    this.cells = new Map();
  }

  key(cx, cy) {
    return (cx + 64) * 4096 + (cy + 64);
  }

  insert(o) {
    const b = boundsOf(o);
    o._keys = [];
    for (let cx = Math.floor(b.l / this.cell); cx <= Math.floor(b.r / this.cell); cx++) {
      for (let cy = Math.floor(b.t / this.cell); cy <= Math.floor(b.b / this.cell); cy++) {
        const k = this.key(cx, cy);
        let arr = this.cells.get(k);
        if (!arr) {
          arr = [];
          this.cells.set(k, arr);
        }
        arr.push(o);
        o._keys.push(k);
      }
    }
  }

  remove(o) {
    for (const k of o._keys || []) {
      const arr = this.cells.get(k);
      if (!arr) continue;
      const i = arr.indexOf(o);
      if (i >= 0) arr.splice(i, 1);
    }
    o._keys = [];
  }

  queryRect(l, t, r, b) {
    const out = [];
    const seen = new Set();
    for (let cx = Math.floor(l / this.cell); cx <= Math.floor(r / this.cell); cx++) {
      for (let cy = Math.floor(t / this.cell); cy <= Math.floor(b / this.cell); cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const o of arr) {
          if (!seen.has(o)) {
            seen.add(o);
            out.push(o);
          }
        }
      }
    }
    return out;
  }

  query(x, y, rad) {
    return this.queryRect(x - rad, y - rad, x + rad, y + rad);
  }
}
