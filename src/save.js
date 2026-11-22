// Salvataggio di monete, skin e statistiche nel browser (localStorage).
// Se il browser blocca il salvataggio, il gioco funziona lo stesso ma non ricorda i progressi.

const KEY = 'zonaBattle.save.v1';

const DEFAULT = {
  coins: 0,
  owned: ['recluta', 'ranger'],
  selected: 'recluta',
  wins: 0,
  matches: 0,
  kills: 0,
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
