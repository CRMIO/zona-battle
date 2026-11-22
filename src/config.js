// Tutte le costanti del gioco in un unico posto: per bilanciare basta cambiare qui.
export const CONFIG = {
  TILE: 64,          // dimensione di un tile in pixel
  MAP_W: 70,         // larghezza mappa in tile
  MAP_H: 70,         // altezza mappa in tile
  SEED: 1234,        // stesso seed = stessa mappa

  PLAYER_RADIUS: 18,
  PLAYER_SPEED: 230,   // pixel al secondo
  SPRINT_MULT: 1.5,

  FIRE_RATE: 7,        // colpi al secondo
  SPREAD: 0.05,        // dispersione in radianti
  BULLET_SPEED: 1100,
  BULLET_LIFE: 0.7,    // secondi
  BULLET_DAMAGE: 12,

  TARGET_HP: 100,
  TARGET_RESPAWN: 3,   // secondi
};
