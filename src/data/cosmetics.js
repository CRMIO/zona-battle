// Deltaplani e picconi: stesse rarità e stessi prezzi delle skin.
// Generati in automatico (sempre uguali, stesso seed) più quelli di base gratis.

import { mulberry32, shuffle } from '../utils.js';
import { SKIN_RARITIES, SKIN_RARITY_ORDER, THEMES } from './skins.js';

// Quanti per rarità (40 deltaplani e 40 picconi in vendita)
const COUNTS = { common: 12, uncommon: 10, rare: 8, epic: 6, legendary: 4 };

// ------------------------------------------------------------------ Deltaplani

const GLIDER_SHAPES = {
  common: ['delta', 'parafoil'],
  uncommon: ['delta', 'parafoil', 'umbrella'],
  rare: ['delta', 'parafoil', 'umbrella', 'wings'],
  epic: ['wings', 'umbrella', 'delta', 'bat'],
  legendary: ['wings', 'bat', 'delta', 'parafoil'],
};
const GLIDER_PATTERNS = {
  common: ['plain', 'stripes'],
  uncommon: ['stripes', 'checker', 'plain'],
  rare: ['checker', 'chevron', 'stripes'],
  epic: ['stars', 'chevron', 'gradient'],
  legendary: ['rainbow', 'stars', 'gradient'],
};
const GLIDER_NOUNS = {
  delta: ['Ala', 'Planatore', 'Freccia', 'Rondine'],
  parafoil: ['Vela', 'Aquilone', 'Nuvola', 'Paracadute'],
  umbrella: ['Ombrello', 'Fungo', 'Medusa'],
  wings: ['Ali', 'Piume', 'Farfalla', 'Libellula'],
  bat: ['Pipistrello', 'Mantello', 'Ali Oscure'],
};

// ------------------------------------------------------------------ Picconi

const PICK_SHAPES = {
  common: ['classic', 'axe'],
  uncommon: ['classic', 'axe', 'hammer', 'wrench'],
  rare: ['hammer', 'scythe', 'double', 'wrench'],
  epic: ['scythe', 'sword', 'crystal', 'double'],
  legendary: ['sword', 'crystal', 'scythe', 'hammer'],
};
const PICK_NOUNS = {
  classic: 'Piccone',
  axe: 'Ascia',
  hammer: 'Martello',
  wrench: 'Chiave Inglese',
  scythe: 'Falce',
  double: 'Piccozza',
  sword: 'Spada',
  crystal: 'Scettro',
};
const HANDLES = ['#6b4423', '#4a2f18', '#2b2f35', '#8a5a2b', '#5a5f66'];

function generate(kind) {
  const rng = mulberry32(kind === 'glider' ? 777001 : 777002);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const themes = shuffle(rng, THEMES.slice());
  const names = new Set();
  const out = [];
  let ti = 0;
  for (const tier of SKIN_RARITY_ORDER) {
    for (let i = 0; i < COUNTS[tier]; i++) {
      let theme;
      let shape;
      let name;
      do {
        theme = themes[ti++ % themes.length];
        shape = pick(kind === 'glider' ? GLIDER_SHAPES[tier] : PICK_SHAPES[tier]);
        const noun = kind === 'glider' ? pick(GLIDER_NOUNS[shape]) : PICK_NOUNS[shape];
        name = `${noun} ${theme.t}`;
      } while (names.has(name));
      names.add(name);
      const glow = tier === 'epic' || tier === 'legendary' ? theme.body2 : undefined;
      const base = {
        id: `${kind === 'glider' ? 'g' : 'p'}-${tier}-${String(i + 1).padStart(2, '0')}`,
        name, tier, price: SKIN_RARITIES[tier].price, shape, glow,
      };
      if (kind === 'glider') {
        out.push({ ...base, c1: theme.body, c2: theme.body2, frame: theme.pack, pattern: pick(GLIDER_PATTERNS[tier]), trail: tier === 'legendary' });
      } else {
        out.push({ ...base, head: theme.body2, accent: theme.body, handle: tier === 'legendary' ? theme.pack : pick(HANDLES) });
      }
    }
  }
  return out;
}

export const GLIDERS = [
  { id: 'glider-base', name: 'Deltaplano Base', tier: 'free', price: 0, shape: 'delta', c1: '#3a7bd5', c2: '#ffffff', frame: '#1f3f6e', pattern: 'stripes' },
  ...generate('glider'),
];

export const PICKAXES = [
  { id: 'pick-base', name: 'Piccone Base', tier: 'free', price: 0, shape: 'classic', head: '#b4bec8', accent: '#4b535c', handle: '#6b4423' },
  ...generate('pickaxe'),
];

export function getGlider(id) {
  return GLIDERS.find((g) => g.id === id) || GLIDERS[0];
}

export function getPickaxe(id) {
  return PICKAXES.find((p) => p.id === id) || PICKAXES[0];
}
