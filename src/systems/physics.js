// Collisioni: i personaggi sono cerchi, gli ostacoli sono cerchi o rettangoli.

// Sposta un cerchio (entity con x, y, r) e lo spinge fuori dagli ostacoli.
export function moveCircle(entity, dx, dy, map) {
  entity.x += dx;
  entity.y += dy;

  // Due passate per gestire bene gli angoli tra più ostacoli
  for (let pass = 0; pass < 2; pass++) {
    for (const ob of map.query(entity.x, entity.y, entity.r)) {
      if (ob.shape === 'circle') pushOutOfCircle(entity, ob.x, ob.y, ob.r);
      else pushOutOfRect(entity, ob);
    }
  }

  // Bordi della mappa
  entity.x = Math.max(entity.r, Math.min(map.width - entity.r, entity.x));
  entity.y = Math.max(entity.r, Math.min(map.height - entity.r, entity.y));
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

// Un punto (o piccolo cerchio di raggio r) tocca l'ostacolo?
export function circleHits(ob, x, y, r = 0) {
  if (ob.shape === 'circle') {
    return Math.hypot(x - ob.x, y - ob.y) < ob.r + r;
  }
  const nx = Math.max(ob.x, Math.min(x, ob.x + ob.w));
  const ny = Math.max(ob.y, Math.min(y, ob.y + ob.h));
  return Math.hypot(x - nx, y - ny) < r || (r === 0 && nx === x && ny === y);
}
