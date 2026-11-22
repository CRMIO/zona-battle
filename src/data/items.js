// Oggetti consumabili (cure e scudi) e munizioni.

// kind: 'hp' cura la vita, 'shield' ricarica lo scudo. max = fino a quanto può arrivare.
export const ITEMS = {
  bandage: { name: 'Bende', kind: 'hp', amount: 15, max: 75, time: 2.2, stack: 15, give: 5, weight: 35, color: '#5fcf5a' },
  medkit: { name: 'Medikit', kind: 'hp', amount: 100, max: 100, time: 6, stack: 3, give: 1, weight: 14, color: '#3f9cff' },
  shieldSmall: { name: 'Pozione scudo piccola', kind: 'shield', amount: 25, max: 50, time: 1.8, stack: 6, give: 3, weight: 30, color: '#5fcf5a' },
  shieldBig: { name: 'Pozione scudo', kind: 'shield', amount: 50, max: 100, time: 4, stack: 3, give: 1, weight: 16, color: '#3f9cff' },
};

export const AMMO = {
  light: { name: 'Munizioni leggere', short: 'Leggere', color: '#9fd3ff', give: 30 },
  medium: { name: 'Munizioni medie', short: 'Medie', color: '#7ee07e', give: 30 },
  heavy: { name: 'Munizioni pesanti', short: 'Pesanti', color: '#ff8a6b', give: 6 },
  shells: { name: 'Cartucce', short: 'Cartucce', color: '#ffd36b', give: 8 },
};
