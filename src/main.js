import { Input } from './input.js';
import { Game } from './game.js';
import { Lobby } from './ui/lobby.js';
import { TouchControls } from './ui/touch.js';
import { loadSave, storeSave, modeKey, modeName } from './save.js';
import { rankFromRP, matchRP, rankBadgeSVG } from './data/ranks.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const save = loadSave();
const endEl = document.getElementById('end');
const pauseEl = document.getElementById('pause');
let game = null;
let dpr = 1;

// Telefono o tablet? (si può forzare con ?touch=1 nell'indirizzo)
const forceTouch = new URLSearchParams(location.search).get('touch') === '1';
input.touch.enabled = forceTouch || window.matchMedia('(pointer: coarse)').matches;
document.body.classList.toggle('touch', input.touch.enabled);

const touchUi = new TouchControls(document.getElementById('touch'), input, { onPause: () => togglePause() });
input.onTap = (x, y) => {
  if (!game || !input.touch.enabled) return;
  const slot = game.hud.hitSlot(x, y);
  if (slot !== null) input.touch.slot = slot;
};

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

const lobby = new Lobby(document.getElementById('lobby'), save, startMatch);
lobby.show();

function startMatch() {
  lobby.hide();
  endEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  const mode = { ...save.mode };
  game = new Game({ ctx, input, skinId: save.selected, onEnd: matchEnded, mode, rankRP: save.rp[modeKey(mode)] });
  canvas.classList.add('playing');
  document.body.classList.add('in-game');
  if (input.touch.enabled) {
    touchUi.setBuildVisible(mode.build);
    touchUi.show();
    // a schermo intero e in orizzontale, se il telefono lo permette
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      }
    } catch (e) {
      // non supportato: pazienza
    }
  }
}

function matchEnded(result) {
  save.matches++;
  save.kills += result.kills;
  if (result.win) {
    save.wins++;
    save.coins += result.coins;
  }

  // Punti rank nelle classificate
  let rankHtml = '';
  if (result.mode.ranked) {
    const key = modeKey(result.mode);
    const before = save.rp[key];
    const calc = matchRP({ place: result.place, kills: result.kills, rp: before });
    const after = Math.max(0, before + calc.delta);
    save.rp[key] = after;
    const r0 = rankFromRP(before);
    const r1 = rankFromRP(after);
    const change = r1.index > r0.index ? `<p class="promo up">PROMOSSO A ${r1.name.toUpperCase()}!</p>`
      : r1.index < r0.index ? `<p class="promo down">Retrocesso a ${r1.name}</p>` : '';
    const sign = (n) => (n >= 0 ? '+' : '') + n;
    rankHtml = `
      <div class="end-rank">
        ${rankBadgeSVG(r1, 64)}
        <div>
          <div class="rank-name" style="color:${r1.tier.light}">${r1.name}</div>
          <div class="rp-delta ${calc.delta >= 0 ? 'pos' : 'neg'}">${sign(after - before)} RP <small>(${after} RP)</small></div>
          <div class="rp-detail">Posizione ${sign(calc.placePts)} · Eliminazioni ${sign(calc.killPts)} · Ingresso -${calc.cost}</div>
        </div>
      </div>${change}`;
  }
  storeSave(save);
  pauseEl.classList.add('hidden');
  touchUi.hide();

  endEl.innerHTML = `
    <div class="end-card ${result.win ? 'win' : 'lose'}">
      <h1>${result.win ? 'VITTORIA!' : 'ELIMINATO'}</h1>
      <p class="mode-label">${modeName(result.mode)}</p>
      <p class="place">#${result.place} su ${result.total}</p>
      ${result.killer ? `<p>Eliminato da <b>${result.killer}</b></p>` : ''}
      <p>Eliminazioni: <b>${result.kills}</b></p>
      ${rankHtml}
      <p class="reward">${result.win ? `<span class="coin"></span> +${result.coins} monete` : 'Vinci la partita per guadagnare 100 monete'}</p>
      <p class="total">Monete totali: <b>${save.coins.toLocaleString('it-IT')}</b></p>
      <div class="end-buttons">
        <button data-again>Gioca ancora</button>
        <button data-lobby class="secondary">Torna alla lobby</button>
      </div>
    </div>`;
  endEl.classList.remove('hidden');
  endEl.querySelector('[data-lobby]').addEventListener('click', backToLobby);
  endEl.querySelector('[data-again]').addEventListener('click', startMatch);
}

function backToLobby() {
  game = null;
  endEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  canvas.classList.remove('playing');
  document.body.classList.remove('in-game');
  touchUi.hide();
  lobby.show();
}

function togglePause() {
  if (!game || game.over) return;
  game.paused = !game.paused;
  pauseEl.classList.toggle('hidden', !game.paused);
  canvas.classList.toggle('playing', !game.paused);
  if (input.touch.enabled) {
    if (game.paused) touchUi.hide();
    else touchUi.show();
  }
}
pauseEl.querySelector('[data-resume]').addEventListener('click', togglePause);
pauseEl.querySelector('[data-quit]').addEventListener('click', () => {
  if (game && !game.over) game.abandon();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game) {
    if (input.wasPressed('Escape')) togglePause();
    game.camera.width = window.innerWidth;
    game.camera.height = window.innerHeight;
    if (!game.paused) game.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.render(game.paused ? 0 : dt);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Accesso per il debug dalla console del browser
window.__app = {
  get game() {
    return game;
  },
  save,
  startMatch,
  lobby,
  input,
};
