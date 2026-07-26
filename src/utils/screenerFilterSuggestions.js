import { SECTORS } from '../scorecards/model';
import {
  SCREENER_CURRENCY_OPTIONS,
  SCREENER_EXCHANGE_OPTIONS,
  SCREENER_INDUSTRY_OPTIONS,
  SCREENER_SECTOR_OPTIONS,
  SCREENER_TAG_OPTIONS,
} from '../data/screenerFilterOptions';
import { parseTags } from './customRank';

function uniqSorted(values) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}

function mergeOptions(staticList, dynamicValues) {
  const skip = new Set(['any', '']);
  const out = new Set();
  for (const s of staticList) {
    const t = String(s).trim();
    if (!t || skip.has(t.toLowerCase())) continue;
    out.add(t);
  }
  for (const d of dynamicValues || []) {
    const t = String(d).trim();
    if (t) out.add(t);
  }
  return uniqSorted([...out]);
}

/**
 * @param {{ snapshots?: object, rows?: object[] }} ctx
 */
export function buildScreenerFilterSuggestions(ctx = {}) {
  const { snapshots = {}, rows = [] } = ctx;
  const sectors = new Set();
  const industries = new Set();
  const exchanges = new Set();
  const tags = new Set();
  const tickers = new Set();
  const names = new Set();

  for (const meta of Object.values(SECTORS)) {
    if (meta?.label) sectors.add(meta.label);
  }

  for (const snap of Object.values(snapshots)) {
    const p = snap?.profile;
    if (!p) continue;
    if (p.sector) sectors.add(p.sector);
    if (p.industry) industries.add(p.industry);
    if (p.exchange) exchanges.add(p.exchange);
    if (p.companyName) names.add(p.companyName);
  }

  for (const row of rows) {
    if (row.ticker) tickers.add(row.ticker);
    if (row.name) names.add(row.name);
    if (row.sectorLabel) sectors.add(row.sectorLabel);
    if (row.exchange && row.exchange !== 'SMART') exchanges.add(row.exchange);
    for (const t of row.tags || []) tags.add(t);
  }

  return {
    sectors: mergeOptions(SCREENER_SECTOR_OPTIONS, [...sectors]),
    industries: mergeOptions(SCREENER_INDUSTRY_OPTIONS, [...industries]),
    exchanges: mergeOptions(SCREENER_EXCHANGE_OPTIONS, [...exchanges]),
    tags: mergeOptions(SCREENER_TAG_OPTIONS, [...tags]),
    tickers: uniqSorted([...tickers]),
    names: uniqSorted([...names]).slice(0, 200),
  };
}

export function searchComboOptions(suggestions, query) {
  const q = (query || '').trim().toUpperCase();
  if (!q) return suggestions.tickers.slice(0, 40);
  const out = [];
  for (const t of suggestions.tickers) {
    if (t.includes(q)) out.push(t);
    if (out.length >= 25) break;
  }
  const qLower = q.toLowerCase();
  for (const n of suggestions.names) {
    if (n.toLowerCase().includes(qLower)) out.push(n);
    if (out.length >= 40) break;
  }
  return uniqSorted(out).slice(0, 40);
}

/** Suggestions from watchlist rows only (Alerts, Watchlist forms). */
export function buildWatchlistFilterSuggestions(watchlistItems = []) {
  const rows = (watchlistItems || []).map((w) => ({
    ticker: (w.ticker || '').trim().toUpperCase(),
    name: w.name || '',
    sectorLabel: w.sector || '',
    exchange: w.exchange || '',
    currency: w.currency || '',
    tags: typeof w.tags === 'string' ? parseTags(w.tags) : w.tags || [],
  }));

  const base = buildScreenerFilterSuggestions({ snapshots: {}, rows });
  const currencies = new Set(SCREENER_CURRENCY_OPTIONS);
  for (const w of watchlistItems || []) {
    if (w.currency) currencies.add(String(w.currency).toUpperCase());
  }
  return {
    ...base,
    currencies: uniqSorted([...currencies]),
  };
}
