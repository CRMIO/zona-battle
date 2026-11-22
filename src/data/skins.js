// Le skin del personaggio.
//
// tier = rarità: 'free' (gratis), 'common', 'uncommon', 'rare', 'epic', 'legendary' (prezzo crescente)
//        oppure 'rank' (premio gratis delle classificate).
// body/body2 = colori del vestito, pattern = disegno sul vestito, skinTone = colore della testa,
// hat = cosa porta in testa, pack = zaino, glow = alone luminoso, eyes = occhi luminosi.
//
// Oltre alle skin fatte a mano ce ne sono circa 200 generate in automatico, sempre uguali
// (stesso seed): così nomi e codici non cambiano e gli acquisti restano salvati.

import { mulberry32, shuffle } from '../utils.js';

export const SKIN_RARITIES = {
  common: { name: 'Comune', color: '#a7adb4', price: 400 },
  uncommon: { name: 'Non comune', color: '#5fcf5a', price: 800 },
  rare: { name: 'Rara', color: '#3f9cff', price: 1200 },
  epic: { name: 'Epica', color: '#b45cff', price: 2000 },
  legendary: { name: 'Leggendaria', color: '#ffa928', price: 3000 },
};
export const SKIN_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const TIER_INFO = {
  free: { name: 'Gratis', color: '#9aa4ae' },
  ...SKIN_RARITIES,
  rank: { name: 'Premio rank', color: '#e0245e' },
};

const P = (tier) => SKIN_RARITIES[tier].price;

// ------------------------------------------------------------------ Skin fatte a mano

const HANDMADE = [
  // --- Gratis ---
  { id: 'recluta', name: 'Recluta', tier: 'free', price: 0, body: '#3a7bd5', body2: '#2a5ea8', pattern: 'plain', skinTone: '#e8b98f', hair: '#5a3b22', hat: 'cap', hatColor: '#2a5ea8', pack: '#6b5a3a' },
  { id: 'ranger', name: 'Ranger', tier: 'free', price: 0, body: '#5b7a3a', body2: '#3f5a28', pattern: 'camo', skinTone: '#c98f65', hair: '#222222', hat: 'helmet', hatColor: '#4a6330', pack: '#4a4a3a' },

  // --- Rare ---
  { id: 'volpe', name: 'Volpe Rossa', tier: 'rare', price: P('rare'), body: '#e8742c', body2: '#fff3e6', pattern: 'belly', skinTone: '#f1c7a0', hair: '#e8742c', hat: 'foxears', hatColor: '#e8742c', pack: '#7a3b1a' },
  { id: 'corsaro', name: 'Corsaro', tier: 'rare', price: P('rare'), body: '#1f1f24', body2: '#d6332f', pattern: 'stripes', skinTone: '#d9a47a', hair: '#111111', hat: 'bandana', hatColor: '#d6332f', pack: '#6b4a2a' },
  { id: 'ape', name: 'Ape Ronzante', tier: 'rare', price: P('rare'), body: '#f4c430', body2: '#1e1e1e', pattern: 'stripes', skinTone: '#f0c8a0', hair: '#1e1e1e', hat: 'antennae', hatColor: '#1e1e1e', pack: '#f2f2f2' },
  { id: 'pompiere', name: 'Pompiere', tier: 'rare', price: P('rare'), body: '#c62828', body2: '#ffd54f', pattern: 'band', skinTone: '#e8b98f', hair: '#333333', hat: 'firehelmet', hatColor: '#ffcc00', pack: '#555555' },
  { id: 'ghiaccio', name: 'Cristallo', tier: 'rare', price: P('rare'), body: '#bfe6ff', body2: '#6fb7e8', pattern: 'split', skinTone: '#f3dccb', hair: '#ffffff', hat: 'none', hatColor: '#ffffff', pack: '#6fb7e8' },

  // --- Epiche ---
  { id: 'drago', name: "Drago d'Oro", tier: 'epic', price: P('epic'), body: '#d4a017', body2: '#8a5a00', pattern: 'scales', skinTone: '#d4a017', hair: '#8a5a00', hat: 'horns', hatColor: '#fff4c2', pack: '#b22222', glow: '#ffd34d' },
  { id: 'neon', name: 'Neon', tier: 'epic', price: P('epic'), body: '#101826', body2: '#00f0ff', pattern: 'circuit', skinTone: '#1b2a3a', hair: '#00f0ff', hat: 'visor', hatColor: '#00f0ff', pack: '#ff2bd6', glow: '#00f0ff' },
  { id: 'cavaliere', name: "Cavaliere d'Argento", tier: 'epic', price: P('epic'), body: '#b8c2cc', body2: '#6d7a87', pattern: 'armor', skinTone: '#b8c2cc', hair: '#c0392b', hat: 'plume', hatColor: '#c0392b', pack: '#6d7a87', glow: '#e8f2ff' },

  // --- Leggendarie ---
  { id: 'spettro', name: 'Spettro', tier: 'legendary', price: P('legendary'), body: '#2b1640', body2: '#7d3cff', pattern: 'hood', skinTone: '#120a1c', hair: '#2b1640', hat: 'hood', hatColor: '#3b1f5a', pack: '#1a0f26', glow: '#b16cff', eyes: '#d9b8ff' },
  { id: 'galassia', name: 'Galassia', tier: 'legendary', price: P('legendary'), body: '#1a1446', body2: '#ff5fd2', pattern: 'galaxy', skinTone: '#2a1f6b', hair: '#ffffff', hat: 'none', hatColor: '#ffffff', pack: '#3b2a8a', glow: '#8a7bff', eyes: '#ffffff' },
  { id: 'lava', name: 'Cuore di Lava', tier: 'legendary', price: P('legendary'), body: '#1c1412', body2: '#ff5a1f', pattern: 'cracks', skinTone: '#2a1a14', hair: '#ff5a1f', hat: 'horns', hatColor: '#ff5a1f', pack: '#3a221a', glow: '#ff6a00', eyes: '#ffd000' },
];

// --- Premi dei rank: gratis, si sbloccano arrivando alla divisione I di ogni rank (e a Campione)
const RANK_SKINS = [
  { id: 'rank-rame', name: 'Guerriero di Rame', tier: 'rank', rank: 0, price: 0, body: '#b4643c', body2: '#ffd0b0', pattern: 'rank', emblem: 'chev1', skinTone: '#e8b98f', hair: '#5e2e16', hat: 'helmet', hatColor: '#8f4a28', pack: '#5e2e16' },
  { id: 'rank-bronzo', name: 'Sentinella di Bronzo', tier: 'rank', rank: 1, price: 0, body: '#a8743a', body2: '#ffe0b0', pattern: 'rank', emblem: 'chev2', skinTone: '#d9a47a', hair: '#553611', hat: 'helmet', hatColor: '#7e5524', pack: '#553611' },
  { id: 'rank-argento', name: "Lama d'Argento", tier: 'rank', rank: 2, price: 0, body: '#aeb9c4', body2: '#ffffff', pattern: 'rank', emblem: 'chev3', skinTone: '#aeb9c4', hair: '#3f6fd8', hat: 'plume', hatColor: '#3f6fd8', pack: '#46515c' },
  { id: 'rank-oro', name: "Campione d'Oro", tier: 'rank', rank: 3, price: 0, body: '#d9a514', body2: '#fff3b0', pattern: 'rank', emblem: 'star', skinTone: '#e3b52a', hair: '#c0392b', hat: 'plume', hatColor: '#c0392b', pack: '#6e5100', glow: '#ffd34d' },
  { id: 'rank-platino', name: 'Custode di Platino', tier: 'rank', rank: 4, price: 0, body: '#22b0a2', body2: '#d6fffa', pattern: 'rank', emblem: 'diamond', skinTone: '#0b544d', hair: '#a3f4ea', hat: 'visor', hatColor: '#a3f4ea', pack: '#0b544d', glow: '#4ff0dd' },
  { id: 'rank-smeraldo', name: 'Signore di Smeraldo', tier: 'rank', rank: 5, price: 0, body: '#1e9e55', body2: '#b6ffd2', pattern: 'rank', emblem: 'gem', skinTone: '#0b4d27', hair: '#86f5b2', hat: 'horns', hatColor: '#86f5b2', pack: '#0b4d27', glow: '#3dff8a', eyes: '#b6ffd2' },
  { id: 'rank-diamante', name: 'Spirito di Diamante', tier: 'rank', rank: 6, price: 0, body: '#6a4fd8', body2: '#ece6ff', pattern: 'rank', emblem: 'bigdiamond', skinTone: '#2a1a6b', hair: '#ddd2ff', hat: 'visor', hatColor: '#ddd2ff', pack: '#3b2585', glow: '#b8a4ff' },
  { id: 'rank-campione', name: 'Il Campione', tier: 'rank', rank: 7, price: 0, body: '#b0103f', body2: '#ffd34d', pattern: 'rank', emblem: 'crown', skinTone: '#f1c7a0', hair: '#2a0812', hat: 'crown', hatColor: '#ffd34d', pack: '#6e0626', glow: '#ff3d7f', eyes: '#ffd34d' },
];

// ------------------------------------------------------------------ Skin generate

// Chi è il personaggio
const ROLES = [
  'Esploratore', 'Cacciatore', 'Pilota', 'Soldato', 'Ninja', 'Pirata', 'Cowboy', 'Astronauta', 'Samurai', 'Mago',
  'Robot', 'Alieno', 'Lupo', 'Orso', 'Tigre', 'Squalo', 'Falco', 'Fantasma', 'Vichingo', 'Gladiatore',
  'Clown', 'Cuoco', 'Surfista', 'Skater', 'Detective', 'Agente', 'Meccanico', 'Minatore', 'Pescatore', 'Scienziato',
  'Guardiano', 'Marinaio', 'Principe', 'Stregone', 'Elfo', 'Golem', 'Gufo', 'Corvo', 'Panda', 'Leone',
  'Cobra', 'Gatto', 'Scheletro', 'Mostro', 'Barone', 'Sceriffo', 'Bandito', 'Arciere', 'Cyborg', 'Druido',
];

// Il tema, con i suoi colori
export const THEMES = [
  { t: 'del Fuoco', body: '#d63a1f', body2: '#ffb02e', pack: '#5a1a0a' },
  { t: 'di Ghiaccio', body: '#bfe6ff', body2: '#5aa9e6', pack: '#2f5f8a' },
  { t: 'della Notte', body: '#1b2140', body2: '#6c7bd9', pack: '#0d1020' },
  { t: 'del Bosco', body: '#3f6b2a', body2: '#a3c95a', pack: '#3a2a18' },
  { t: 'di Neve', body: '#f2f4f7', body2: '#9fb3c8', pack: '#7a8a9a' },
  { t: 'del Deserto', body: '#d8b27a', body2: '#8a5a2b', pack: '#6b4a2a' },
  { t: 'delle Onde', body: '#1f7fb8', body2: '#9fe3ff', pack: '#0f3f5c' },
  { t: 'di Lava', body: '#2a1410', body2: '#ff5a1f', pack: '#3a1a10' },
  { t: 'del Cielo', body: '#7cc4ff', body2: '#ffffff', pack: '#3f78b0' },
  { t: 'di Rubino', body: '#a8102e', body2: '#ff6b8a', pack: '#4a0614' },
  { t: 'di Zaffiro', body: '#1f3fa8', body2: '#7aa2ff', pack: '#0f1f54' },
  { t: 'di Giada', body: '#1f9e7a', body2: '#9ff0d2', pack: '#0b4d3a' },
  { t: "d'Ambra", body: '#d98a14', body2: '#ffe0a0', pack: '#6b4200' },
  { t: 'di Corallo', body: '#ff7a6b', body2: '#ffe0d6', pack: '#8a3a30' },
  { t: 'della Giungla', body: '#2f7a2f', body2: '#e6c84a', pack: '#3a2a10' },
  { t: 'di Pietra', body: '#7d838a', body2: '#b9bec4', pack: '#4a4e54' },
  { t: 'del Vento', body: '#a8e6e0', body2: '#4ab3a8', pack: '#2a6b66' },
  { t: 'della Tempesta', body: '#4a3a7a', body2: '#c08aff', pack: '#221a3a' },
  { t: 'di Cristallo', body: '#d6f0ff', body2: '#8ad0ff', pack: '#5a8aa8' },
  { t: "d'Ombra", body: '#15121c', body2: '#5a4a7a', pack: '#0a080e' },
  { t: 'del Sole', body: '#ffcc33', body2: '#ff8a1f', pack: '#8a5a00' },
  { t: 'della Luna', body: '#c9cfe0', body2: '#5a6a9a', pack: '#3a4060' },
  { t: 'delle Stelle', body: '#141a3a', body2: '#ffe680', pack: '#0a0e20' },
  { t: 'di Fumo', body: '#5a5f66', body2: '#a0a6ad', pack: '#33363a' },
  { t: 'di Neon', body: '#0f1420', body2: '#39ff14', pack: '#ff2bd6' },
  { t: 'del Tuono', body: '#2a2f45', body2: '#ffe14d', pack: '#14182a' },
  { t: 'di Miele', body: '#f0b43a', body2: '#7a4a10', pack: '#5a3a10' },
  { t: 'di Menta', body: '#8ae6c0', body2: '#2a8a66', pack: '#1f5a44' },
  { t: 'di Cioccolato', body: '#5a3420', body2: '#c08a5a', pack: '#3a2014' },
  { t: 'di Ciliegia', body: '#c2185b', body2: '#ffcdd2', pack: '#5a0a2a' },
  { t: 'del Tramonto', body: '#ff7043', body2: '#7e57c2', pack: '#4a2a5a' },
  { t: "dell'Abisso", body: '#0a1f2e', body2: '#1fe0c0', pack: '#05101a' },
];

const SKIN_TONES = ['#f1c7a0', '#e8b98f', '#d9a47a', '#c98f65', '#a8714a', '#7a4f30'];
const HAIR = ['#2a1a10', '#5a3b22', '#a0602a', '#e0c070', '#111111', '#7a2a1a'];

// Cosa può avere una skin di ogni rarità: più è rara, più è elaborata
const FEATURES = {
  common: { count: 60, patterns: ['plain', 'split', 'band'], hats: ['cap', 'helmet', 'none', 'bandana'] },
  uncommon: { count: 50, patterns: ['stripes', 'camo', 'belly', 'band', 'split'], hats: ['cap', 'helmet', 'bandana', 'antennae', 'firehelmet', 'foxears'] },
  rare: { count: 40, patterns: ['scales', 'armor', 'circuit', 'stripes', 'camo'], hats: ['plume', 'visor', 'horns', 'helmet', 'foxears'] },
  epic: { count: 30, patterns: ['galaxy', 'cracks', 'hood', 'circuit', 'scales'], hats: ['visor', 'horns', 'hood', 'plume'], glow: true },
  legendary: { count: 20, patterns: ['rainbow', 'galaxy', 'cracks', 'armor', 'circuit'], hats: ['crown', 'horns', 'visor', 'hood'], glow: true, eyes: true },
};

function generateSkins() {
  const rng = mulberry32(20261122);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  // tutte le combinazioni ruolo + tema, mescolate: ogni nome è unico
  const combos = [];
  for (const role of ROLES) for (const theme of THEMES) combos.push({ role, theme });
  shuffle(rng, combos);
  const taken = new Set(HANDMADE.map((s) => s.name));
  let at = 0;
  const out = [];
  for (const tier of SKIN_RARITY_ORDER) {
    const f = FEATURES[tier];
    for (let i = 0; i < f.count; i++) {
      let c;
      do c = combos[at++];
      while (taken.has(`${c.role} ${c.theme.t}`));
      const name = `${c.role} ${c.theme.t}`;
      taken.add(name);
      const th = c.theme;
      const dark = parseInt(th.body.slice(1, 3), 16) < 70;
      out.push({
        id: `s-${tier}-${String(i + 1).padStart(3, '0')}`,
        name,
        tier,
        price: SKIN_RARITIES[tier].price,
        body: th.body,
        body2: th.body2,
        pattern: pick(f.patterns),
        skinTone: tier === 'legendary' || (tier === 'epic' && dark) ? th.pack : pick(SKIN_TONES),
        hair: rng() < 0.5 ? pick(HAIR) : th.body2,
        hat: pick(f.hats),
        hatColor: rng() < 0.5 ? th.body2 : th.body,
        pack: th.pack,
        glow: f.glow ? th.body2 : undefined,
        eyes: f.eyes ? th.body2 : undefined,
      });
    }
  }
  return out;
}

export const SKINS = [...HANDMADE, ...generateSkins(), ...RANK_SKINS];

// Ordine di rarità per ordinare le liste nella lobby
export function rarityRank(skin) {
  const order = ['free', ...SKIN_RARITY_ORDER, 'rank'];
  return order.indexOf(skin.tier);
}

// Indice di rank (0..35) da raggiungere per sbloccare la skin: divisione I del rank, o Campione
export function rankSkinIndex(skin) {
  return skin.rank === 7 ? 35 : skin.rank * 5 + 4;
}

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
