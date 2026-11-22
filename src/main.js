import { Input } from './input.js';
import { Game } from './game.js';
import { Lobby } from './ui/lobby.js';
import { loadSave, storeSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const save = loadSave();
const endEl = document.getElementById('end');
const pauseEl = document.getElementById('pause');
let game = null;
let dpr = 1;

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
  game = new Game({ ctx, input, skinId: save.selected, onEnd: matchEnded });
  canvas.classList.add('playing');
}

function matchEnded(result) {
  save.matches++;
  save.kills += result.kills;
  if (result.win) {
    save.wins++;
    save.coins += result.coins;
  }
  storeSave(save);
  pauseEl.classList.add('hidden');

  endEl.innerHTML = `
    <div class="end-card ${result.win ? 'win' : 'lose'}">
      <h1>${result.win ? 'VITTORIA!' : 'ELIMINATO'}</h1>
      <p class="place">#${result.place} su ${result.total}</p>
      ${result.killer ? `<p>Eliminato da <b>${result.killer}</b></p>` : ''}
      <p>Eliminazioni: <b>${result.kills}</b></p>
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
  lobby.show();
}

function togglePause() {
  if (!game || game.over) return;
  game.paused = !game.paused;
  pauseEl.classList.toggle('hidden', !game.paused);
  canvas.classList.toggle('playing', !game.paused);
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
};
