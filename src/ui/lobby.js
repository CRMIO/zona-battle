// Lobby: anteprima del personaggio, armadietto (oggetti posseduti), negozio, rank e armi.
// Armadietto e negozio hanno tre categorie: skin, deltaplani e picconi.
import { SKINS, TIER_INFO, SKIN_RARITIES, SKIN_RARITY_ORDER, getSkin, rankSkinIndex, rarityRank } from '../data/skins.js';
import { GLIDERS, PICKAXES, getGlider, getPickaxe } from '../data/cosmetics.js';
import { WEAPONS, RARITIES, RARITY_ORDER } from '../data/weapons.js';
import { AMMO } from '../data/items.js';
import { drawWeapon, drawCharacter, drawGlider, drawPickaxe } from '../render/art.js';
import { storeSave, modeKey } from '../save.js';
import { TIERS, RP_PER_DIV, rankFromRP, nextRankName, rankBadgeSVG, allRanks } from '../data/ranks.js';

// Le tre categorie di oggetti: dove stanno nel salvataggio e come si chiamano
const CATS = {
  skins: { label: 'Skin', one: 'skin', items: SKINS, owned: 'owned', sel: 'selected', get: getSkin },
  gliders: { label: 'Deltaplani', one: 'deltaplano', items: GLIDERS, owned: 'ownedGliders', sel: 'glider', get: getGlider },
  pickaxes: { label: 'Picconi', one: 'piccone', items: PICKAXES, owned: 'ownedPickaxes', sel: 'pickaxe', get: getPickaxe },
};

export class Lobby {
  constructor(root, save, onPlay) {
    this.root = root;
    this.save = save;
    this.onPlay = onPlay;
    this.tab = 'locker';
    this.cat = 'skins';
    this.preview = { cat: 'skins', id: save.selected }; // oggetto mostrato in grande (anche da provare)
    this.visible = false;
    this.filter = 'all';
    this.cardCache = new Map();
    this.build();
  }

  build() {
    this.root.innerHTML = `
      <div class="lobby">
        <header class="lobby-top">
          <div class="logo">ZONA<span>BATTLE</span></div>
          <div class="stats">
            <span>Vittorie <b data-stat="wins">0</b></span>
            <span>Partite <b data-stat="matches">0</b></span>
            <span>Eliminazioni <b data-stat="kills">0</b></span>
          </div>
          <div class="coins" title="Monete"><span class="coin"></span><b data-coins>0</b></div>
        </header>
        <main class="lobby-main">
          <section class="stage">
            <canvas class="preview" width="360" height="360"></canvas>
            <div class="skin-name" data-name></div>
            <div class="skin-tier" data-tier></div>
            <div class="stage-action" data-action></div>
            <div class="modes">
              <div class="seg" data-seg="build">
                <button data-v="1">Costruzioni</button><button data-v="0">Zero Costruzioni</button>
              </div>
              <div class="seg" data-seg="ranked">
                <button data-v="0">Non classificata</button><button data-v="1">Classificata</button>
              </div>
              <div class="rankbox" data-rankbox></div>
            </div>
            <button class="play" data-play>GIOCA</button>
            <p class="hint">Sii l'ultimo dei 100: ogni vittoria vale <b>100 monete</b>.</p>
          </section>
          <section class="panel">
            <div class="tabs">
              <button data-tab="locker">Armadietto</button>
              <button data-tab="shop">Negozio</button>
              <button data-tab="ranks">Rank</button>
              <button data-tab="weapons">Armi</button>
            </div>
            <div class="cats" data-cats></div>
            <div class="filters" data-filters></div>
            <p class="panel-note" data-note></p>
            <div class="grid" data-grid></div>
          </section>
        </main>
        <footer class="controls">
          <span><b>Spazio</b> lanciati dal bus / apri deltaplano</span>
          <span><b>WASD</b> muoviti</span><span><b>Shift</b> corri</span><span><b>Mouse</b> mira</span>
          <span><b>Click</b> spara / usa</span><span><b>R</b> ricarica</span><span><b>F</b> piccone</span>
          <span><b>1–5</b> inventario</span><span><b>Q</b> costruisci</span><span><b>Z X C</b> muro / barriera / bunker</span>
          <span><b>G</b> modifica</span><span><b>E</b> apri / raccogli</span>
          <span><b>M</b> mappa</span><span><b>Esc</b> pausa</span>
        </footer>
        <div class="toast" data-toast></div>
      </div>`;
    this.canvas = this.root.querySelector('.preview');
    this.root.querySelector('[data-play]').addEventListener('click', () => this.onPlay());
    for (const seg of this.root.querySelectorAll('[data-seg]')) {
      for (const b of seg.querySelectorAll('button')) {
        b.addEventListener('click', () => {
          this.save.mode[seg.dataset.seg] = b.dataset.v === '1';
          storeSave(this.save);
          this.render();
        });
      }
    }
    this.root.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.resetPreview();
        this.render();
      })
    );
  }

  // L'anteprima torna all'oggetto equipaggiato della categoria scelta
  resetPreview() {
    const c = CATS[this.cat];
    this.preview = { cat: this.cat, id: this.save[c.sel] };
  }

  show() {
    this.visible = true;
    this.resetPreview();
    this.root.classList.remove('hidden');
    this.render();
    const loop = (t) => {
      if (!this.visible) return;
      this.drawPreview(t / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  hide() {
    this.visible = false;
    this.root.classList.add('hidden');
  }

  toast(msg) {
    const el = this.root.querySelector('[data-toast]');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('show'), 1800);
  }

  buy(cat, item) {
    const c = CATS[cat];
    if (this.save[c.owned].includes(item.id) || item.tier === 'rank') return;
    if (this.save.coins < item.price) {
      this.toast(`Ti mancano ${item.price - this.save.coins} monete`);
      return;
    }
    this.save.coins -= item.price;
    this.save[c.owned].push(item.id);
    this.save[c.sel] = item.id;
    this.preview = { cat, id: item.id };
    storeSave(this.save);
    this.toast(`${item.name}: ${c.one === 'skin' ? 'è tua' : 'è tuo'}! Equipaggiato.`);
    this.render();
  }

  equip(cat, item) {
    this.save[CATS[cat].sel] = item.id;
    this.preview = { cat, id: item.id };
    storeSave(this.save);
    this.render();
  }

  render() {
    const s = this.save;
    this.root.querySelector('[data-coins]').textContent = s.coins.toLocaleString('it-IT');
    for (const el of this.root.querySelectorAll('[data-stat]')) el.textContent = s[el.dataset.stat];
    for (const b of this.root.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === this.tab);

    this.renderStage();
    this.renderModes();

    const grid = this.root.querySelector('[data-grid]');
    const cats = this.root.querySelector('[data-cats]');
    const filters = this.root.querySelector('[data-filters]');
    grid.classList.remove('ranks', 'weapons');
    if (this.tab === 'ranks' || this.tab === 'weapons') {
      cats.innerHTML = '';
      filters.innerHTML = '';
      if (this.tab === 'ranks') this.renderRanks(grid);
      else this.renderWeapons(grid);
      return;
    }

    // Categoria: skin, deltaplani, picconi
    cats.innerHTML = '';
    for (const [id, c] of Object.entries(CATS)) {
      const b = document.createElement('button');
      b.className = 'cat' + (this.cat === id ? ' active' : '');
      b.textContent = c.label;
      b.addEventListener('click', () => {
        this.cat = id;
        this.filter = 'all';
        this.resetPreview();
        this.render();
      });
      cats.appendChild(b);
    }
    const c = CATS[this.cat];

    // Filtro per rarità
    const opts = [['all', 'Tutte', '#9fb0c2']];
    if (this.tab === 'locker') opts.push(['free', 'Gratis', TIER_INFO.free.color]);
    for (const r of SKIN_RARITY_ORDER) opts.push([r, SKIN_RARITIES[r].name, SKIN_RARITIES[r].color]);
    if (this.cat === 'skins') opts.push(['rank', 'Premi rank', TIER_INFO.rank.color]);
    if (!opts.some((o) => o[0] === this.filter)) this.filter = 'all';
    filters.innerHTML = '';
    for (const [id, label, color] of opts) {
      const b = document.createElement('button');
      b.className = 'chip' + (this.filter === id ? ' active' : '');
      b.style.setProperty('--c', color);
      b.textContent = label;
      b.addEventListener('click', () => {
        this.filter = id;
        this.render();
      });
      filters.appendChild(b);
    }

    const owned = s[c.owned];
    const all = c.items.filter((k) => (this.tab === 'locker' ? owned.includes(k.id) : !owned.includes(k.id)));
    const list = all
      .filter((k) => this.filter === 'all' || k.tier === this.filter)
      .sort((a, b) => rarityRank(a) - rarityRank(b) || a.name.localeCompare(b.name, 'it'));
    const ownedCount = c.items.filter((k) => owned.includes(k.id)).length;
    this.root.querySelector('[data-note]').textContent =
      this.tab === 'locker'
        ? `Hai ${ownedCount} ${c.label.toLowerCase()} su ${c.items.length}. Clicca per equipaggiare.`
        : all.length
          ? `${all.length} ${c.label.toLowerCase()} da sbloccare · ` + SKIN_RARITY_ORDER.map((r) => `${SKIN_RARITIES[r].name} ${SKIN_RARITIES[r].price}`).join(' · ') + ' monete'
          : `Hai già tutti gli oggetti di questa categoria. Complimenti!`;

    grid.innerHTML = '';
    for (const k of list) {
      const card = document.createElement('button');
      const sel = s[c.sel] === k.id;
      card.className = `card tier-${k.tier}` + (this.preview.cat === this.cat && k.id === this.preview.id ? ' active' : '') + (sel ? ' selected' : '');
      card.style.setProperty('--c', TIER_INFO[k.tier].color);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 120;
      card.appendChild(cv);
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = k.name;
      card.appendChild(name);
      const rar = document.createElement('div');
      rar.className = 'card-rarity';
      rar.textContent = TIER_INFO[k.tier].name;
      card.appendChild(rar);
      const foot = document.createElement('div');
      foot.className = 'card-foot';
      if (this.tab === 'shop' && k.tier === 'rank') {
        foot.textContent = '🔒 ' + rankFromRP(rankSkinIndex(k) * RP_PER_DIV).name;
        foot.classList.add('poor');
      } else if (this.tab === 'shop') {
        foot.innerHTML = `<span class="coin small"></span> ${k.price.toLocaleString('it-IT')}`;
        if (s.coins < k.price) foot.classList.add('poor');
      } else {
        foot.textContent = sel ? 'Equipaggiato' : 'Equipaggia';
      }
      card.appendChild(foot);
      card.addEventListener('click', () => {
        if (this.tab === 'locker') this.equip(this.cat, k);
        else {
          this.preview = { cat: this.cat, id: k.id };
          this.render();
        }
      });
      grid.appendChild(card);
      this.drawCard(cv, this.cat, k);
    }
  }

  // Nome, rarità e pulsante compra/equipaggiato dell'oggetto in anteprima
  renderStage() {
    const s = this.save;
    const c = CATS[this.preview.cat];
    const item = c.get(this.preview.id);
    const owned = s[c.owned].includes(item.id);
    this.root.querySelector('[data-name]').textContent = item.name;
    const tier = this.root.querySelector('[data-tier]');
    tier.textContent = `${TIER_INFO[item.tier].name} · ${c.one}`;
    tier.style.background = TIER_INFO[item.tier].color;

    const action = this.root.querySelector('[data-action]');
    action.innerHTML = '';
    if (!owned && item.tier === 'rank') {
      const need = rankFromRP(rankSkinIndex(item) * RP_PER_DIV).name;
      action.innerHTML = `<div class="missing locked">🔒 Gratis: si sblocca raggiungendo <b>${need}</b> in una classificata</div>`;
    } else if (!owned) {
      const btn = document.createElement('button');
      btn.className = 'buy';
      btn.innerHTML = `Compra · <span class="coin small"></span> ${item.price.toLocaleString('it-IT')}`;
      btn.disabled = s.coins < item.price;
      btn.addEventListener('click', () => this.buy(this.preview.cat, item));
      action.appendChild(btn);
      if (s.coins < item.price) {
        const p = document.createElement('div');
        p.className = 'missing';
        p.textContent = `Ti mancano ${(item.price - s.coins).toLocaleString('it-IT')} monete (${Math.ceil((item.price - s.coins) / 100)} vittorie)`;
        action.appendChild(p);
      }
    } else if (s[c.sel] === item.id) {
      action.innerHTML = '<div class="equipped">✓ Equipaggiato</div>';
    } else {
      const btn = document.createElement('button');
      btn.className = 'buy';
      btn.textContent = 'Equipaggia';
      btn.addEventListener('click', () => this.equip(this.preview.cat, item));
      action.appendChild(btn);
    }
  }

  // Scheda Armi: ogni arma in tutte e 5 le rarità, con il danno
  renderWeapons(grid) {
    grid.classList.add('weapons');
    this.root.querySelector('[data-note]').textContent =
      'Le armi si trovano nelle casse e per terra. Più la rarità è alta, più fanno danno: le casse rare sulle isole danno spesso armi epiche e leggendarie.';
    grid.innerHTML = '';
    for (const id in WEAPONS) {
      const w = WEAPONS[id];
      const row = document.createElement('div');
      row.className = 'weapon-row';
      row.innerHTML = `<div class="weapon-info"><b>${w.name}</b>
        <span>${w.pellets > 1 ? w.pellets + ' pallini · ' : ''}${w.fireRate} colpi/s · caricatore ${w.mag}</span>
        <span>${AMMO[w.ammo].name} · ${w.auto ? 'automatica' : 'colpo singolo'}</span></div>`;
      for (const r of RARITY_ORDER) {
        const R = RARITIES[r];
        const cell = document.createElement('div');
        cell.className = 'weapon-cell';
        cell.style.setProperty('--c', R.color);
        const cv = document.createElement('canvas');
        cv.width = 160;
        cv.height = 64;
        const ctx = cv.getContext('2d');
        const len = { pistol: 24, smg: 40, rifle: 58, shotgun: 54, sniper: 75 }[id];
        ctx.translate(80, 34);
        ctx.scale(1.7, 1.7);
        drawWeapon(ctx, id, r, -len / 2 + (id === 'pistol' ? 2 : 10), 0);
        cell.appendChild(cv);
        const dmg = Math.round(w.damage * R.mult);
        const lab = document.createElement('div');
        lab.innerHTML = `<b>${R.name}</b><span>${w.pellets > 1 ? `${dmg}×${w.pellets}` : dmg} danno</span>`;
        cell.appendChild(lab);
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
  }

  renderModes() {
    const m = this.save.mode;
    for (const seg of this.root.querySelectorAll('[data-seg]')) {
      for (const b of seg.querySelectorAll('button')) b.classList.toggle('active', (b.dataset.v === '1') === m[seg.dataset.seg]);
    }
    const box = this.root.querySelector('[data-rankbox]');
    if (!m.ranked) {
      box.innerHTML = '<p class="rank-off">Partita libera: niente punti rank da vincere o perdere.</p>';
      return;
    }
    const rp = this.save.rp[modeKey(m)];
    const r = rankFromRP(rp);
    const next = nextRankName(r);
    box.innerHTML = `
      <div class="rank-row">${rankBadgeSVG(r, 58)}
        <div class="rank-info">
          <div class="rank-name" style="color:${r.tier.light}">${r.name}</div>
          <div class="rank-bar"><i style="width:${Math.round(r.progress * 100)}%;background:${r.tier.color}"></i></div>
          <div class="rank-sub">${rp} RP · ${next ? `${r.nextAt - rp} RP per ${next}` : 'Rank massimo!'}</div>
        </div>
      </div>
      <p class="rank-off">Nelle classificate i bot diventano più forti man mano che sali di rank.</p>`;
  }

  renderRanks(grid) {
    grid.classList.add('ranks');
    const key = modeKey(this.save.mode);
    const mine = rankFromRP(this.save.rp[key]);
    const best = (k) => rankFromRP(this.save.rp[k]).name;
    this.root.querySelector('[data-note]').innerHTML =
      `Il tuo rank: <b>${best('build')}</b> con costruzioni · <b>${best('zero')}</b> in Zero Costruzioni. ` +
      `Vittoria +70 RP, top 5 +45, top 10 +32, top 25 +20, top 50 +10, ogni eliminazione fino a +10; entrare in partita costa di più ai rank alti.`;
    grid.innerHTML = '';
    const ranks = allRanks();
    TIERS.forEach((tier, ti) => {
      const row = document.createElement('div');
      row.className = 'tier-row';
      const list = ranks.filter((r) => r.tierIndex === ti);
      row.innerHTML = `<div class="tier-name" style="color:${tier.light}">${tier.name}</div>` +
        list.map((r) => `<div class="tier-cell ${r.index === mine.index ? 'mine' : ''}" title="${r.name} · da ${r.floor} RP">${rankBadgeSVG(r, 46)}<span>${r.floor}</span></div>`).join('');
      // premio del rank: skin gratis
      const reward = SKINS.find((k) => k.tier === 'rank' && k.rank === ti);
      if (reward) {
        const got = this.save.owned.includes(reward.id);
        const cell = document.createElement('button');
        cell.className = 'tier-reward' + (got ? ' got' : '');
        cell.title = reward.name;
        const cv = document.createElement('canvas');
        cv.width = cv.height = 120;
        cell.appendChild(cv);
        const lab = document.createElement('span');
        lab.textContent = got ? reward.name : '🔒 ' + reward.name;
        cell.appendChild(lab);
        cell.addEventListener('click', () => {
          this.preview = { cat: 'skins', id: reward.id };
          if (got) this.equip('skins', reward);
          else this.render();
        });
        row.appendChild(cell);
        this.drawCard(cv, 'skins', reward);
      }
      grid.appendChild(row);
    });
  }

  // Le anteprime delle carte si disegnano una volta sola e poi si copiano (sono centinaia)
  drawCard(cv, cat, item) {
    const key = cat + ':' + item.id;
    let img = this.cardCache.get(key);
    if (!img) {
      img = document.createElement('canvas');
      img.width = img.height = 120;
      const c = img.getContext('2d');
      c.translate(60, 62);
      if (cat === 'skins') {
        c.scale(2, 2);
        drawCharacter(c, item, { angle: -Math.PI / 2, item: { kind: 'weapon', id: 'rifle', rarity: 'rare' }, t: 0 });
      } else if (cat === 'gliders') {
        c.scale(0.95, 0.95);
        c.rotate(-Math.PI / 2);
        drawGlider(c, item, 0);
      } else {
        c.rotate(-Math.PI / 4);
        c.scale(2.1, 2.1);
        c.translate(-22, 0);
        drawPickaxe(c, item);
      }
      this.cardCache.set(key, img);
    }
    cv.getContext('2d').drawImage(img, 0, 0);
  }

  drawPreview(t) {
    const cv = this.canvas;
    const ctx = cv.getContext('2d');
    const s = this.save;
    const cat = this.preview.cat;
    const skin = cat === 'skins' ? getSkin(this.preview.id) : getSkin(s.selected);
    const glider = cat === 'gliders' ? getGlider(this.preview.id) : getGlider(s.glider);
    const pickaxe = cat === 'pickaxes' ? getPickaxe(this.preview.id) : getPickaxe(s.pickaxe);
    ctx.clearRect(0, 0, cv.width, cv.height);
    // piedistallo
    const g = ctx.createRadialGradient(180, 200, 20, 180, 200, 160);
    g.addColorStop(0, 'rgba(120,180,255,0.35)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(180, 200, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(180, 200, 120, 120, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    if (cat === 'gliders') {
      // in volo con il deltaplano, che ondeggia
      const angle = -Math.PI / 2 + Math.sin(t * 0.9) * 0.35;
      ctx.translate(180, 185 + Math.sin(t * 1.7) * 6);
      ctx.scale(2.6, 2.6);
      drawCharacter(ctx, skin, { angle, item: null, pickaxe, t });
      ctx.rotate(angle);
      drawGlider(ctx, glider, t);
    } else {
      ctx.translate(180, 190);
      ctx.scale(4.2, 4.2);
      const angle = -Math.PI / 2 + Math.sin(t * 0.8) * 0.9;
      let item;
      if (cat === 'pickaxes') item = null;
      else {
        const items = [{ kind: 'weapon', id: 'rifle', rarity: 'legendary' }, { kind: 'weapon', id: 'shotgun', rarity: 'epic' }, null];
        item = items[Math.floor(t / 3) % items.length];
      }
      const swing = item ? 0 : (t * 1.6) % 1;
      drawCharacter(ctx, skin, { angle, walk: t * 6, item, swing, pickaxe, t });
    }
    ctx.restore();
  }
}
