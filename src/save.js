// Salvataggio di monete, skin, rank e statistiche nel browser (localStorage).
// Se il browser blocca il salvataggio, il gioco funziona lo stesso ma non ricorda i progressi.

const KEY = 'zonaBattle.save.v1';

const DEFAULT = {
  coins: 0,
  owned: ['recluta', 'ranger'],
  selected: 'recluta',
  wins: 0,
  matches: 0,
  kills: 0,
  rp: { build: 0, zero: 0 },           // punti rank per modalità (con costruzioni / zero costruzioni)
  bestRp: { build: 0, zero: 0 },       // record di punti rank: le skin dei rank restano anche se scendi
  mode: { build: true, ranked: false }, // ultima modalità scelta nella lobby
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        ...DEFAULT,
        ...data,
        owned: Array.from(new Set([...DEFAULT.owned, ...(data.owned || [])])),
        rp: { ...DEFAULT.rp, ...(data.rp || {}) },
        bestRp: { ...DEFAULT.bestRp, ...(data.bestRp || {}) },
        mode: { ...DEFAULT.mode, ...(data.mode || {}) },
      };
    }
  } catch (e) {
    // dati corrotti o accesso negato: si riparte da zero
  }
  return JSON.parse(JSON.stringify(DEFAULT));
}

export function storeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    // salvataggio non disponibile (es. navigazione privata)
  }
}

export function modeKey(mode) {
  return mode.build ? 'build' : 'zero';
}

export function modeName(mode) {
  return `${mode.ranked ? 'Classificata' : 'Non classificata'} · ${mode.build ? 'Costruzioni' : 'Zero Costruzioni'}`;
}
