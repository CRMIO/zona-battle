// Rank delle partite classificate: 7 livelli con 5 divisioni (V → I) e in cima il Campione.
// Ogni divisione vale 100 RP (punti rank).

export const TIERS = [
  { id: 'rame', name: 'Rame', color: '#b4643c', light: '#eaa47c', dark: '#5e2e16' },
  { id: 'bronzo', name: 'Bronzo', color: '#a8743a', light: '#e6b77c', dark: '#553611' },
  { id: 'argento', name: 'Argento', color: '#94a2b0', light: '#eef3f7', dark: '#46515c' },
  { id: 'oro', name: 'Oro', color: '#d9a514', light: '#ffe67d', dark: '#6e5100' },
  { id: 'platino', name: 'Platino', color: '#22b0a2', light: '#a3f4ea', dark: '#0b544d' },
  { id: 'smeraldo', name: 'Smeraldo', color: '#1e9e55', light: '#86f5b2', dark: '#0b4d27' },
  { id: 'diamante', name: 'Diamante', color: '#8a6cf0', light: '#ddd2ff', dark: '#3b2585' },
  { id: 'campione', name: 'Campione', color: '#e0245e', light: '#ffb0c8', dark: '#6e0626' },
];

export const DIVISIONS = ['V', 'IV', 'III', 'II', 'I'];
export const RP_PER_DIV = 100;
export const CHAMPION_RP = (TIERS.length - 1) * DIVISIONS.length * RP_PER_DIV; // 3500

export function rankFromRP(rp) {
  rp = Math.max(0, Math.floor(rp));
  if (rp >= CHAMPION_RP) {
    return { index: 35, tierIndex: 7, tier: TIERS[7], div: '', name: 'Campione', progress: 1, floor: CHAMPION_RP, nextAt: null, rp };
  }
  const index = Math.floor(rp / RP_PER_DIV);
  const t = Math.floor(index / DIVISIONS.length);
  const d = index % DIVISIONS.length;
  return {
    index,
    tierIndex: t,
    tier: TIERS[t],
    div: DIVISIONS[d],
    name: `${TIERS[t].name} ${DIVISIONS[d]}`,
    progress: (rp % RP_PER_DIV) / RP_PER_DIV,
    floor: index * RP_PER_DIV,
    nextAt: (index + 1) * RP_PER_DIV,
    rp,
  };
}

// Tutti i rank in ordine, dal più scarso al migliore
export function allRanks() {
  const list = [];
  for (let rp = 0; rp < CHAMPION_RP; rp += RP_PER_DIV) list.push(rankFromRP(rp));
  list.push(rankFromRP(CHAMPION_RP));
  return list;
}

export function nextRankName(rank) {
  return rank.nextAt === null ? null : rankFromRP(rank.nextAt).name;
}

// Punti guadagnati o persi in una partita classificata.
// Più sei in alto, più costa entrare in partita e meno valgono le eliminazioni.
export function matchRP({ place, kills, rp }) {
  const r = rankFromRP(rp);
  const cost = 6 + r.tierIndex * 4;
  const placePts = place === 1 ? 70 : place <= 5 ? 45 : place <= 10 ? 32 : place <= 25 ? 20 : place <= 50 ? 10 : 0;
  const killPts = kills * Math.max(4, 10 - r.tierIndex);
  return { cost, placePts, killPts, delta: placePts + killPts - cost };
}

// Quanto sono forti i bot (0..1): nelle classificate dipende dal tuo rank
export function botSkillRange(ranked, rp) {
  if (!ranked) return [0.5, 0.85];
  const t = rankFromRP(rp).tierIndex;
  const c = 0.45 + t * 0.075;
  return [Math.max(0.3, c - 0.12), Math.min(0.98, c + 0.08)];
}

let badgeId = 0;

// Stemma del rank in SVG (per la lobby e la schermata finale)
export function rankBadgeSVG(rank, size = 64) {
  const t = rank.tier;
  const id = 'rb' + badgeId++;
  const emblems = [
    '<path d="M32 58 L50 46 L68 58" />',
    '<path d="M32 52 L50 40 L68 52" /><path d="M32 64 L50 52 L68 64" />',
    '<path d="M30 48 L50 36 L70 48" /><path d="M30 58 L50 46 L70 58" /><path d="M30 68 L50 56 L70 68" />',
    '<path d="M50 32 L55 45 L69 45 L58 54 L62 68 L50 60 L38 68 L42 54 L31 45 L45 45 Z" fill="currentColor"/>',
    '<path d="M50 30 L66 50 L50 70 L34 50 Z" fill="currentColor"/>',
    '<path d="M40 34 L60 34 L70 48 L50 70 L30 48 Z" fill="currentColor"/><path d="M30 48 L70 48 M40 34 L50 48 L60 34 M50 48 L50 70" />',
    '<path d="M38 32 L62 32 L72 46 L50 72 L28 46 Z" fill="currentColor"/><path d="M28 46 L72 46 M38 32 L44 46 L50 32 L56 46 L62 32 M44 46 L50 72 L56 46" />',
    '<path d="M28 62 L30 38 L40 50 L50 32 L60 50 L70 38 L72 62 Z" fill="currentColor"/><path d="M28 66 L72 66" />',
  ];
  const emblem = emblems[rank.tierIndex];
  return `<svg class="rank-badge" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="${rank.name}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.light}"/><stop offset="1" stop-color="${t.color}"/></linearGradient></defs>
    <path d="M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z" fill="${t.dark}"/>
    <path d="M50 11 L84 31 L84 69 L50 89 L16 69 L16 31 Z" fill="url(#${id})" stroke="${t.dark}" stroke-width="2"/>
    <g fill="none" stroke="${t.dark}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" style="color:${t.dark}">${emblem}</g>
    ${rank.div ? `<text x="50" y="${rank.tierIndex >= 3 ? 86 : 84}" text-anchor="middle" font-size="19" font-weight="900" font-family="system-ui,sans-serif" fill="${t.dark}">${rank.div}</text>` : ''}
  </svg>`;
}
