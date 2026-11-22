// Le skin del personaggio. tier: 'free' (gratis), 'basic' (1000 monete), 'premium' (3000 monete).
//
// body/body2 = colori del vestito, pattern = disegno sul vestito, skinTone = colore della testa,
// hat = cosa porta in testa, pack = zaino, glow = alone luminoso (solo premium), eyes = occhi luminosi.

export const SKINS = [
  // --- Gratis ---
  { id: 'recluta', name: 'Recluta', tier: 'free', price: 0, body: '#3a7bd5', body2: '#2a5ea8', pattern: 'plain', skinTone: '#e8b98f', hair: '#5a3b22', hat: 'cap', hatColor: '#2a5ea8', pack: '#6b5a3a' },
  { id: 'ranger', name: 'Ranger', tier: 'free', price: 0, body: '#5b7a3a', body2: '#3f5a28', pattern: 'camo', skinTone: '#c98f65', hair: '#222222', hat: 'helmet', hatColor: '#4a6330', pack: '#4a4a3a' },

  // --- Base: 1000 monete ---
  { id: 'volpe', name: 'Volpe Rossa', tier: 'basic', price: 1000, body: '#e8742c', body2: '#fff3e6', pattern: 'belly', skinTone: '#f1c7a0', hair: '#e8742c', hat: 'foxears', hatColor: '#e8742c', pack: '#7a3b1a' },
  { id: 'corsaro', name: 'Corsaro', tier: 'basic', price: 1000, body: '#1f1f24', body2: '#d6332f', pattern: 'stripes', skinTone: '#d9a47a', hair: '#111111', hat: 'bandana', hatColor: '#d6332f', pack: '#6b4a2a' },
  { id: 'ape', name: 'Ape Ronzante', tier: 'basic', price: 1000, body: '#f4c430', body2: '#1e1e1e', pattern: 'stripes', skinTone: '#f0c8a0', hair: '#1e1e1e', hat: 'antennae', hatColor: '#1e1e1e', pack: '#f2f2f2' },
  { id: 'pompiere', name: 'Pompiere', tier: 'basic', price: 1000, body: '#c62828', body2: '#ffd54f', pattern: 'band', skinTone: '#e8b98f', hair: '#333333', hat: 'firehelmet', hatColor: '#ffcc00', pack: '#555555' },
  { id: 'ghiaccio', name: 'Cristallo', tier: 'basic', price: 1000, body: '#bfe6ff', body2: '#6fb7e8', pattern: 'split', skinTone: '#f3dccb', hair: '#ffffff', hat: 'none', hatColor: '#ffffff', pack: '#6fb7e8' },

  // --- Premium: 3000 monete ---
  { id: 'drago', name: "Drago d'Oro", tier: 'premium', price: 3000, body: '#d4a017', body2: '#8a5a00', pattern: 'scales', skinTone: '#d4a017', hair: '#8a5a00', hat: 'horns', hatColor: '#fff4c2', pack: '#b22222', glow: '#ffd34d' },
  { id: 'neon', name: 'Neon', tier: 'premium', price: 3000, body: '#101826', body2: '#00f0ff', pattern: 'circuit', skinTone: '#1b2a3a', hair: '#00f0ff', hat: 'visor', hatColor: '#00f0ff', pack: '#ff2bd6', glow: '#00f0ff' },
  { id: 'spettro', name: 'Spettro', tier: 'premium', price: 3000, body: '#2b1640', body2: '#7d3cff', pattern: 'hood', skinTone: '#120a1c', hair: '#2b1640', hat: 'hood', hatColor: '#3b1f5a', pack: '#1a0f26', glow: '#b16cff', eyes: '#d9b8ff' },
  { id: 'galassia', name: 'Galassia', tier: 'premium', price: 3000, body: '#1a1446', body2: '#ff5fd2', pattern: 'galaxy', skinTone: '#2a1f6b', hair: '#ffffff', hat: 'none', hatColor: '#ffffff', pack: '#3b2a8a', glow: '#8a7bff', eyes: '#ffffff' },
  { id: 'lava', name: 'Cuore di Lava', tier: 'premium', price: 3000, body: '#1c1412', body2: '#ff5a1f', pattern: 'cracks', skinTone: '#2a1a14', hair: '#ff5a1f', hat: 'horns', hatColor: '#ff5a1f', pack: '#3a221a', glow: '#ff6a00', eyes: '#ffd000' },
  { id: 'cavaliere', name: "Cavaliere d'Argento", tier: 'premium', price: 3000, body: '#b8c2cc', body2: '#6d7a87', pattern: 'armor', skinTone: '#b8c2cc', hair: '#c0392b', hat: 'plume', hatColor: '#c0392b', pack: '#6d7a87', glow: '#e8f2ff' },

  // --- Premi dei rank: gratis, si sbloccano arrivando alla divisione I di ogni rank (e a Campione)
  { id: 'rank-rame', name: 'Guerriero di Rame', tier: 'rank', rank: 0, price: 0, body: '#b4643c', body2: '#ffd0b0', pattern: 'rank', emblem: 'chev1', skinTone: '#e8b98f', hair: '#5e2e16', hat: 'helmet', hatColor: '#8f4a28', pack: '#5e2e16' },
  { id: 'rank-bronzo', name: 'Sentinella di Bronzo', tier: 'rank', rank: 1, price: 0, body: '#a8743a', body2: '#ffe0b0', pattern: 'rank', emblem: 'chev2', skinTone: '#d9a47a', hair: '#553611', hat: 'helmet', hatColor: '#7e5524', pack: '#553611' },
  { id: 'rank-argento', name: "Lama d'Argento", tier: 'rank', rank: 2, price: 0, body: '#aeb9c4', body2: '#ffffff', pattern: 'rank', emblem: 'chev3', skinTone: '#aeb9c4', hair: '#3f6fd8', hat: 'plume', hatColor: '#3f6fd8', pack: '#46515c' },
  { id: 'rank-oro', name: "Campione d'Oro", tier: 'rank', rank: 3, price: 0, body: '#d9a514', body2: '#fff3b0', pattern: 'rank', emblem: 'star', skinTone: '#e3b52a', hair: '#c0392b', hat: 'plume', hatColor: '#c0392b', pack: '#6e5100', glow: '#ffd34d' },
  { id: 'rank-platino', name: 'Custode di Platino', tier: 'rank', rank: 4, price: 0, body: '#22b0a2', body2: '#d6fffa', pattern: 'rank', emblem: 'diamond', skinTone: '#0b544d', hair: '#a3f4ea', hat: 'visor', hatColor: '#a3f4ea', pack: '#0b544d', glow: '#4ff0dd' },
  { id: 'rank-smeraldo', name: 'Signore di Smeraldo', tier: 'rank', rank: 5, price: 0, body: '#1e9e55', body2: '#b6ffd2', pattern: 'rank', emblem: 'gem', skinTone: '#0b4d27', hair: '#86f5b2', hat: 'horns', hatColor: '#86f5b2', pack: '#0b4d27', glow: '#3dff8a', eyes: '#b6ffd2' },
  { id: 'rank-diamante', name: 'Spirito di Diamante', tier: 'rank', rank: 6, price: 0, body: '#6a4fd8', body2: '#ece6ff', pattern: 'rank', emblem: 'bigdiamond', skinTone: '#2a1a6b', hair: '#ddd2ff', hat: 'visor', hatColor: '#ddd2ff', pack: '#3b2585', glow: '#b8a4ff' },
  { id: 'rank-campione', name: 'Il Campione', tier: 'rank', rank: 7, price: 0, body: '#b0103f', body2: '#ffd34d', pattern: 'rank', emblem: 'crown', skinTone: '#f1c7a0', hair: '#2a0812', hat: 'crown', hatColor: '#ffd34d', pack: '#6e0626', glow: '#ff3d7f', eyes: '#ffd34d' },
];

export const TIER_INFO = {
  free: { name: 'Gratis', color: '#9aa4ae' },
  basic: { name: 'Base', color: '#3f9cff' },
  premium: { name: 'Premium', color: '#ffa928' },
  rank: { name: 'Premio rank', color: '#e0245e' },
};

// Indice di rank (0..35) da raggiungere per sbloccare la skin: divisione I del rank, o Campione
export function rankSkinIndex(skin) {
  return skin.rank === 7 ? 35 : skin.rank * 5 + 4;
}

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
