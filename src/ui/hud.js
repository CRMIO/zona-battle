// Interfaccia disegnata sopra il gioco (coordinate dello schermo).
import { CONFIG } from '../config.js';
import { WEAPONS, RARITIES } from '../data/weapons.js';
import { ITEMS, AMMO } from '../data/items.js';
import { drawItemIcon, pickupColor } from '../render/art.js';
import { itemLabel } from '../systems/loot.js';
import { TAU } from '../utils.js';
import { PHASES } from '../world/storm.js';
import { PIECES } from '../game.js';
import { modeName } from '../save.js';

const FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

function text(ctx, str, x, y, { size = 14, color = '#fff', align = 'left', weight = 600, stroke = true } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h, r = 6, color = 'rgba(10,14,20,0.6)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function fmt(t) {
  t = Math.max(0, Math.ceil(t));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export class Hud {
  constructor(game) {
    this.game = game;
  }

  draw(ctx) {
    const g = this.game;
    const p = g.player;
    const W = g.camera.width;
    const H = g.camera.height;
    const touch = g.input.touch.enabled;
    this.touch = touch;
    this.slotRects = [];

    this.vignettes(ctx, W, H);
    const mm = touch ? Math.min(120, H * 0.3) : Math.min(190, Math.max(130, W * 0.16));
    this.drawMap(ctx, W - 12 - mm, 12, mm, false);
    if (touch) this.drawInfoCompact(ctx, W - 24 - mm, 24);
    else this.drawInfo(ctx, W - 12, 12 + mm + 20);

    if (p.alive) {
      if (touch) {
        this.drawBars(ctx, 12, 40, 150);
        this.drawKillFeed(ctx, 12, 92);
        this.drawHotbar(ctx, W / 2, 58, 42);
        this.drawPrompt(ctx, W / 2, H - 16);
      } else {
        this.drawKillFeed(ctx, 16, 16);
        this.drawBars(ctx, 16, H - 16, 250);
        this.drawHotbar(ctx, W / 2, H - 16, 56);
        this.drawResources(ctx, W - 16, H - 16);
        this.drawPrompt(ctx, W / 2, H - 150);
      }
      this.drawChannel(ctx, W / 2, H / 2 + 70);
      if (g.playerCtl.buildMode) this.drawBuildBanner(ctx, W / 2, touch ? 118 : 30);
    } else {
      this.drawKillFeed(ctx, 16, 16);
    }
    if (p.alive && p.phase !== 'ground') this.drawDrop(ctx, W / 2, touch ? H * 0.34 : H * 0.3);
    else this.drawMessage(ctx, W / 2, H * 0.26);
    if (g.showBigMap) {
      const size = Math.min(W, H) - (touch ? 40 : 120);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      this.drawMap(ctx, (W - size) / 2, (H - size) / 2, size, true);
      if (!touch) text(ctx, 'Premi M per chiudere la mappa', W / 2, (H + size) / 2 + 28, { align: 'center', size: 14 });
    }
    if (p.alive && !g.showBigMap && !g.over && !touch) this.drawCrosshair(ctx);
  }

  // Bus e volo: istruzioni e altitudine
  drawDrop(ctx, cx, y) {
    const g = this.game;
    const p = g.player;
    const key = this.touch ? (p.phase === 'bus' ? 'SALTA' : 'APRI DELTAPLANO') : 'SPAZIO';
    let title;
    let sub;
    if (p.phase === 'bus') {
      title = 'SEI SUL BUS VOLANTE';
      sub = `Premi ${key} per lanciarti · ${Math.max(0, Math.ceil(26 - g.bus.t))} s alla fine del percorso`;
    } else {
      title = `ALTITUDINE ${Math.round(p.alt * 900)} m`;
      sub = p.gliding ? 'Deltaplano aperto: plana verso dove vuoi atterrare' : `Caduta libera · premi ${key} per aprire il deltaplano`;
    }
    ctx.font = `800 15px ${FONT}`;
    const w = Math.max(ctx.measureText(sub).width, 260) + 40;
    panel(ctx, cx - w / 2, y - 30, w, 58, 10, 'rgba(8,12,20,0.7)');
    text(ctx, title, cx, y - 6, { align: 'center', size: 20, color: '#ffd34d', weight: 900 });
    text(ctx, sub, cx, y + 17, { align: 'center', size: 14, weight: 700, stroke: false });
    if (p.phase === 'air') {
      const bw = 200;
      panel(ctx, cx - bw / 2, y + 34, bw, 8, 4, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = p.gliding ? '#5fdc8f' : '#7cc4ff';
      ctx.fillRect(cx - bw / 2, y + 34, bw * Math.max(0, p.alt), 8);
    }
  }

  // Sul telefono: quale slot della barra è stato toccato (-1 = piccone)
  hitSlot(x, y) {
    for (const r of this.slotRects || []) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.slot;
    }
    return null;
  }

  vignettes(ctx, W, H) {
    const g = this.game;
    if (g.hurtFlash > 0) {
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(255,0,0,0)');
      grad.addColorStop(1, `rgba(220,20,20,${g.hurtFlash})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    if (g.player.alive && !g.storm.contains(g.player.x, g.player.y)) {
      ctx.fillStyle = 'rgba(120,40,200,0.18)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  bar(ctx, x, y, w, h, frac, color, label) {
    panel(ctx, x - 2, y - 2, w + 4, h + 4, 4, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h / 2);
    text(ctx, label, x + w - 6, y + h - 3, { align: 'right', size: h - 2, weight: 800 });
  }

  drawBars(ctx, x, yBottom, w) {
    const p = this.game.player;
    const hh = this.touch ? 14 : 20;
    const sh = this.touch ? 10 : 14;
    this.bar(ctx, x, yBottom - hh, w, hh, p.hp / CONFIG.MAX_HP, '#4fcf55', Math.ceil(p.hp));
    this.bar(ctx, x, yBottom - hh - sh - 6, w, sh, p.shield / CONFIG.MAX_SHIELD, '#3fa9ff', Math.ceil(p.shield));
    if (!this.touch) text(ctx, 'VITA', x, yBottom - hh - sh - 12, { size: 11, color: '#cfd8e0', weight: 800 });
  }

  drawHotbar(ctx, cx, yBottom, box) {
    const p = this.game.player;
    const gap = box > 50 ? 6 : 5;
    const total = 6 * box + 5 * gap;
    const x0 = cx - total / 2;
    const y0 = yBottom - box;
    const keys = ['F', '1', '2', '3', '4', '5'];

    for (let i = 0; i < 6; i++) {
      const slot = i - 1;
      const item = slot < 0 ? { kind: 'pickaxe', def: p.pickaxe } : p.slots[slot];
      const sel = p.active === slot;
      const x = x0 + i * (box + gap);
      const y = y0 - (sel ? 8 : 0);
      this.slotRects.push({ x, y: y0 - 8, w: box, h: box + 8, slot });
      const color = item && item.kind !== 'pickaxe' ? pickupColor(item) : '#6b7480';
      const grad = ctx.createLinearGradient(0, y, 0, y + box);
      grad.addColorStop(0, item ? color + 'cc' : 'rgba(20,24,30,0.6)');
      grad.addColorStop(1, 'rgba(15,18,24,0.85)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, box, box, 6);
      else ctx.rect(x, y, box, box);
      ctx.fill();
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = sel ? 3 : 1.5;
      ctx.stroke();

      if (item) {
        ctx.save();
        ctx.translate(x + box / 2, y + box / 2 + 2);
        drawItemIcon(ctx, item, box * 0.75);
        ctx.restore();
        if (item.kind === 'weapon') text(ctx, String(item.mag), x + box - 5, y + box - 5, { align: 'right', size: 13, weight: 800 });
        if (item.kind === 'item') text(ctx, 'x' + item.count, x + box - 5, y + box - 5, { align: 'right', size: 13, weight: 800 });
      }
      if (!this.touch) text(ctx, keys[i], x + 5, y + 14, { size: 11, color: '#e6eef5', weight: 800 });
    }

    // Nome e munizioni dell'oggetto in mano
    const cur = p.current;
    let label = 'Piccone';
    let color = '#e6eef5';
    if (cur && cur.kind === 'weapon') {
      const w = WEAPONS[cur.id];
      label = `${w.name}  ${cur.mag} / ${p.ammo[w.ammo]}`;
      color = RARITIES[cur.rarity].color;
    } else if (cur && cur.kind === 'item') {
      label = `${ITEMS[cur.id].name} x${cur.count}  ·  ${this.touch ? 'SPARA' : 'click'} per usare`;
      color = ITEMS[cur.id].color;
    }
    // sul telefono la barra è in alto: le scritte vanno sotto
    const ly = this.touch ? y0 + box + 18 : y0 - 18;
    text(ctx, label, cx, ly, { align: 'center', size: this.touch ? 13 : 15, color, weight: 800 });
    if (p.reloadT > 0) {
      const w = 160;
      const k = 1 - p.reloadT / p.reloadTotal;
      const ry = this.touch ? ly + 8 : y0 - 46;
      panel(ctx, cx - w / 2, ry, w, 8, 4, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(cx - w / 2, ry, w * k, 8);
      text(ctx, 'Ricarica...', cx, this.touch ? ry + 22 : y0 - 52, { align: 'center', size: 12 });
    }
  }

  drawResources(ctx, xRight, yBottom) {
    const p = this.game.player;
    const lines = [
      ...(this.game.mode.build ? [{ data: { kind: 'mats' }, label: `${p.mats}`, color: '#f0c890' }] : []),
      ...Object.keys(AMMO).map((id) => ({ data: { kind: 'ammo', id }, label: `${p.ammo[id]}`, color: AMMO[id].color, name: AMMO[id].short })),
    ];
    const h = 24;
    panel(ctx, xRight - 132, yBottom - lines.length * h - 10, 132, lines.length * h + 10, 8);
    lines.forEach((l, i) => {
      const y = yBottom - (lines.length - i) * h;
      ctx.save();
      ctx.translate(xRight - 116, y + 8);
      drawItemIcon(ctx, l.data, 22);
      ctx.restore();
      text(ctx, l.name || 'Materiali', xRight - 100, y + 13, { size: 12, color: '#cfd8e0', stroke: false });
      text(ctx, l.label, xRight - 10, y + 13, { size: 14, color: l.color, align: 'right', weight: 800, stroke: false });
    });
  }

  drawMap(ctx, x, y, size, big) {
    const g = this.game;
    const map = g.map;
    const s = size / map.width;
    ctx.save();
    panel(ctx, x - 4, y - 4, size + 8, size + 8, 6, 'rgba(0,0,0,0.6)');
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(map.minimap, x, y, size, size);

    const st = g.storm;
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.arc(x + st.cur.x * s, y + st.cur.y * s, Math.max(0.5, st.cur.r * s), 0, TAU, true);
    ctx.fillStyle = 'rgba(120,40,210,0.45)';
    ctx.fill();
    ctx.strokeStyle = '#d8b4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + st.cur.x * s, y + st.cur.y * s, Math.max(0.5, st.cur.r * s), 0, TAU);
    ctx.stroke();
    if (st.to) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + st.to.x * s, y + st.to.y * s, Math.max(0.5, st.to.r * s), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (g.bus.active) {
      const b = g.bus;
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = big ? 3 : 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(x + b.x0 * s, y + b.y0 * s);
      ctx.lineTo(x + b.x1 * s, y + b.y1 * s);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#1fa59a';
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + b.x * s, y + b.y * s, big ? 8 : 5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    if (big) {
      for (const poi of map.pois) {
        text(ctx, poi.name, x + poi.x * s, y + poi.y * s, { align: 'center', size: 13, weight: 800 });
      }
      for (const isl of map.islands) {
        ctx.fillStyle = '#c77dff';
        ctx.beginPath();
        ctx.arc(x + isl.x * s, y + isl.y * s, 4, 0, TAU);
        ctx.fill();
      }
    }

    // Linea verso la zona sicura e freccia del giocatore
    const p = g.player;
    if (p.alive) {
      const px = x + p.x * s;
      const py = y + p.y * s;
      const safe = st.safeTarget();
      if (!st.contains(p.x, p.y, 0) || (st.to && Math.hypot(p.x - st.to.x, p.y - st.to.y) > st.to.r)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x + safe.x * s, y + safe.y * s);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.angle);
      const a = big ? 10 : 7;
      ctx.fillStyle = '#ffd34d';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a, 0);
      ctx.lineTo(-a * 0.7, -a * 0.6);
      ctx.lineTo(-a * 0.4, 0);
      ctx.lineTo(-a * 0.7, a * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);
  }

  drawInfo(ctx, xRight, y) {
    const g = this.game;
    const sz = this.touch ? 12 : 15;
    text(ctx, `Vivi: ${g.aliveCount}    Eliminazioni: ${g.player.kills}`, xRight, y, { align: 'right', size: sz, weight: 800 });
    const st = g.storm;
    const zone = Math.min(st.phase + 1, PHASES.length);
    let t;
    let color = '#e6eef5';
    if (st.state === 'wait') t = `Zona ${zone}/${PHASES.length} · si restringe tra ${fmt(st.timer)}`;
    else if (st.state === 'shrink') {
      t = `Zona ${zone}/${PHASES.length} · la tempesta avanza! ${fmt(st.timer)}`;
      color = '#d8a6ff';
    } else {
      t = 'Zona finale!';
      color = '#d8a6ff';
    }
    text(ctx, t, xRight, y + sz + 6, { align: 'right', size: sz - 2, color });
    text(ctx, `Danno tempesta: ${st.dps}/s`, xRight, y + (sz + 6) * 2 - 2, { align: 'right', size: sz - 2, color: '#d8a6ff' });
    let yy = y + (sz + 6) * 3 - 4;
    if (g.player.alive && !st.contains(g.player.x, g.player.y)) {
      text(ctx, 'Sei nella tempesta!', xRight, yy, { align: 'right', size: sz - 2, color: '#ff8a8a', weight: 800 });
      yy += sz + 4;
    }
    if (!this.touch) text(ctx, modeName(g.mode), xRight, yy, { align: 'right', size: 12, color: g.mode.ranked ? '#ffd34d' : '#9fb0c2' });
  }

  // Telefono: info brevi a sinistra della minimappa (sotto ci sono i pulsanti)
  drawInfoCompact(ctx, xRight, y) {
    const g = this.game;
    const st = g.storm;
    const zone = Math.min(st.phase + 1, PHASES.length);
    const time = st.state === 'final' ? 'finale' : (st.state === 'shrink' ? 'avanza ' : '') + fmt(st.timer);
    text(ctx, `Vivi ${g.aliveCount} · Elim. ${g.player.kills}`, xRight, y, { align: 'right', size: 12, weight: 800 });
    text(ctx, `Zona ${zone}/${PHASES.length} · ${time}`, xRight, y + 17, { align: 'right', size: 11, color: st.state === 'wait' ? '#e6eef5' : '#d8a6ff' });
    const out = g.player.alive && !st.contains(g.player.x, g.player.y);
    text(ctx, out ? `Nella tempesta! -${st.dps}/s` : `Tempesta ${st.dps}/s`, xRight, y + 33, { align: 'right', size: 11, color: out ? '#ff8a8a' : '#d8a6ff', weight: out ? 800 : 600 });
  }

  drawKillFeed(ctx, x, y) {
    const g = this.game;
    g.killFeed.forEach((k, i) => {
      ctx.globalAlpha = Math.min(1, k.t);
      ctx.font = `600 13px ${FONT}`;
      const w = ctx.measureText(k.text).width + 16;
      panel(ctx, x, y + i * 26, w, 22, 4, k.me ? 'rgba(120,80,0,0.7)' : 'rgba(0,0,0,0.5)');
      text(ctx, k.text, x + 8, y + i * 26 + 15, { size: 13, color: k.me ? '#ffd34d' : '#f2f2f2', stroke: false });
    });
    ctx.globalAlpha = 1;
  }

  drawPrompt(ctx, cx, y) {
    const g = this.game;
    const p = g.player;
    let label = null;
    let color = '#ffffff';
    if (p.nearChest) label = '[E] Tieni premuto per aprire la cassa';
    else {
      const pk = g.nearestPickup(p, CONFIG.INTERACT_RANGE, true);
      if (pk) {
        label = '[E] Raccogli: ' + itemLabel(pk.data);
        color = pickupColor(pk.data);
      }
    }
    if (!label) return;
    if (this.touch) label = label.replace('[E] Tieni premuto per aprire', 'Tieni premuto USA per aprire').replace('[E] ', 'USA: ');
    ctx.font = `700 15px ${FONT}`;
    const w = ctx.measureText(label).width + 28;
    panel(ctx, cx - w / 2, y - 20, w, 30, 6, 'rgba(0,0,0,0.65)');
    text(ctx, label, cx, y, { align: 'center', size: 15, color, weight: 700, stroke: false });
  }

  drawChannel(ctx, cx, y) {
    const p = this.game.player;
    if (!p.channel) return;
    const k = Math.min(1, p.channel.t / p.channel.total);
    const label = p.channel.kind === 'open' ? 'Apertura cassa' : `Uso: ${ITEMS[p.channel.id].name}`;
    const w = 220;
    panel(ctx, cx - w / 2 - 4, y - 4, w + 8, 18, 6, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = p.channel.kind === 'open' ? '#ffd34d' : '#5fdc8f';
    ctx.fillRect(cx - w / 2, y, w * k, 10);
    text(ctx, `${label}  ${Math.max(0, p.channel.total - p.channel.t).toFixed(1)}s`, cx, y - 10, { align: 'center', size: 14, weight: 800 });
  }

  drawBuildBanner(ctx, cx, y) {
    const g = this.game;
    const p = g.player;
    const cur = g.playerCtl.piece;
    const parts = Object.entries(PIECES).map(([id, pc]) => ({ id, label: this.touch ? pc.name : `[${pc.key}] ${pc.name}` }));
    const tail = this.touch ? `MOD: modifica · mat ${p.mats}` : `[G] Modifica · materiali ${p.mats} · [Q] esci`;
    ctx.font = `800 14px ${FONT}`;
    const widths = parts.map((q) => ctx.measureText(q.label).width + 18);
    const tailW = ctx.measureText(tail).width + 20;
    const total = widths.reduce((a, b) => a + b, 0) + tailW + 20;
    let x = cx - total / 2;
    panel(ctx, x, y - 18, total, 28, 6, 'rgba(30,90,160,0.8)');
    x += 10;
    parts.forEach((q, i) => {
      if (q.id === cur) panel(ctx, x - 2, y - 15, widths[i] - 4, 22, 4, 'rgba(255,211,77,0.9)');
      text(ctx, q.label, x + widths[i] / 2 - 3, y + 1, { align: 'center', size: 14, weight: 800, stroke: false, color: q.id === cur ? '#241800' : '#fff' });
      x += widths[i];
    });
    text(ctx, tail, x + tailW / 2, y + 1, { align: 'center', size: 13, weight: 700, stroke: false });
  }

  drawMessage(ctx, cx, y) {
    const m = this.game.message;
    if (!m) return;
    ctx.globalAlpha = Math.min(1, m.t * 2);
    text(ctx, m.text, cx, y, { align: 'center', size: m.text === 'VITTORIA!' ? 54 : 22, color: m.color, weight: 900 });
    ctx.globalAlpha = 1;
  }

  drawCrosshair(ctx) {
    const g = this.game;
    const { x, y } = g.input.mouse;
    const p = g.player;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    if (g.playerCtl.buildMode) {
      ctx.strokeRect(x - 7, y - 7, 14, 14);
      return;
    }
    const w = p.weapon;
    if (!w) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.stroke();
      return;
    }
    const moving = Math.hypot(p.intent.mx, p.intent.my) > 0.1;
    const gap = 5 + w.spread * 160 * (moving ? 1.4 : 1);
    ctx.beginPath();
    ctx.moveTo(x - gap - 8, y); ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + 8, y);
    ctx.moveTo(x, y - gap - 8); ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + 8);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}
