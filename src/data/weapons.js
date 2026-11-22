// Definizioni delle armi: sono solo dati, il codice che spara è in game.js.

// body = colore del corpo dell'arma, glow = alone (solo epiche e leggendarie), mult = moltiplicatore del danno
export const RARITIES = {
  common: { name: 'Comune', color: '#a7adb4', body: '#5d636b', mult: 1.0 },
  uncommon: { name: 'Non comune', color: '#5fcf5a', body: '#3f7d43', mult: 1.08 },
  rare: { name: 'Rara', color: '#3f9cff', body: '#2f5fae', mult: 1.16 },
  epic: { name: 'Epica', color: '#b45cff', body: '#6b3aae', glow: '#c77dff', mult: 1.25 },
  legendary: { name: 'Leggendaria', color: '#ffa928', body: '#b8860b', glow: '#ffcf4d', mult: 1.35 },
};

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// damage = danno per proiettile, pellets = proiettili per colpo, len = lunghezza disegnata (per la canna)
// ideal = distanza preferita dai bot, botRange = distanza in cui i bot la considerano adatta
export const WEAPONS = {
  pistol: {
    name: 'Pistola', ammo: 'light', damage: 23, pellets: 1, fireRate: 5, auto: false,
    mag: 16, reload: 1.3, spread: 0.04, speed: 1300, range: 750, len: 20,
    ideal: 300, botRange: [0, 600], weight: 24,
  },
  smg: {
    name: 'Mitraglietta', ammo: 'light', damage: 15, pellets: 1, fireRate: 11, auto: true,
    mag: 30, reload: 2.0, spread: 0.09, speed: 1300, range: 650, len: 33,
    ideal: 230, botRange: [0, 450], weight: 22,
  },
  rifle: {
    name: "Fucile d'assalto", ammo: 'medium', damage: 30, pellets: 1, fireRate: 5.5, auto: true,
    mag: 30, reload: 2.2, spread: 0.04, speed: 1600, range: 1100, len: 45,
    ideal: 450, botRange: [150, 900], weight: 22,
  },
  shotgun: {
    name: 'Fucile a pompa', ammo: 'shells', damage: 11, pellets: 9, fireRate: 1.1, auto: false,
    mag: 5, reload: 3.6, spread: 0.2, speed: 1200, range: 420, len: 40,
    ideal: 130, botRange: [0, 260], weight: 19,
  },
  sniper: {
    name: 'Fucile di precisione', ammo: 'heavy', damage: 100, pellets: 1, fireRate: 0.75, auto: false,
    mag: 1, reload: 2.4, spread: 0.004, speed: 3000, range: 2400, len: 60,
    ideal: 800, botRange: [400, 1600], weight: 8,
  },
};

for (const id in WEAPONS) WEAPONS[id].id = id;

// Quanto è "forte" un'arma: serve ai bot per scegliere cosa tenere
export function weaponPower(inst) {
  const d = WEAPONS[inst.id];
  const sniperBonus = d.id === 'sniper' ? 1.6 : 1;
  return d.damage * d.pellets * Math.min(d.fireRate, 6) * RARITIES[inst.rarity].mult * sniperBonus;
}

// luck > 0 = più probabilità di rarità alte, luck < 0 = più armi comuni
export function rollRarity(rng, luck = 0) {
  const base = [46, 30, 15, 6.5, 2.5];
  const weights = base.map((b, i) => Math.max(0.2, b * Math.pow(1 + luck * 0.6, i - 1.5)));
  let total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return RARITY_ORDER[i];
  }
  return 'common';
}
