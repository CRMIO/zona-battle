// La telecamera segue il giocatore. (x, y) è il punto del mondo al centro dello schermo.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;   // dimensioni dello schermo in pixel CSS
    this.height = 0;
  }

  follow(target, dt, worldW, worldH) {
    // Movimento morbido verso il bersaglio
    const t = 1 - Math.exp(-10 * dt);
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;

    // Non mostrare oltre i bordi della mappa
    const hw = this.width / 2;
    const hh = this.height / 2;
    this.x = worldW > this.width ? clamp(this.x, hw, worldW - hw) : worldW / 2;
    this.y = worldH > this.height ? clamp(this.y, hh, worldH - hh) : worldH / 2;
  }

  screenToWorld(sx, sy) {
    return { x: sx - this.width / 2 + this.x, y: sy - this.height / 2 + this.y };
  }

  // Rettangolo del mondo visibile (con un margine), per disegnare solo ciò che serve
  viewRect(margin = 0) {
    return {
      left: this.x - this.width / 2 - margin,
      top: this.y - this.height / 2 - margin,
      right: this.x + this.width / 2 + margin,
      bottom: this.y + this.height / 2 + margin,
    };
  }

  // Applica la trasformazione: da qui in poi si disegna in coordinate del mondo
  apply(ctx) {
    ctx.translate(Math.round(this.width / 2 - this.x), Math.round(this.height / 2 - this.y));
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
