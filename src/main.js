import { Input } from './input.js';
import { Camera } from './camera.js';
import { GameMap } from './world/map.js';
import { Player } from './entities/player.js';
import { Target } from './entities/target.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = new Input(canvas);
const camera = new Camera();
const map = new GameMap();
const player = new Player(map.spawn.x, map.spawn.y);
const bullets = [];
const impacts = []; // piccoli effetti dove i proiettili colpiscono
const targets = [];
const stats = { shots: 0, hits: 0, fps: 0 };

// Qualche manichino attorno allo spawn
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  targets.push(new Target(map.spawn.x + Math.cos(a) * 260, map.spawn.y + Math.sin(a) * 260));
}

camera.x = player.x;
camera.y = player.y;

// Canvas nitido anche su schermi ad alta densità
function resize() {
  const dpr = window.devicePixelRatio || 1;
  camera.width = window.innerWidth;
  camera.height = window.innerHeight;
  canvas.width = Math.floor(camera.width * dpr);
  canvas.height = Math.floor(camera.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---------------- Logica ----------------
function update(dt) {
  const before = bullets.length;
  player.update(dt, input, camera, map, bullets);
  stats.shots += bullets.length - before;

  for (const t of targets) t.update(dt);

  for (const b of bullets) {
    const impact = b.update(dt, map, targets);
    if (impact) {
      impacts.push({ ...impact, life: 0.18 });
      if (impact.kind === 'hit') stats.hits++;
    }
  }
  removeDead(bullets, (b) => b.dead);

  for (const fx of impacts) fx.life -= dt;
  removeDead(impacts, (fx) => fx.life <= 0);

  camera.follow(player, dt, map.width, map.height);
}

function removeDead(list, isDead) {
  for (let i = list.length - 1; i >= 0; i--) if (isDead(list[i])) list.splice(i, 1);
}

// ---------------- Disegno ----------------
function render(dt) {
  ctx.fillStyle = '#1d2b1f';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const view = camera.viewRect(80);

  ctx.save();
  camera.apply(ctx);

  map.drawGround(ctx, view);
  map.drawObstacles(ctx, view);
  for (const t of targets) t.draw(ctx);
  player.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  drawImpacts();
  map.drawCanopies(ctx, view, player, dt);

  ctx.restore();

  drawHud();
  drawCrosshair();
}

function drawImpacts() {
  for (const fx of impacts) {
    const k = fx.life / 0.18;
    ctx.fillStyle = fx.kind === 'hit' ? `rgba(255,80,60,${k})` : `rgba(230,230,210,${k})`;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 3 + (1 - k) * 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud() {
  const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 10, 190, 64);
  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui, Arial, sans-serif';
  ctx.fillText(`Colpi sparati: ${stats.shots}`, 20, 30);
  ctx.fillText(`Bersagli colpiti: ${stats.hits} (${acc}%)`, 20, 48);
  ctx.fillText(`FPS: ${stats.fps}`, 20, 66);
}

function drawCrosshair() {
  const { x, y } = input.mouse;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y); ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 16);
  ctx.stroke();
}

// ---------------- Game loop ----------------
let last = performance.now();
let fpsTimer = 0;
let frames = 0;

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // limite per evitare salti dopo una pausa
  last = now;

  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    stats.fps = Math.round(frames / fpsTimer);
    frames = 0;
    fpsTimer = 0;
  }

  update(dt);
  render(dt);
  requestAnimationFrame(loop);
}

// Per i test automatici e il debug dalla console
window.__game = { player, map, bullets, targets, stats, camera };

requestAnimationFrame(loop);
