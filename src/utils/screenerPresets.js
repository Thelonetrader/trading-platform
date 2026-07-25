import { readJson } from './storageStats';

const STORAGE_KEY = 'screenerPresets';

export function listScreenerPresets() {
  return readJson(STORAGE_KEY, []);
}

export function saveScreenerPreset(name, filters) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const list = listScreenerPresets();
  const existing = list.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const entry = {
    id: existing?.id ?? Date.now(),
    name: trimmed,
    filters,
    updatedAt: new Date().toISOString(),
  };

  const next = existing
    ? list.map((p) => (p.id === existing.id ? entry : p))
    : [entry, ...list];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function deleteScreenerPreset(id) {
  const next = listScreenerPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const DEFAULT_SCREENER_FILTERS = {
  priorityFilter: { High: true, Medium: true, Low: true },
  sectorQuery: '',
  ratingFilter: 'hold+',
  requireScorecard: false,
  journalFilter: 'any',
  minChange: '',
  maxChange: '',
  sortBy: 'priority',
  search: '',
  tagQuery: '',
  minRank: '',
  universeId: 'watchlist',
  customUniverse: '',
  minPe: '',
  maxPe: '',
  minEpsGrowth: '',
  minFcfYield: '',
};
