// Cosa esce dalle casse e cosa si trova per terra.
import { WEAPONS, RARITIES, rollRarity } from '../data/weapons.js';
import { ITEMS, AMMO } from '../data/items.js';
import { pickWeighted } from '../utils.js';

export function rollWeapon(rng, luck = 0) {
  const id = pickWeighted(rng, Object.keys(WEAPONS), (k) => WEAPONS[k].weight);
  return { kind: 'weapon', id, rarity: rollRarity(rng, luck), mag: WEAPONS[id].mag };
}

export function rollConsumable(rng) {
  const id = pickWeighted(rng, Object.keys(ITEMS), (k) => ITEMS[k].weight);
  return { kind: 'item', id, count: ITEMS[id].give };
}

export function ammoFor(weaponId, mult = 1) {
  const a = WEAPONS[weaponId].ammo;
  return { kind: 'ammo', id: a, count: Math.round(AMMO[a].give * mult) };
}

export function chestLoot(rng, luck) {
  const weapon = rollWeapon(rng, luck);
  const loot = [weapon, ammoFor(weapon.id, 1.5)];
  if (rng() < 0.85) loot.push(rollConsumable(rng));
  if (luck > 0) loot.push(rollConsumable(rng), { kind: 'mats', count: 40 });
  else if (rng() < 0.5) loot.push({ kind: 'mats', count: 30 });
  return loot;
}

export function floorLoot(rng) {
  const r = rng();
  if (r < 0.45) {
    const w = rollWeapon(rng, -0.5);
    return [w, ammoFor(w.id)];
  }
  if (r < 0.75) return [rollConsumable(rng)];
  const id = pickWeighted(rng, Object.keys(AMMO), () => 1);
  return [{ kind: 'ammo', id, count: AMMO[id].give }];
}

export function itemLabel(data) {
  switch (data.kind) {
    case 'weapon':
      return `${WEAPONS[data.id].name} (${RARITIES[data.rarity].name})`;
    case 'item':
      return `${ITEMS[data.id].name} x${data.count}`;
    case 'ammo':
      return `${AMMO[data.id].name} x${data.count}`;
    case 'mats':
      return `Materiali x${data.count}`;
  }
  return '';
}
