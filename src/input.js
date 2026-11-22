// Stato della tastiera e del mouse, letto dal game loop a ogni frame.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false }; // coordinate dello schermo (pixel CSS)

    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(code) {
    return this.keys.has(code);
  }
}
