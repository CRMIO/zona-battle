// Comandi per telefono e tablet: joystick sinistro per muoversi, joystick destro per mirare
// (spinto fino in fondo spara da solo) e pulsanti per le altre azioni.
// I pulsanti "premono" gli stessi tasti della tastiera, così il resto del gioco non cambia.

import { PIECE_ORDER } from '../entities/player.js';

const STICK_R = 56;

export class TouchControls {
  constructor(root, input, { onPause }) {
    this.root = root;
    this.input = input;
    this.pieceIndex = 0;
    root.innerHTML = `
      <div class="t-zone t-left" data-stick="move"><div class="t-base"><div class="t-knob"></div></div></div>
      <div class="t-zone t-right" data-stick="aim"><div class="t-base"><div class="t-knob"></div></div></div>
      <div class="t-buttons">
        <button class="t-btn t-fire" data-fire>SPARA</button>
        <button class="t-btn" data-hold="KeyE">USA</button>
        <button class="t-btn" data-tap="KeyR">RICARICA</button>
        <button class="t-btn" data-tap="KeyF">PICCONE</button>
        <button class="t-btn t-build" data-tap="KeyQ">COSTRUISCI</button>
        <button class="t-btn t-build" data-piece>PEZZO</button>
        <button class="t-btn t-build" data-tap="KeyG">MODIFICA</button>
      </div>
      <div class="t-top">
        <button class="t-small" data-tap="KeyM">MAPPA</button>
        <button class="t-small" data-pause>II</button>
      </div>`;

    for (const zone of root.querySelectorAll('[data-stick]')) this.bindStick(zone);

    root.querySelector('[data-fire]').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.touch.fire = true;
      input.touch.firePressed = true;
    });
    const stopFire = () => (input.touch.fire = false);
    root.querySelector('[data-fire]').addEventListener('pointerup', stopFire);
    root.querySelector('[data-fire]').addEventListener('pointercancel', stopFire);
    root.querySelector('[data-fire]').addEventListener('pointerleave', stopFire);

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

  bindStick(zone) {
    const base = zone.querySelector('.t-base');
    const knob = zone.querySelector('.t-knob');
    const kind = zone.dataset.stick;
    const t = this.input.touch;
    let id = null;
    let cx = 0;
    let cy = 0;

    const reset = () => {
      id = null;
      knob.style.transform = 'translate(-50%, -50%)';
      base.classList.remove('active');
      if (kind === 'move') {
        t.mx = 0;
        t.my = 0;
        base.style.left = '';
        base.style.top = '';
      } else {
        t.aiming = false;
        t.fire = false;
      }
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
      const k = Math.min(1, d / STICK_R);
      if (kind === 'move') {
        t.mx = d > 8 ? (dx / STICK_R) : 0;
        t.my = d > 8 ? (dy / STICK_R) : 0;
      } else if (d > 10) {
        t.aiming = true;
        t.aimAngle = Math.atan2(dy, dx);
        // mira spinta fino in fondo = fuoco automatico
        const wasFiring = t.fire;
        t.fire = k > 0.85;
        if (t.fire && !wasFiring) t.firePressed = true;
      }
    };

    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      zone.setPointerCapture(id);
      base.classList.add('active');
      if (kind === 'move') {
        // il joystick sinistro compare dove appoggi il dito
        const r = zone.getBoundingClientRect();
        base.style.left = e.clientX - r.left + 'px';
        base.style.top = e.clientY - r.top + 'px';
      }
      const br = base.getBoundingClientRect();
      cx = br.left + br.width / 2;
      cy = br.top + br.height / 2;
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
