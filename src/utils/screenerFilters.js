import { displayChangePct, displayPrice } from './quoteDisplay';

export const RATING_FILTERS = [
  { id: 'any', label: 'Any rating', minAvg: 0 },
  { id: 'hold+', label: 'Hold+ (≥2.5)', minAvg: 2.5 },
  { id: 'buy+', label: 'Buy+ (≥3.5)', minAvg: 3.5 },
  { id: 'sb', label: 'Strong Buy (≥4.5)', minAvg: 4.5 },
];

export const SORT_OPTIONS = [
  { id: 'priority', label: 'Priority' },
  { id: 'score', label: 'Fundamental score' },
  { id: 'rank', label: 'Custom rank' },
  { id: 'change', label: 'Day change %' },
  { id: 'price', label: 'Last price' },
  { id: 'marketCap', label: 'Market cap' },
  { id: 'forwardPE', label: 'P/E (TTM)' },
  { id: 'epsGrowth', label: 'EPS growth' },
  { id: 'fcfYield', label: 'FCF yield' },
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'added', label: 'Date added' },
];

const priorityRank = (p) => (p === 'High' ? 0 : p === 'Medium' ? 1 : 2);

export function fmtMktCap(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return String(Math.round(v));
}

export function fmtMetric(v, digits = 2) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
}

export function rowSnapshot(snapshots, ticker) {
  return snapshots?.[ticker] || null;
}

export function mergedMetrics(row, snap) {
  return { ...(snap?.metrics || {}), ...(row.eval?.metrics || {}) };
}

export function rowMarketCap(row, snap, quote) {
  const m = snap?.profile?.mktCap;
  if (m != null && Number(m) > 0) return Number(m);
  return null;
}

export function rowLastPrice(quote, snap) {
  const ib = displayPrice(quote);
  if (ib != null) return ib;
  const p = snap?.profile?.price;
  if (p != null && Number(p) > 0) return Number(p);
  return null;
}

function parseOptionalFloat(raw) {
  if (raw === '' || raw == null) return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export function filterAndSortRows(rows, filters, quotes, snapshots = {}) {
  const q = filters.search.trim().toUpperCase();
  const sectorQ = filters.sectorQuery.trim().toLowerCase();
  const minCh = parseOptionalFloat(filters.minChange);
  const maxCh = parseOptionalFloat(filters.maxChange);
  const minAvg = RATING_FILTERS.find((r) => r.id === filters.ratingFilter)?.minAvg ?? 0;
  const minRank = parseOptionalFloat(filters.minRank);
  const tagQ = (filters.tagQuery || '').trim().toLowerCase();

  const minPe = parseOptionalFloat(filters.minPe);
  const maxPe = parseOptionalFloat(filters.maxPe);
  const minEpsGrowth = parseOptionalFloat(filters.minEpsGrowth);
  const minFcfYield = parseOptionalFloat(filters.minFcfYield);

  let filtered = rows.filter((row) => {
    if (!filters.priorityFilter[row.priority]) return false;
    if (q && !row.ticker.includes(q) && !row.name.toUpperCase().includes(q)) return false;
    if (sectorQ) {
      const snap = rowSnapshot(snapshots, row.ticker);
      const sectorText = `${row.sectorLabel} ${snap?.profile?.sector || ''} ${snap?.profile?.industry || ''}`.toLowerCase();
      if (!sectorText.includes(sectorQ)) return false;
    }
    if (tagQ && !row.tags.some((t) => t.toLowerCase().includes(tagQ))) return false;
    if (minRank != null && (row.customRank == null || row.customRank < minRank)) return false;
    if (filters.requireScorecard && !row.eval) return false;
    if (row.eval && row.eval.avg < minAvg) return false;
    if (!row.eval && minAvg > 0) return false;
    if (filters.journalFilter === 'has' && !row.journal) return false;
    if (filters.journalFilter === 'none' && row.journal) return false;

    const quote = quotes[row.ticker];
    const ch = displayChangePct(quote);
    if (minCh != null && (ch == null || ch < minCh)) return false;
    if (maxCh != null && (ch == null || ch > maxCh)) return false;

    const snap = rowSnapshot(snapshots, row.ticker);
    const metrics = mergedMetrics(row, snap);
    const pe = metrics.forwardPE;
    if (minPe != null && (pe == null || pe < minPe)) return false;
    if (maxPe != null && (pe == null || pe > maxPe)) return false;
    if (minEpsGrowth != null && (metrics.epsGrowth == null || metrics.epsGrowth < minEpsGrowth)) return false;
    if (minFcfYield != null && (metrics.fcfYield == null || metrics.fcfYield < minFcfYield)) return false;

    return true;
  });

  const sortBy = filters.sortBy || 'priority';

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
    if (sortBy === 'added') return (b.addedDate || '').localeCompare(a.addedDate || '');
    if (sortBy === 'score') {
      return (b.eval?.avg ?? -1) - (a.eval?.avg ?? -1);
    }
    if (sortBy === 'rank') {
      return (b.customRank ?? -1) - (a.customRank ?? -1);
    }
    if (sortBy === 'change') {
      const ca = displayChangePct(quotes[a.ticker]) ?? -Infinity;
      const cb = displayChangePct(quotes[b.ticker]) ?? -Infinity;
      return cb - ca;
    }
    if (sortBy === 'price') {
      const pa = rowLastPrice(quotes[a.ticker], rowSnapshot(snapshots, a.ticker)) ?? -Infinity;
      const pb = rowLastPrice(quotes[b.ticker], rowSnapshot(snapshots, b.ticker)) ?? -Infinity;
      return pb - pa;
    }
    if (sortBy === 'marketCap') {
      const ma = rowMarketCap(a, rowSnapshot(snapshots, a.ticker), quotes[a.ticker]) ?? -Infinity;
      const mb = rowMarketCap(b, rowSnapshot(snapshots, b.ticker), quotes[b.ticker]) ?? -Infinity;
      return mb - ma;
    }
    if (sortBy === 'forwardPE') {
      const ma = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).forwardPE ?? Infinity;
      const mb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).forwardPE ?? Infinity;
      return ma - mb;
    }
    if (sortBy === 'epsGrowth') {
      const ga = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).epsGrowth ?? -Infinity;
      const gb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).epsGrowth ?? -Infinity;
      return gb - ga;
    }
    if (sortBy === 'fcfYield') {
      const fa = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).fcfYield ?? -Infinity;
      const fb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).fcfYield ?? -Infinity;
      return fb - fa;
    }
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    return a.ticker.localeCompare(b.ticker);
  });

  return filtered;
}

export function countLiveQuotes(tickers, quotes) {
  let n = 0;
  for (const t of tickers) {
    if (displayPrice(quotes[t]) != null) n += 1;
  }
  return n;
}
