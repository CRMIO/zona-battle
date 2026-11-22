// Tutte le costanti del gioco in un unico posto: per bilanciare basta cambiare qui.
export const CONFIG = {
  TILE: 64,            // dimensione di un tile in pixel
  MAP_W: 260,          // larghezza mappa in tile (16640 px)
  MAP_H: 260,          // altezza mappa in tile
  CHUNK: 512,          // il terreno viene disegnato a blocchi di 512 px e messo in cache

  BOTS: 99,            // nemici controllati dall'IA (99 + te = 100 giocatori)
  ZOOM: 0.85,
  SNIPER_ZOOM: 0.6,

  CHAR_RADIUS: 18,
  WALK_SPEED: 240,     // pixel al secondo
  SPRINT_MULT: 1.35,
  HEAL_SLOW: 0.45,     // velocità mentre ci si cura
  MAX_HP: 100,
  MAX_SHIELD: 100,

  START_MATS: 30,
  MAX_MATS: 500,
  WALL_COST: 10,
  WALL_HP: 150,
  WALL_BUILD_TIME: 0.35,
  BUILD_RANGE: 230,
  BUILD_COOLDOWN: 0.22,

  HOUSE_WALL_HP: 300,
  TREE_HP: 150,
  ROCK_HP: 220,

  PICKAXE_RATE: 2.2,           // colpi al secondo
  PICKAXE_DAMAGE: 20,          // danno ai personaggi
  PICKAXE_STRUCT_DAMAGE: 50,   // danno a muri, alberi e rocce

  INTERACT_RANGE: 64,
  AUTO_PICKUP_RANGE: 38,
  CHEST_OPEN_TIME: 0.55,

  WIN_COINS: 100,
};
