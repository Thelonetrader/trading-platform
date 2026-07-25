import { readJson } from '../utils/storageStats';
import { SECTORS, calcAvg, getRating } from './model';

const STORAGE_KEY = 'scorecardEvals';

export function listScorecardEvals() {
  return readJson(STORAGE_KEY, []);
}

export function upsertScorecardEval({ ticker, sectorId, values, displayName }) {
  const sector = SECTORS[sectorId];
  if (!sector || !ticker) return null;

  const tickerU = String(ticker).trim().toUpperCase();
  if (!tickerU) return null;

  const avg = calcAvg(sector.metrics, values);
  const rating = getRating(avg);
  const id = `${tickerU}:${sectorId}`;

  const entry = {
    id,
    ticker: tickerU,
    sectorId,
    displayName: (displayName || tickerU).trim() || tickerU,
    values,
    avg,
    ratingLabel: rating.label,
    ratingShort: rating.short,
    updatedAt: new Date().toISOString(),
  };

  const list = listScorecardEvals();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return entry;
}

export function getScorecardEval(ticker, sectorId) {
  const tickerU = String(ticker || '').trim().toUpperCase();
  if (!tickerU || !sectorId) return null;
  return listScorecardEvals().find((e) => e.ticker === tickerU && e.sectorId === sectorId) || null;
}

/** Best saved eval for a ticker (highest composite score). */
export function getBestEvalForTicker(ticker) {
  const tickerU = String(ticker || '').trim().toUpperCase();
  if (!tickerU) return null;
  const matches = listScorecardEvals().filter((e) => e.ticker === tickerU);
  if (!matches.length) return null;
  return matches.reduce((best, e) => (e.avg > best.avg ? e : best), matches[0]);
}

export function deleteScorecardEval(id) {
  const list = listScorecardEvals().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
