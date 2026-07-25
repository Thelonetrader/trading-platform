import { readJson } from './storageStats';
import { getJournalIndexByTicker } from './journalIndex';
import { getBestEvalForTicker } from '../scorecards/storage';

/** Watchlist + journal + scorecard snapshot for one ticker. */
export function getSymbolResearchContext(ticker) {
  const sym = (ticker || '').trim().toUpperCase();
  if (!sym) return null;

  const watch = readJson('watchlist', []).find(
    (w) => (w.ticker || '').trim().toUpperCase() === sym,
  );
  const journal = getJournalIndexByTicker().get(sym);
  const scorecard = getBestEvalForTicker(sym);

  return { ticker: sym, watch, journal, scorecard };
}
