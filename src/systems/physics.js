// Collisioni: i personaggi sono cerchi; gli ostacoli sono cerchi o rettangoli; l'acqua è fatta di tile.

// Sposta un cerchio (entity con x, y, r) e lo spinge fuori da ostacoli e acqua.
export function moveCircle(e, dx, dy, map) {
  e.x += dx;
  e.y += dy;

  const T = map.T;
  // Due passate per gestire bene gli angoli tra più ostacoli
  for (let pass = 0; pass < 2; pass++) {
    for (const ob of map.queryObstacles(e.x, e.y, e.r)) {
      if (ob.shape === 'circle') pushOutOfCircle(e, ob.x, ob.y, ob.r);
      else pushOutOfRect(e, ob);
    }
    // Acqua (i ponti costruiti la rendono calpestabile)
    const c0 = Math.floor((e.x - e.r) / T);
    const c1 = Math.floor((e.x + e.r) / T);
    const r0 = Math.floor((e.y - e.r) / T);
    const r1 = Math.floor((e.y + e.r) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (map.isWaterTile(c, r)) pushOutOfRect(e, { x: c * T, y: r * T, w: T, h: T });
      }
    }
  }

  e.x = Math.max(e.r, Math.min(map.width - e.r, e.x));
  e.y = Math.max(e.r, Math.min(map.height - e.r, e.y));
}

function pushOutOfCircle(e, cx, cy, cr) {
  const dx = e.x - cx;
  const dy = e.y - cy;
  const dist = Math.hypot(dx, dy);
  const min = e.r + cr;
  if (dist >= min) return;
  if (dist === 0) {
    e.x += min;
    return;
  }
  const push = min - dist;
  e.x += (dx / dist) * push;
  e.y += (dy / dist) * push;
}

function pushOutOfRect(e, rect) {
  const nx = Math.max(rect.x, Math.min(e.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(e.y, rect.y + rect.h));
  const dx = e.x - nx;
  const dy = e.y - ny;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    if (dist >= e.r) return;
    const push = e.r - dist;
    e.x += (dx / dist) * push;
    e.y += (dy / dist) * push;
    return;
  }

  // Centro dentro il rettangolo: esce dal lato più vicino
  const left = e.x - rect.x;
  const right = rect.x + rect.w - e.x;
  const top = e.y - rect.y;
  const bottom = rect.y + rect.h - e.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) e.x = rect.x - e.r;
  else if (m === right) e.x = rect.x + rect.w + e.r;
  else if (m === top) e.y = rect.y - e.r;
  else e.y = rect.y + rect.h + e.r;
}

// Un cerchio di raggio r centrato in (x, y) tocca l'ostacolo?
export function circleHits(ob, x, y, r = 0) {
  if (ob.shape === 'circle') {
    const dx = x - ob.x;
    const dy = y - ob.y;
    const rr = ob.r + r;
    return dx * dx + dy * dy < rr * rr;
  }
  const nx = Math.max(ob.x, Math.min(x, ob.x + ob.w));
  const ny = Math.max(ob.y, Math.min(y, ob.y + ob.h));
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy <= r * r;
}

// Un ostacolo si sovrappone a un rettangolo?
export function overlapsRect(ob, rect) {
  if (ob.shape === 'circle') return circleHits(rect, ob.x, ob.y, ob.r - 0.5);
  return ob.x < rect.x + rect.w && ob.x + ob.w > rect.x && ob.y < rect.y + rect.h && ob.y + ob.h > rect.y;
}
