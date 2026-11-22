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
];

export const TIER_INFO = {
  free: { name: 'Gratis', color: '#9aa4ae' },
  basic: { name: 'Base', color: '#3f9cff' },
  premium: { name: 'Premium', color: '#ffa928' },
};

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
