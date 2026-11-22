// La telecamera segue il giocatore. (x, y) è il punto del mondo al centro dello schermo.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0; // dimensioni dello schermo in pixel CSS
    this.height = 0;
    this.zoom = 1;
    this.shake = 0;
  }

  get viewW() {
    return this.width / this.zoom;
  }

  get viewH() {
    return this.height / this.zoom;
  }

  follow(target, dt, worldW, worldH, targetZoom) {
    this.zoom += (targetZoom - this.zoom) * (1 - Math.exp(-6 * dt));
    const t = 1 - Math.exp(-10 * dt);
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;

    // Non mostrare troppo oltre i bordi della mappa
    // vicino ai bordi la telecamera si ferma, ma mai troppo lontano dal giocatore (anche con la visuale larga)
    const hw = Math.min(this.viewW / 2 - 60, 500);
    const hh = Math.min(this.viewH / 2 - 60, 350);
    if (worldW > this.viewW) this.x = Math.max(hw, Math.min(worldW - hw, this.x));
    if (worldH > this.viewH) this.y = Math.max(hh, Math.min(worldH - hh, this.y));

    this.shake = Math.max(0, this.shake - dt * 40);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width / 2) / this.zoom + this.x,
      y: (sy - this.height / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.width / 2,
      y: (wy - this.y) * this.zoom + this.height / 2,
    };
  }

  // Rettangolo del mondo visibile (con un margine), per disegnare solo ciò che serve
  viewRect(margin = 0) {
    const hw = this.viewW / 2 + margin;
    const hh = this.viewH / 2 + margin;
    return { left: this.x - hw, top: this.y - hh, right: this.x + hw, bottom: this.y + hh };
  }

  // Da qui in poi si disegna in coordinate del mondo
  apply(ctx) {
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.translate(this.width / 2 + sx, this.height / 2 + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
