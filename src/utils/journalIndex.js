import { readJson } from './storageStats';

/** @returns {Map<string, { count: number, latestDate: string, snippet: string }>} */
export function getJournalIndexByTicker() {
  const trades = readJson('trades', []);
  const map = new Map();

  for (const t of trades) {
    const ticker = (t.ticker || '').trim().toUpperCase();
    if (!ticker) continue;

    const date = t.date || '';
    const snippet = (t.reasoning || t.outcome || '').trim();
    const prev = map.get(ticker);

    if (!prev) {
      map.set(ticker, { count: 1, latestDate: date, snippet });
      continue;
    }

    const count = prev.count + 1;
    const isNewer = date.localeCompare(prev.latestDate || '') > 0;
    map.set(ticker, {
      count,
      latestDate: isNewer ? date : prev.latestDate,
      snippet: isNewer && snippet ? snippet : prev.snippet || snippet,
    });
  }

  return map;
}

export function tickersWithJournal() {
  return new Set(getJournalIndexByTicker().keys());
}
