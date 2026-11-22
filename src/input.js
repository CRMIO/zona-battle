// Stato di tastiera, mouse e comandi touch, letto dal game loop a ogni frame.
// "pressed" vale solo per il frame in cui il tasto è stato premuto.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false, pressed: false };
    this.wheel = 0;
    this.onTap = null; // tocco sul canvas (per la barra degli oggetti sul telefono)

    // Stato dei comandi touch (lo scrive ui/touch.js)
    this.touch = {
      enabled: false,
      mx: 0, my: 0,            // joystick movimento
      aiming: false, aimAngle: 0, // joystick mira
      fire: false, firePressed: false,
      slot: null,
    };

    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    // Il mouse vero: i tocchi sullo schermo sono gestiti a parte
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') {
        if (this.onTap) this.onTap(e.clientX, e.clientY);
        return;
      }
      if (e.button === 0) {
        this.mouse.down = true;
        this.mouse.pressed = true;
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false }
    );
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.pressed = false;
    this.wheel = 0;
    this.touch.firePressed = false;
    this.touch.slot = null;
  }
}
