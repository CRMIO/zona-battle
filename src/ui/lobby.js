// Lobby: anteprima del personaggio, armadietto (skin possedute) e negozio (skin da comprare).
import { SKINS, TIER_INFO, getSkin, rankSkinIndex } from '../data/skins.js';
import { drawCharacter } from '../render/art.js';
import { storeSave, modeKey } from '../save.js';
import { TIERS, DIVISIONS, RP_PER_DIV, CHAMPION_RP, rankFromRP, nextRankName, rankBadgeSVG, allRanks } from '../data/ranks.js';

export class Lobby {
  constructor(root, save, onPlay) {
    this.root = root;
    this.save = save;
    this.onPlay = onPlay;
    this.tab = 'locker';
    this.preview = save.selected; // skin mostrata in grande (anche da provare nel negozio)
    this.visible = false;
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
            </div>
            <p class="panel-note" data-note></p>
            <div class="grid" data-grid></div>
          </section>
        </main>
        <footer class="controls">
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
        this.preview = this.save.selected;
        this.render();
      })
    );
  }

  show() {
    this.visible = true;
    this.preview = this.save.selected;
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

  buy(skin) {
    if (this.save.owned.includes(skin.id) || skin.tier === 'rank') return;
    if (this.save.coins < skin.price) {
      this.toast(`Ti mancano ${skin.price - this.save.coins} monete`);
      return;
    }
    this.save.coins -= skin.price;
    this.save.owned.push(skin.id);
    this.save.selected = skin.id;
    this.preview = skin.id;
    storeSave(this.save);
    this.toast(`${skin.name} è tua! Equipaggiata.`);
    this.render();
  }

  equip(skin) {
    this.save.selected = skin.id;
    this.preview = skin.id;
    storeSave(this.save);
    this.render();
  }

  render() {
    const s = this.save;
    this.root.querySelector('[data-coins]').textContent = s.coins.toLocaleString('it-IT');
    for (const el of this.root.querySelectorAll('[data-stat]')) el.textContent = s[el.dataset.stat];
    for (const b of this.root.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === this.tab);

    const skin = getSkin(this.preview);
    const owned = s.owned.includes(skin.id);
    this.root.querySelector('[data-name]').textContent = skin.name;
    const tier = this.root.querySelector('[data-tier]');
    tier.textContent = TIER_INFO[skin.tier].name;
    tier.style.background = TIER_INFO[skin.tier].color;

    const action = this.root.querySelector('[data-action]');
    action.innerHTML = '';
    if (!owned && skin.tier === 'rank') {
      const need = rankFromRP(rankSkinIndex(skin) * RP_PER_DIV).name;
      action.innerHTML = `<div class="missing locked">🔒 Gratis: si sblocca raggiungendo <b>${need}</b> in una classificata</div>`;
    } else if (!owned) {
      const btn = document.createElement('button');
      btn.className = 'buy';
      btn.innerHTML = `Compra · <span class="coin small"></span> ${skin.price.toLocaleString('it-IT')}`;
      btn.disabled = s.coins < skin.price;
      btn.addEventListener('click', () => this.buy(skin));
      action.appendChild(btn);
      if (s.coins < skin.price) {
        const p = document.createElement('div');
        p.className = 'missing';
        p.textContent = `Ti mancano ${(skin.price - s.coins).toLocaleString('it-IT')} monete (${Math.ceil((skin.price - s.coins) / 100)} vittorie)`;
        action.appendChild(p);
      }
    } else if (s.selected === skin.id) {
      action.innerHTML = '<div class="equipped">✓ Equipaggiata</div>';
    }

    this.renderModes();
    const grid = this.root.querySelector('[data-grid]');
    if (this.tab === 'ranks') {
      this.renderRanks(grid);
      return;
    }
    grid.classList.remove('ranks');

    const list = this.tab === 'locker' ? SKINS.filter((k) => s.owned.includes(k.id)) : SKINS.filter((k) => !s.owned.includes(k.id));
    this.root.querySelector('[data-note]').textContent =
      this.tab === 'locker'
        ? 'Scegli la skin da usare in partita.'
        : list.length
          ? 'Skin base 1000 monete · Skin premium 3000 monete. Clicca per provarle.'
          : 'Hai già tutte le skin. Complimenti!';

    grid.innerHTML = '';
    for (const k of list) {
      const card = document.createElement('button');
      card.className = `card tier-${k.tier}` + (k.id === this.preview ? ' active' : '') + (k.id === s.selected ? ' selected' : '');
      const cv = document.createElement('canvas');
      cv.width = cv.height = 120;
      card.appendChild(cv);
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = k.name;
      card.appendChild(name);
      const foot = document.createElement('div');
      foot.className = 'card-foot';
      if (this.tab === 'shop' && k.tier === 'rank') {
        foot.textContent = '🔒 ' + rankFromRP(rankSkinIndex(k) * RP_PER_DIV).name;
        foot.classList.add('poor');
      } else if (this.tab === 'shop') {
        foot.innerHTML = `<span class="coin small"></span> ${k.price.toLocaleString('it-IT')}`;
        if (s.coins < k.price) foot.classList.add('poor');
      } else {
        foot.textContent = k.id === s.selected ? 'Equipaggiata' : 'Equipaggia';
      }
      card.appendChild(foot);
      card.addEventListener('click', () => {
        if (this.tab === 'locker') this.equip(k);
        else {
          this.preview = k.id;
          this.render();
        }
      });
      grid.appendChild(card);
      this.drawCard(cv, k);
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
          this.preview = reward.id;
          if (got) this.equip(reward);
          else this.render();
        });
        row.appendChild(cell);
        this.drawCard(cv, reward);
      }
      grid.appendChild(row);
    });
  }

  drawCard(cv, skin) {
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(60, 62);
    ctx.scale(2, 2);
    drawCharacter(ctx, skin, { angle: -Math.PI / 2, item: { kind: 'weapon', id: 'rifle', rarity: 'rare' }, t: 0 });
    ctx.restore();
  }

  drawPreview(t) {
    const cv = this.canvas;
    const ctx = cv.getContext('2d');
    const skin = getSkin(this.preview);
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
    ctx.translate(180, 190);
    ctx.scale(4.2, 4.2);
    const angle = -Math.PI / 2 + Math.sin(t * 0.8) * 0.9;
    const items = [
      { kind: 'weapon', id: 'rifle', rarity: 'legendary' },
      { kind: 'weapon', id: 'shotgun', rarity: 'epic' },
      null,
    ];
    const item = items[Math.floor(t / 3) % items.length];
    const swing = item ? 0 : (t * 2) % 1;
    drawCharacter(ctx, skin, { angle, walk: t * 6, item, swing, t });
    ctx.restore();
  }
}
