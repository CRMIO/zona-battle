// Comandi per telefono e tablet.
//   In basso a sinistra: joystick per muoversi (compare dove appoggi il dito).
//   In basso a destra: il pulsante rotondo con il proiettile per sparare.
//     Premuto e basta → mira da solo al nemico più vicino; trascinato → spari nella direzione in cui lo trascini.
//   Intorno, piccoli e rotondi: ricarica, costruisci, pezzo, modifica, usa, piccone.
// I pulsanti "premono" gli stessi tasti della tastiera, così il resto del gioco non cambia.

import { PIECE_ORDER } from '../entities/player.js';

const STICK_R = 56;
const FIRE_DRAG = 14; // oltre questi pixel il pulsante di fuoco diventa anche mira

const ICONS = {
  bullet: `<svg viewBox="0 0 48 48"><path d="M24 4c5 5 7 11 7 17v14H17V21c0-6 2-12 7-17z" fill="#ffd34d" stroke="#7a5200" stroke-width="2.5"/>
    <rect x="15" y="35" width="18" height="9" rx="2" fill="#d9a514" stroke="#7a5200" stroke-width="2.5"/></svg>`,
  reload: `<svg viewBox="0 0 48 48"><path d="M36 18a14 14 0 1 0 2 12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <path d="M38 8v12H26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  build: `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="3" fill="#b57d46" stroke="#fff" stroke-width="3"/>
    <path d="M8 8l32 32M40 8L8 40" stroke="#5c3a1e" stroke-width="4"/></svg>`,
  piece: `<svg viewBox="0 0 48 48"><rect x="6" y="18" width="11" height="11" fill="#fff"/><rect x="19" y="18" width="11" height="11" fill="#fff" opacity=".7"/>
    <rect x="32" y="18" width="11" height="11" fill="#fff" opacity=".45"/></svg>`,
  edit: `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="3" fill="none" stroke="#fff" stroke-width="4"/>
    <rect x="17" y="17" width="14" height="14" fill="#9fd3ff"/></svg>`,
  pickaxe: `<svg viewBox="0 0 48 48"><path d="M14 38L32 16" stroke="#c08550" stroke-width="5" stroke-linecap="round"/>
    <path d="M18 10c8-3 17 0 22 8l-4 2c-4-5-10-7-16-6z" fill="#d0d8e0" stroke="#fff" stroke-width="1.5"/></svg>`,
};

export class TouchControls {
  constructor(root, input, { onPause }) {
    this.root = root;
    this.input = input;
    this.pieceIndex = 0;
    root.innerHTML = `
      <div class="t-zone t-left" data-stick="move"><div class="t-base"><div class="t-knob"></div></div></div>
      <div class="t-pad">
        <div class="t-fire" data-firestick><div class="t-fire-knob">${ICONS.bullet}</div></div>
        <button class="t-round" style="--a:180deg" data-tap="KeyR" aria-label="Ricarica">${ICONS.reload}</button>
        <button class="t-round t-label" style="--a:143deg" data-hold="KeyE">USA</button>
        <button class="t-round" style="--a:106deg" data-tap="KeyF" aria-label="Piccone">${ICONS.pickaxe}</button>
        <button class="t-round t-build" style="--a:69deg" data-tap="KeyQ" aria-label="Costruisci">${ICONS.build}</button>
        <button class="t-round t-build t-outer" style="--a:128deg" data-piece aria-label="Pezzo">${ICONS.piece}</button>
        <button class="t-round t-build t-outer" style="--a:98deg" data-tap="KeyG" aria-label="Modifica">${ICONS.edit}</button>
      </div>
      <div class="t-top">
        <button class="t-small" data-tap="KeyM">MAPPA</button>
        <button class="t-small" data-pause>II</button>
      </div>`;

    this.bindStick(root.querySelector('[data-stick]'));
    this.bindFire(root.querySelector('[data-firestick]'));

    for (const b of root.querySelectorAll('[data-tap]')) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.pressed.add(b.dataset.tap);
      });
    }
    for (const b of root.querySelectorAll('[data-hold]')) {
      const code = b.dataset.hold;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.pressed.add(code);
        input.keys.add(code);
      });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => input.keys.delete(code));
    }
    // PEZZO: cambia muro → barriera → bunker (ed entra in costruzione)
    root.querySelector('[data-piece]').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pieceIndex = (this.pieceIndex + 1) % PIECE_ORDER.length;
      input.pressed.add({ wall: 'KeyZ', barrier: 'KeyX', bunker: 'KeyC' }[PIECE_ORDER[this.pieceIndex]]);
    });
    root.querySelector('[data-pause]').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onPause();
    });
  }

  // Joystick di movimento: compare dove appoggi il dito
  bindStick(zone) {
    const base = zone.querySelector('.t-base');
    const knob = zone.querySelector('.t-knob');
    const t = this.input.touch;
    let id = null;
    let cx = 0;
    let cy = 0;

    const reset = () => {
      id = null;
      knob.style.transform = 'translate(-50%, -50%)';
      base.classList.remove('active');
      base.style.left = '';
      base.style.top = '';
      t.mx = 0;
      t.my = 0;
    };
    const move = (e) => {
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) {
        dx *= STICK_R / d;
        dy *= STICK_R / d;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      t.mx = d > 8 ? dx / STICK_R : 0;
      t.my = d > 8 ? dy / STICK_R : 0;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      zone.setPointerCapture(id);
      base.classList.add('active');
      const r = zone.getBoundingClientRect();
      base.style.left = e.clientX - r.left + 'px';
      base.style.top = e.clientY - r.top + 'px';
      cx = e.clientX;
      cy = e.clientY;
      move(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    for (const ev of ['pointerup', 'pointercancel']) {
      zone.addEventListener(ev, (e) => {
        if (e.pointerId === id) reset();
      });
    }
  }

  // Pulsante di fuoco: premuto spara, trascinato mira
  bindFire(btn) {
    const knob = btn.querySelector('.t-fire-knob');
    const t = this.input.touch;
    let id = null;
    let cx = 0;
    let cy = 0;
    const reset = () => {
      id = null;
      t.fire = false;
      t.aiming = false;
      btn.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
    };
    const move = (e) => {
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      const max = 34;
      const k = d > max ? max / d : 1;
      knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
      if (d > FIRE_DRAG) {
        t.aiming = true;
        t.aimAngle = Math.atan2(dy, dx);
      }
    };
    btn.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      btn.setPointerCapture(id);
      btn.classList.add('active');
      const r = btn.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      t.fire = true;
      t.firePressed = true;
      t.aiming = false;
    });
    btn.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) move(e);
    });
    for (const ev of ['pointerup', 'pointercancel']) {
      btn.addEventListener(ev, (e) => {
        if (e.pointerId === id) reset();
      });
    }
  }

  setBuildVisible(on) {
    this.root.classList.toggle('no-build', !on);
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    const t = this.input.touch;
    t.mx = t.my = 0;
    t.aiming = t.fire = false;
  }
}
