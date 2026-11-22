// Tutta la grafica disegnata con il canvas: personaggi, armi, oggetti, alberi, rocce, casse.
// Le forme sono disegnate "verso destra" (angolo 0): chi le usa ruota il contesto.

import { RARITIES } from '../data/weapons.js';
import { ITEMS, AMMO } from '../data/items.js';
import { TAU } from '../utils.js';

const METAL = '#2b2f35';
const WOOD = '#7a4b28';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

// Schiarisce (amt > 0) o scurisce (amt < 0) un colore esadecimale
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  r = Math.round(r + (f - r) * k);
  g = Math.round(g + (f - g) * k);
  b = Math.round(b + (f - b) * k);
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------------ Armi

export function drawWeapon(ctx, id, rarity, x0 = 0, y0 = 0) {
  const R = RARITIES[rarity] || RARITIES.common;
  const acc = R.color;
  const METAL2 = R.body; // il corpo dell'arma ha il colore della rarità
  ctx.save();
  ctx.translate(x0, y0);
  if (R.glow) {
    ctx.shadowColor = R.glow;
    ctx.shadowBlur = 8;
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  const part = (x, y, w, h, color, r = 1.5) => {
    ctx.fillStyle = color;
    rr(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
  };
  switch (id) {
    case 'pistol':
      part(1, 0, 7, 9, METAL);
      part(-1, -4, 21, 7, METAL2);
      part(3, -3, 11, 2, acc, 1);
      break;
    case 'smg':
      part(-9, -2, 8, 5, METAL);
      part(7, 2, 5, 10, METAL);
      part(-2, -4, 27, 8, METAL2);
      part(24, -2, 9, 4, METAL);
      part(1, -3, 15, 2, acc, 1);
      break;
    case 'rifle':
      part(-13, -3, 14, 7, METAL);
      part(12, 3, 6, 10, METAL);
      part(0, -4, 33, 8, METAL2);
      part(32, -2, 13, 4, METAL);
      part(7, -8, 13, 4, '#1c1f23');
      part(2, -3, 20, 2, acc, 1);
      break;
    case 'shotgun':
      part(-13, -3, 14, 8, WOOD);
      part(0, -4, 40, 8, METAL2);
      part(15, -6, 14, 12, WOOD, 3);
      part(31, -3, 8, 2, acc, 1);
      part(1, -3, 12, 2, acc, 1);
      break;
    case 'sniper':
      part(-15, -3, 16, 7, WOOD);
      part(0, -3, 35, 6, METAL2);
      part(34, -1.5, 26, 3, METAL);
      part(9, -10, 21, 6, '#1c1f23', 2);
      ctx.fillStyle = '#7fd3ff';
      circle(ctx, 29, -7, 2);
      ctx.fill();
      part(2, -2, 10, 2, acc, 1);
      break;
  }
  ctx.restore();
}

export function drawPickaxe(ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(30, 0);
  ctx.stroke();
  ctx.fillStyle = '#b4bec8';
  ctx.strokeStyle = '#4b535c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(25, -16);
  ctx.quadraticCurveTo(38, -5, 36, 0);
  ctx.quadraticCurveTo(38, 5, 25, 16);
  ctx.quadraticCurveTo(33, 0, 25, -16);
  ctx.fill();
  ctx.stroke();
}

// ------------------------------------------------------------------ Personaggi

const CAMO = [[-8, -6, 6], [5, 8, 7], [8, -9, 5], [-4, 10, 5], [-12, 4, 4], [12, 2, 4]];
const STARS = [[-9, -5], [4, -10], [8, 6], [-4, 9], [11, -3], [-12, 3], [1, 2], [-6, -12]];

function drawPattern(ctx, s, r, t) {
  ctx.fillStyle = s.body2;
  ctx.strokeStyle = s.body2;
  switch (s.pattern) {
    case 'camo':
      for (const [x, y, rad] of CAMO) {
        circle(ctx, x, y, rad);
        ctx.fill();
      }
      break;
    case 'belly':
      ellipse(ctx, r * 0.35, 0, r * 0.6, r * 0.75);
      ctx.fill();
      break;
    case 'stripes':
      for (let x = -r; x < r; x += 9) ctx.fillRect(x, -r, 4.5, r * 2);
      break;
    case 'band':
      ctx.fillRect(-3, -r, 8, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, -r, 2, r * 2);
      break;
    case 'split':
      ctx.fillRect(-r, -r, r * 2, r);
      break;
    case 'scales':
      ctx.lineWidth = 1.5;
      for (let y = -r; y < r; y += 7) {
        for (let x = -r + ((y / 7) % 2 ? 3.5 : 0); x < r; x += 7) {
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI);
          ctx.stroke();
        }
      }
      break;
    case 'circuit':
      ctx.lineWidth = 1.6;
      ctx.shadowColor = s.body2;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-r, -6); ctx.lineTo(-6, -6); ctx.lineTo(-2, -10); ctx.lineTo(6, -10);
      ctx.moveTo(-r, 6); ctx.lineTo(-8, 6); ctx.lineTo(-4, 11); ctx.lineTo(8, 11);
      ctx.moveTo(-12, -r); ctx.lineTo(-12, -12);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    case 'hood':
      ctx.lineWidth = 4;
      circle(ctx, 0, 0, r - 2);
      ctx.stroke();
      break;
    case 'galaxy': {
      const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
      g.addColorStop(0, '#5b2a9e');
      g.addColorStop(0.6, s.body);
      g.addColorStop(1, '#0a0820');
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = s.body2;
      ctx.globalAlpha = 0.35;
      ellipse(ctx, 3, -2, r * 0.7, r * 0.25);
      ctx.fill();
      ctx.globalAlpha = 1;
      STARS.forEach(([x, y], i) => {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)})`;
        circle(ctx, x, y, 1.2);
        ctx.fill();
      });
      break;
    }
    case 'cracks':
      ctx.lineWidth = 2;
      ctx.shadowColor = s.body2;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-r, -3); ctx.lineTo(-8, -1); ctx.lineTo(-4, -8); ctx.lineTo(3, -6); ctx.lineTo(8, -r);
      ctx.moveTo(-6, r); ctx.lineTo(-3, 6); ctx.lineTo(5, 5); ctx.lineTo(9, 11);
      ctx.moveTo(-8, -1); ctx.lineTo(-10, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    case 'rank': {
      // skin dei rank: armatura con lo stemma del rank sul petto
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = s.body2;
      ctx.strokeStyle = s.body2;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(-Math.PI / 2);
      const e = s.emblem;
      if (e.startsWith('chev')) {
        const n = Number(e.slice(4));
        for (let i = 0; i < n; i++) {
          const y = (i - (n - 1) / 2) * 5;
          ctx.beginPath();
          ctx.moveTo(-7, y + 3); ctx.lineTo(0, y - 2); ctx.lineTo(7, y + 3);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        if (e === 'star') {
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const d = i % 2 ? 3.2 : 7.5;
            ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
          }
        } else if (e === 'crown') {
          ctx.moveTo(-8, 5); ctx.lineTo(-8, -5); ctx.lineTo(-4, 0); ctx.lineTo(0, -7); ctx.lineTo(4, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5);
        } else {
          const k = e === 'bigdiamond' ? 9 : 7;
          ctx.moveTo(0, -k); ctx.lineTo(k * 0.8, 0); ctx.lineTo(0, k); ctx.lineTo(-k * 0.8, 0);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'rainbow': {
      // leggendaria: colori che scorrono
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `hsl(${(t * 60 + i * 60) % 360}, 85%, 60%)`;
        ctx.fillRect(-r + i * ((r * 2) / 6), -r, (r * 2) / 6 + 0.5, r * 2);
      }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = s.body;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      break;
    }
    case 'armor':
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.35); ctx.lineTo(r, -r * 0.35);
      ctx.moveTo(-r, r * 0.35); ctx.lineTo(r, r * 0.35);
      ctx.moveTo(-r * 0.3, -r); ctx.lineTo(-r * 0.3, r);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ellipse(ctx, -5, -7, 6, 3);
      ctx.fill();
      break;
  }
}

function drawHead(ctx, s, r, t) {
  const hr = r * 0.56;
  const hx = 2;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';

  // Elementi dietro la testa
  if (s.hat === 'horns') {
    ctx.fillStyle = s.hatColor;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx - 2, side * hr * 0.45);
      ctx.quadraticCurveTo(hx - hr * 0.6, side * hr * 1.7, hx - hr * 1.6, side * hr * 1.5);
      ctx.quadraticCurveTo(hx - hr * 0.6, side * hr * 1.1, hx - 4, side * hr * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  if (s.hat === 'foxears') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = s.hatColor;
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.1, side * hr * 0.35);
      ctx.lineTo(hx - hr * 0.9, side * hr * 1.45);
      ctx.lineTo(hx - hr * 0.9, side * hr * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffb3a7';
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.3, side * hr * 0.5);
      ctx.lineTo(hx - hr * 0.8, side * hr * 1.15);
      ctx.lineTo(hx - hr * 0.8, side * hr * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (s.hat === 'bandana') {
    ctx.fillStyle = s.hatColor;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.9, 0);
    ctx.lineTo(hx - hr * 1.9, -5);
    ctx.lineTo(hx - hr * 1.7, 2);
    ctx.lineTo(hx - hr * 2.0, 6);
    ctx.closePath();
    ctx.fill();
  }

  // Testa
  ctx.fillStyle = s.skinTone;
  circle(ctx, hx, 0, hr);
  ctx.fill();
  ctx.stroke();

  // Capelli sulla parte posteriore
  if (s.hat !== 'hood' && s.hat !== 'visor' && s.hat !== 'plume') {
    ctx.fillStyle = s.hair;
    ctx.beginPath();
    ctx.arc(hx, 0, hr, Math.PI * 0.55, Math.PI * 1.45);
    ctx.closePath();
    ctx.fill();
  }

  switch (s.hat) {
    case 'cap':
      ctx.fillStyle = s.hatColor;
      ctx.beginPath();
      ctx.arc(hx, 0, hr * 1.02, Math.PI * 0.6, Math.PI * 1.4 + Math.PI * 0.8);
      ctx.fill();
      rr(ctx, hx + hr * 0.35, -hr * 0.75, hr * 0.85, hr * 1.5, 5);
      ctx.fill();
      ctx.stroke();
      break;
    case 'helmet':
      ctx.fillStyle = s.hatColor;
      circle(ctx, hx - 1, 0, hr * 1.1);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(hx - hr, 0);
      ctx.lineTo(hx + hr, 0);
      ctx.stroke();
      break;
    case 'bandana':
      ctx.fillStyle = s.hatColor;
      ctx.beginPath();
      ctx.arc(hx, 0, hr * 1.04, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const [x, y] of [[-4, -4], [-6, 3], [-2, 6]]) {
        circle(ctx, hx + x * 0.8, y * 0.8, 1.2);
        ctx.fill();
      }
      break;
    case 'antennae':
      ctx.strokeStyle = s.hatColor;
      ctx.lineWidth = 2;
      ctx.fillStyle = s.hatColor;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + 2, side * 4);
        ctx.quadraticCurveTo(hx + 10, side * 8, hx + 14, side * 14);
        ctx.stroke();
        circle(ctx, hx + 14, side * 14, 2.5);
        ctx.fill();
      }
      break;
    case 'firehelmet':
      ctx.fillStyle = shade(s.hatColor, -0.15);
      ellipse(ctx, hx - 3, 0, hr * 1.45, hr * 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.hatColor;
      circle(ctx, hx, 0, hr * 1.02);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c0c0c0';
      rr(ctx, hx + hr * 0.45, -3, 5, 6, 1);
      ctx.fill();
      break;
    case 'visor':
      ctx.fillStyle = s.body;
      circle(ctx, hx, 0, hr * 1.05);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = s.hatColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = s.hatColor;
      rr(ctx, hx + hr * 0.35, -hr * 0.8, hr * 0.5, hr * 1.6, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case 'hood':
      ctx.fillStyle = s.hatColor;
      circle(ctx, hx - 1, 0, hr * 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#05030a';
      ellipse(ctx, hx + hr * 0.45, 0, hr * 0.55, hr * 0.75);
      ctx.fill();
      break;
    case 'crown':
      ctx.fillStyle = s.hair;
      circle(ctx, hx, 0, hr * 1.02);
      ctx.fill();
      ctx.shadowColor = s.hatColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = s.hatColor;
      ctx.strokeStyle = '#6e4a00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const d = i % 2 ? hr * 0.62 : hr * 1.05;
        ctx.lineTo(hx + Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e0245e';
      circle(ctx, hx, 0, hr * 0.28);
      ctx.fill();
      break;
    case 'plume':
      ctx.fillStyle = s.skinTone;
      circle(ctx, hx, 0, hr * 1.08);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = s.hatColor;
      ellipse(ctx, hx - 3, 0, hr * 1.2, hr * 0.32);
      ctx.fill();
      ctx.strokeStyle = '#2b3440';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.75, -hr * 0.5);
      ctx.lineTo(hx + hr * 0.75, hr * 0.5);
      ctx.stroke();
      break;
  }

  if (s.eyes) {
    ctx.shadowColor = s.eyes;
    ctx.shadowBlur = 8;
    ctx.fillStyle = s.eyes;
    circle(ctx, hx + hr * 0.6, -hr * 0.35, 1.8 + Math.sin(t * 5) * 0.3);
    ctx.fill();
    circle(ctx, hx + hr * 0.6, hr * 0.35, 1.8 + Math.sin(t * 5) * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function arm(ctx, color, x1, y1, x2, y2) {
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();
}

function hand(ctx, color, x, y) {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.2;
  circle(ctx, x, y, 4.5);
  ctx.fill();
  ctx.stroke();
}

function drawHeld(ctx, s, o, r) {
  const handColor = s.skinTone;
  const sleeve = shade(s.body, -0.1);
  ctx.lineCap = 'round';
  const item = o.item;

  if (!item) {
    // Piccone: a riposo o mentre colpisce
    const sw = o.swing || 0;
    const ang = sw > 0 ? 0.9 - (1 - sw) * 1.9 : -0.25;
    arm(ctx, sleeve, 0, -r * 0.72, r * 0.45, -r * 0.55);
    hand(ctx, handColor, r * 0.45, -r * 0.55);
    ctx.save();
    ctx.translate(0, r * 0.72);
    ctx.rotate(ang);
    arm(ctx, sleeve, 0, 0, r * 0.75, 0);
    ctx.translate(r * 0.75, 0);
    ctx.rotate(-0.35);
    drawPickaxe(ctx);
    hand(ctx, handColor, 0, 0);
    ctx.restore();
  } else if (item.kind === 'weapon') {
    const short = item.id === 'pistol';
    const back = short ? [r + 1, 5] : [r - 2, 6];
    const front = short ? [r + 6, 2] : [r + 13, 3];
    arm(ctx, sleeve, 0, r * 0.72, back[0], back[1]);
    arm(ctx, sleeve, 0, -r * 0.72, front[0], front[1]);
    drawWeapon(ctx, item.id, item.rarity, r - 6, 4);
    hand(ctx, handColor, back[0], back[1]);
    hand(ctx, handColor, front[0], front[1]);
  } else {
    arm(ctx, sleeve, 0, r * 0.72, r + 2, 6);
    arm(ctx, sleeve, 0, -r * 0.72, r + 2, -4);
    ctx.save();
    ctx.translate(r + 6, 1);
    ctx.rotate(-Math.PI / 2);
    drawItemIcon(ctx, item, 22);
    ctx.restore();
    hand(ctx, handColor, r + 2, 6);
    hand(ctx, handColor, r + 2, -4);
  }
}

// Disegna il personaggio centrato in (0, 0).
// o = { angle, walk, item, swing (0..1), t (tempo), hurt (0..1) }
export function drawCharacter(ctx, skin, o = {}) {
  const r = 18;
  const t = o.t || 0;
  ctx.save();

  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, 4, 6, r * 1.1, r * 0.95);
  ctx.fill();

  ctx.rotate(o.angle || 0);

  // Piedi (si muovono camminando)
  const step = Math.sin(o.walk || 0) * 6;
  ctx.fillStyle = '#26262b';
  ellipse(ctx, step, -8, 7, 5);
  ctx.fill();
  ellipse(ctx, -step, 8, 7, 5);
  ctx.fill();

  // Zaino
  ctx.fillStyle = skin.pack;
  rr(ctx, -r - 7, -11, 13, 22, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Corpo (con alone per le skin premium)
  if (skin.glow) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 12 + Math.sin(t * 4) * 4;
  }
  ctx.fillStyle = skin.body;
  circle(ctx, 0, 0, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  circle(ctx, 0, 0, r);
  ctx.clip();
  drawPattern(ctx, skin, r, t);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2.5;
  circle(ctx, 0, 0, r);
  ctx.stroke();

  drawHeld(ctx, skin, o, r);
  drawHead(ctx, skin, r, t);

  // Lampo bianco quando viene colpito
  if (o.hurt > 0) {
    ctx.globalAlpha = o.hurt * 0.6;
    ctx.fillStyle = '#ffffff';
    circle(ctx, 0, 0, r + 1);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Icone oggetti

// Disegna l'icona di un oggetto centrata in (0, 0) dentro un quadrato di lato "size"
export function drawItemIcon(ctx, data, size) {
  const s = size;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  switch (data.kind) {
    case 'weapon': {
      const lens = { pistol: 24, smg: 40, rifle: 58, shotgun: 54, sniper: 75 };
      const len = lens[data.id] || 50;
      const k = Math.min(1.4, (s * 0.95) / len);
      ctx.scale(k, k);
      drawWeapon(ctx, data.id, data.rarity, -len / 2 + (data.id === 'pistol' ? 2 : 10), 0);
      break;
    }
    case 'pickaxe':
      ctx.rotate(-Math.PI / 4);
      ctx.scale(s / 46, s / 46);
      ctx.translate(-20, 0);
      drawPickaxe(ctx);
      break;
    case 'item':
      if (data.id === 'bandage') {
        ctx.fillStyle = '#f1ead8';
        rr(ctx, -s * 0.32, -s * 0.2, s * 0.64, s * 0.4, 4);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * s * 0.1, -s * 0.2);
          ctx.lineTo(i * s * 0.1, s * 0.2);
          ctx.stroke();
        }
        ctx.fillStyle = '#e53935';
        ctx.fillRect(-s * 0.04, -s * 0.13, s * 0.08, s * 0.26);
        ctx.fillRect(-s * 0.13, -s * 0.04, s * 0.26, s * 0.08);
      } else if (data.id === 'medkit') {
        ctx.fillStyle = '#d64541';
        rr(ctx, -s * 0.34, -s * 0.26, s * 0.68, s * 0.52, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-s * 0.06, -s * 0.18, s * 0.12, s * 0.36);
        ctx.fillRect(-s * 0.18, -s * 0.06, s * 0.36, s * 0.12);
      } else if (data.id === 'shieldSmall') {
        ctx.fillStyle = '#3fa9ff';
        circle(ctx, 0, s * 0.08, s * 0.2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#bfe4ff';
        ctx.fillRect(-s * 0.06, -s * 0.3, s * 0.12, s * 0.2);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(-s * 0.07, -s * 0.36, s * 0.14, s * 0.08);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        circle(ctx, -s * 0.07, s * 0.02, s * 0.05);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2f8fff';
        rr(ctx, -s * 0.22, -s * 0.18, s * 0.44, s * 0.5, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#bfe4ff';
        ctx.fillRect(-s * 0.08, -s * 0.34, s * 0.16, s * 0.17);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(-s * 0.09, -s * 0.4, s * 0.18, s * 0.08);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(-s * 0.14, -s * 0.1, s * 0.06, s * 0.3);
      }
      break;
    case 'ammo': {
      const a = AMMO[data.id];
      ctx.fillStyle = '#3b3f45';
      rr(ctx, -s * 0.3, -s * 0.12, s * 0.6, s * 0.34, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = a.color;
      for (let i = -1; i <= 1; i++) {
        rr(ctx, i * s * 0.17 - s * 0.05, -s * 0.3, s * 0.1, s * 0.22, 3);
        ctx.fill();
      }
      ctx.fillRect(-s * 0.3, s * 0.02, s * 0.6, s * 0.06);
      break;
    }
    case 'mats':
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#a86d3a' : '#c08550';
        rr(ctx, -s * 0.32, -s * 0.24 + i * s * 0.17, s * 0.64, s * 0.14, 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Mondo

export function drawChest(ctx, chest, t) {
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, 4, 6, 22, 14);
  ctx.fill();

  const rare = chest.luck > 0;
  if (!chest.opened) {
    ctx.shadowColor = rare ? '#c77dff' : '#ffd34d';
    ctx.shadowBlur = 12 + Math.sin(t * 3 + chest.x) * 6;
  }
  ctx.fillStyle = chest.opened ? '#5e3d1d' : rare ? '#5a3d8a' : '#8b5a2b';
  rr(ctx, -18, -12, 36, 24, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2;
  ctx.stroke();

  const gold = chest.opened ? '#8a7a3a' : '#e8b923';
  ctx.fillStyle = gold;
  ctx.fillRect(-18, -2, 36, 4);
  ctx.fillRect(-13, -12, 4, 24);
  ctx.fillRect(9, -12, 4, 24);

  if (chest.opened) {
    ctx.fillStyle = '#1e1309';
    rr(ctx, -15, -9, 30, 7, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff0a0';
    rr(ctx, -3, -4, 6, 8, 1.5);
    ctx.fill();
    // scintille
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + i * 2.1;
      ctx.fillStyle = `rgba(255,240,170,${0.5 + 0.5 * Math.sin(t * 4 + i)})`;
      circle(ctx, Math.cos(a) * 24, Math.sin(a) * 16, 1.6);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function pickupColor(data) {
  if (data.kind === 'weapon') return RARITIES[data.rarity].color;
  if (data.kind === 'item') return ITEMS[data.id].color;
  if (data.kind === 'ammo') return AMMO[data.id].color;
  return '#c08550';
}

export function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 3 + p.seed) * 2;
  const color = pickupColor(p.data);
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  g.addColorStop(0, color + 'aa');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, 26);
  ctx.fill();
  drawItemIcon(ctx, p.data, p.data.kind === 'weapon' ? 44 : 30);
  ctx.restore();
}

export function drawBuiltWall(ctx, w) {
  const k = w.build === undefined ? 1 : w.build;
  const s = 0.35 + 0.65 * k;
  const h = w.w / 2 - 2;
  ctx.save();
  ctx.translate(w.x + w.w / 2, w.y + w.h / 2);
  ctx.scale(s, s);
  ctx.globalAlpha = 0.55 + 0.45 * k;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-h + 6, -h + 7, h * 2, h * 2);
  ctx.fillStyle = '#b57d46';
  ctx.fillRect(-h, -h, h * 2, h * 2);
  for (let x = -h; x < h; x += 15) {
    ctx.fillStyle = (x / 15) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, -h, 15, h * 2);
  }
  ctx.strokeStyle = '#7a4f28';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-h, -h);
  ctx.lineTo(h, h);
  ctx.moveTo(h, -h);
  ctx.lineTo(-h, h);
  ctx.stroke();
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = 4;
  ctx.strokeRect(-h, -h, h * 2, h * 2);

  if (w.window) {
    // finestra: buco con vetro al centro
    const g = h * 0.55;
    ctx.fillStyle = 'rgba(160,215,255,0.55)';
    ctx.fillRect(-g, -g, g * 2, g * 2);
    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 3;
    ctx.strokeRect(-g, -g, g * 2, g * 2);
    ctx.beginPath();
    ctx.moveTo(-g, 0); ctx.lineTo(g, 0);
    ctx.moveTo(0, -g); ctx.lineTo(0, g);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-g + 4, -g + 4, g * 0.5, 3);
  }
  const dmg = 1 - w.hp / w.maxHp;
  if (k >= 1 && dmg > 0.05) {
    ctx.fillStyle = `rgba(0,0,0,${dmg * 0.4})`;
    ctx.fillRect(-h, -h, h * 2, h * 2);
    if (dmg > 0.4) {
      ctx.strokeStyle = 'rgba(30,15,5,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-h * 0.6, -h * 0.2);
      ctx.lineTo(-h * 0.1, h * 0.1);
      ctx.lineTo(h * 0.3, -h * 0.4);
      ctx.moveTo(-h * 0.1, h * 0.1);
      ctx.lineTo(0, h * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Sprite pre-disegnati

function spriteCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size);
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  return { c, ctx };
}

// Chioma di latifoglia vista dall'alto
export function makeOakSprite(rng, R) {
  const { c, ctx } = spriteCanvas(R * 2 + 16);
  const blobs = [];
  const n = 7 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rng() * 0.5;
    const d = R * (0.42 + rng() * 0.14);
    blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: R * (0.45 + rng() * 0.15) });
  }
  const layer = (color, scale, ox, oy) => {
    ctx.fillStyle = color;
    for (const b of blobs) {
      circle(ctx, b.x * scale + ox, b.y * scale + oy, b.r * scale);
      ctx.fill();
    }
    circle(ctx, ox, oy, R * 0.6 * scale);
    ctx.fill();
  };
  layer('#16391b', 1.02, 0, 0);
  layer('#1f4d24', 0.97, 0, 0);
  layer('#2f6e30', 0.8, -R * 0.07, -R * 0.07);
  layer('#3f8a3a', 0.55, -R * 0.16, -R * 0.16);
  for (let i = 0; i < 70; i++) {
    const a = rng() * TAU;
    const d = Math.sqrt(rng()) * R * 0.85;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const light = x + y < -R * 0.2;
    ctx.fillStyle = light ? 'rgba(150,210,110,0.45)' : 'rgba(10,40,15,0.35)';
    circle(ctx, x, y, 1.5 + rng() * 3);
    ctx.fill();
  }
  return c;
}

// Pino visto dall'alto: stelle sovrapposte
export function makePineSprite(rng, R) {
  const { c, ctx } = spriteCanvas(R * 2 + 16);
  const colors = ['#123321', '#1a4a2c', '#24603a', '#327a47', '#45924f'];
  for (let k = 0; k < 5; k++) {
    const rad = R * (1 - k * 0.19);
    const points = 9;
    const rot = k * 0.33 + rng() * 0.2;
    ctx.fillStyle = colors[k];
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i / (points * 2)) * TAU;
      const d = i % 2 ? rad * 0.68 : rad;
      const x = Math.cos(a) * d - k * 1.5;
      const y = Math.sin(a) * d - k * 1.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#5aa860';
  circle(ctx, -8, -8, 3);
  ctx.fill();
  return c;
}

export function makeRockSprite(rng, R) {
  const { c, ctx } = spriteCanvas(R * 2 + 12);
  const n = 8 + Math.floor(rng() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rng() - 0.5) * 0.4;
    const d = R * (0.82 + rng() * 0.2);
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  path();
  ctx.fillStyle = '#868b91';
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = '#676c72';
  circle(ctx, R * 0.6, R * 0.6, R * 1.05);
  ctx.fill();
  ctx.fillStyle = '#a3a8ae';
  circle(ctx, -R * 0.35, -R * 0.38, R * 0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,42,46,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.2, -R * 0.1);
  ctx.lineTo(R * 0.15, R * 0.2);
  ctx.lineTo(R * 0.1, R * 0.5);
  ctx.stroke();
  if (rng() < 0.4) {
    ctx.fillStyle = 'rgba(80,130,60,0.7)';
    for (let i = 0; i < 4; i++) {
      circle(ctx, -R * 0.5 + rng() * R * 0.5, -R * 0.6 + rng() * R * 0.4, 2 + rng() * 3);
      ctx.fill();
    }
  }
  ctx.restore();
  path();
  ctx.strokeStyle = '#43474c';
  ctx.lineWidth = 2;
  ctx.stroke();
  return c;
}

export function makeBushSprite(rng, R) {
  const { c, ctx } = spriteCanvas(R * 2 + 12);
  const blobs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rng() * 0.6;
    blobs.push({ x: Math.cos(a) * R * 0.45, y: Math.sin(a) * R * 0.45, r: R * (0.5 + rng() * 0.15) });
  }
  ctx.fillStyle = '#244f24';
  for (const b of blobs) {
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
  }
  ctx.fillStyle = '#356f31';
  for (const b of blobs) {
    circle(ctx, b.x * 0.8 - 2, b.y * 0.8 - 2, b.r * 0.75);
    ctx.fill();
  }
  ctx.fillStyle = '#4b8e40';
  for (const b of blobs) {
    circle(ctx, b.x * 0.6 - 4, b.y * 0.6 - 4, b.r * 0.4);
    ctx.fill();
  }
  if (rng() < 0.4) {
    ctx.fillStyle = '#d9344a';
    for (let i = 0; i < 7; i++) {
      const a = rng() * TAU;
      const d = rng() * R * 0.8;
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 2.2);
      ctx.fill();
    }
  }
  return c;
}
