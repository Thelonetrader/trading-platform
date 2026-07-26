import { displayChangePct, displayPrice } from './quoteDisplay';
import {
  fmtMktCapMillions,
  listingCurrency,
  marketCapUsd,
  parseCapMillions,
  priceUsd,
} from './fxUsd';
import { matchesAnyContains, matchesAnyTag, normalizeFilterList } from './filterChipLists';
import {
  matchesAnyBetaBand,
  matchesAnyMktCapBand,
  matchesAnyPriceBand,
  effectiveNumericFilters,
} from './screenerQuickFilters';

export { parseCapMillions } from './fxUsd';

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
  { id: 'price', label: 'Last price (USD equiv.)' },
  { id: 'marketCap', label: 'Market cap (USD equiv.)' },
  { id: 'forwardPE', label: 'P/E (TTM)' },
  { id: 'pbRatio', label: 'P/B' },
  { id: 'epsGrowth', label: 'EPS growth' },
  { id: 'revenueGrowth', label: 'Revenue growth' },
  { id: 'fcfYield', label: 'FCF yield' },
  { id: 'dividendYield', label: 'Dividend yield' },
  { id: 'beta', label: 'Beta' },
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'added', label: 'Date added' },
];

const priorityRank = (p) => (p === 'High' ? 0 : p === 'Medium' ? 1 : 2);

export function fmtMktCap(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  return fmtMktCapMillions(v);
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

export function rowMarketCapUsd(row, snap, quote) {
  return marketCapUsd(snap, row);
}

export function rowMarketCap(row, snap, quote) {
  return rowMarketCapUsd(row, snap, quote);
}

export function marketCapFromSnapshots(snapshots, ticker, row = null) {
  const snap = snapshots?.[ticker];
  return marketCapUsd(snap, row);
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
  const n = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function matchesCurrencyFilters(row, snap, filters) {
  const list = normalizeFilterList(filters.currencyFilters);
  if (!list.length) {
    const single = filters.currencyFilter;
    if (!single || single === 'any') return true;
    const ccy = listingCurrency(snap, row);
    if (single === 'non_usd') return ccy !== 'USD';
    return ccy === single;
  }
  const ccy = listingCurrency(snap, row);
  return list.some((id) => {
    if (id === 'non_usd') return ccy !== 'USD';
    return ccy === id;
  });
}

function matchesSectorFilters(row, snap, sectorMatches) {
  const list = normalizeFilterList(sectorMatches);
  if (!list.length) return true;
  const sectorText = `${row.sectorLabel} ${snap?.profile?.sector || ''} ${snap?.profile?.industry || ''}`;
  return matchesAnyContains(sectorText, list);
}

function matchesIndustryFilters(snap, industryMatches) {
  const list = normalizeFilterList(industryMatches);
  if (!list.length) return true;
  const industry = snap?.profile?.industry || '';
  return matchesAnyContains(industry, list);
}

function matchesExchangeFilters(snap, exchangeMatches) {
  const list = normalizeFilterList(exchangeMatches);
  if (!list.length) return true;
  const ex = snap?.profile?.exchange || '';
  return matchesAnyContains(ex, list);
}

function matchesSearchTerms(row, searchTerms) {
  const list = normalizeFilterList(searchTerms);
  if (!list.length) return true;
  const ticker = (row.ticker || '').toUpperCase();
  const name = (row.name || '').toUpperCase();
  return list.some((term) => {
    const q = term.toUpperCase();
    return ticker.includes(q) || name.includes(q);
  });
}

export function filterAndSortRows(rows, filters, quotes, snapshots = {}) {
  const eff = effectiveNumericFilters(filters);
  const minCh = parseOptionalFloat(eff.minChange);
  const maxCh = parseOptionalFloat(eff.maxChange);
  const minRank = parseOptionalFloat(filters.minRank);

  const ratingIds = normalizeFilterList(filters.ratingMatches);
  let minAvg = 0;
  if (ratingIds.length) {
    minAvg = 0;
  } else {
    minAvg = RATING_FILTERS.find((r) => r.id === filters.ratingFilter)?.minAvg ?? 0;
  }

  const minPe = parseOptionalFloat(eff.minPe);
  const maxPe = parseOptionalFloat(eff.maxPe);
  const minPb = parseOptionalFloat(eff.minPb);
  const maxPb = parseOptionalFloat(eff.maxPb);
  const minEpsGrowth = parseOptionalFloat(eff.minEpsGrowth);
  const maxEpsGrowth = parseOptionalFloat(eff.maxEpsGrowth);
  const minRevenueGrowth = parseOptionalFloat(eff.minRevenueGrowth);
  const maxRevenueGrowth = parseOptionalFloat(eff.maxRevenueGrowth);
  const minFcfYield = parseOptionalFloat(eff.minFcfYield);
  const maxFcfYield = parseOptionalFloat(eff.maxFcfYield);
  const minDivYield = parseOptionalFloat(eff.minDivYield);
  const minOperatingMargin = parseOptionalFloat(eff.minOperatingMargin);
  const minGrossMargin = parseOptionalFloat(eff.minGrossMargin);
  const maxNetDebtEbitda = parseOptionalFloat(eff.maxNetDebtEbitda);
  const minInterestCoverage = parseOptionalFloat(eff.minInterestCoverage);
  const minBeta = parseOptionalFloat(eff.minBeta);
  const maxBeta = parseOptionalFloat(eff.maxBeta);
  const minPriceUsd = parseOptionalFloat(eff.minPriceUsd);
  const maxPriceUsd = parseOptionalFloat(eff.maxPriceUsd);
  const minMktCap = parseCapMillions(eff.minMktCapM);
  const maxMktCap = parseCapMillions(eff.maxMktCapM);

  let filtered = rows.filter((row) => {
    const priorityFilter = filters.priorityFilter || { High: true, Medium: true, Low: true };
    if (!priorityFilter[row.priority]) return false;
    if (!matchesSearchTerms(row, filters.searchTerms)) return false;

    const snap = rowSnapshot(snapshots, row.ticker);
    if (!matchesSectorFilters(row, snap, filters.sectorMatches)) return false;
    if (!matchesIndustryFilters(snap, filters.industryMatches)) return false;
    if (!matchesCurrencyFilters(row, snap, filters)) return false;
    if (!matchesExchangeFilters(snap, filters.exchangeMatches)) return false;

    if (!matchesAnyTag(row.tags, filters.tagMatches)) return false;
    if (minRank != null && (row.customRank == null || row.customRank < minRank)) return false;
    if (filters.requireScorecard && !row.eval) return false;
    if (ratingIds.length) {
      if (!row.eval) return false;
      const ok = ratingIds.some((id) => row.eval.avg >= (RATING_FILTERS.find((r) => r.id === id)?.minAvg ?? 0));
      if (!ok) return false;
    } else if (row.eval && row.eval.avg < minAvg) return false;
    else if (!row.eval && minAvg > 0) return false;
    if (filters.journalFilter === 'has' && !row.journal) return false;
    if (filters.journalFilter === 'none' && row.journal) return false;

    const quote = quotes[row.ticker];
    const ch = displayChangePct(quote);
    if (minCh != null && (ch == null || ch < minCh)) return false;
    if (maxCh != null && (ch == null || ch > maxCh)) return false;

    const metrics = mergedMetrics(row, snap);
    const pe = metrics.forwardPE;
    if (minPe != null && (pe == null || pe < minPe)) return false;
    if (maxPe != null && (pe == null || pe > maxPe)) return false;

    const pb = metrics.pbRatio;
    if (minPb != null && (pb == null || pb < minPb)) return false;
    if (maxPb != null && (pb == null || pb > maxPb)) return false;

    if (minEpsGrowth != null && (metrics.epsGrowth == null || metrics.epsGrowth < minEpsGrowth)) return false;
    if (maxEpsGrowth != null && (metrics.epsGrowth == null || metrics.epsGrowth > maxEpsGrowth)) return false;
    if (minRevenueGrowth != null && (metrics.revenueGrowth == null || metrics.revenueGrowth < minRevenueGrowth)) {
      return false;
    }
    if (maxRevenueGrowth != null && (metrics.revenueGrowth == null || metrics.revenueGrowth > maxRevenueGrowth)) {
      return false;
    }
    if (minFcfYield != null && (metrics.fcfYield == null || metrics.fcfYield < minFcfYield)) return false;
    if (maxFcfYield != null && (metrics.fcfYield == null || metrics.fcfYield > maxFcfYield)) return false;
    if (minDivYield != null && (metrics.dividendYield == null || metrics.dividendYield < minDivYield)) return false;
    if (minOperatingMargin != null && (metrics.operatingMargin == null || metrics.operatingMargin < minOperatingMargin)) {
      return false;
    }
    if (minGrossMargin != null && (metrics.grossMargin == null || metrics.grossMargin < minGrossMargin)) return false;
    if (maxNetDebtEbitda != null && (metrics.netDebtEbitda == null || metrics.netDebtEbitda > maxNetDebtEbitda)) {
      return false;
    }
    if (
      minInterestCoverage != null &&
      (metrics.interestCoverage == null || metrics.interestCoverage < minInterestCoverage)
    ) {
      return false;
    }

    const beta = snap?.profile?.beta ?? metrics.beta;
    const betaBand = matchesAnyBetaBand(beta, filters.betaBandIds);
    if (betaBand === false) return false;
    if (minBeta != null && (beta == null || beta < minBeta)) return false;
    if (maxBeta != null && (beta == null || beta > maxBeta)) return false;

    const pxUsd = priceUsd(quote, snap, row);
    const priceBand = matchesAnyPriceBand(pxUsd, filters.priceBandIds);
    if (priceBand === false) return false;
    if (minPriceUsd != null && (pxUsd == null || pxUsd < minPriceUsd)) return false;
    if (maxPriceUsd != null && (pxUsd == null || pxUsd > maxPriceUsd)) return false;

    const mcapUsd = rowMarketCapUsd(row, snap, quote);
    const capBand = matchesAnyMktCapBand(mcapUsd, filters.mktCapBandIds);
    if (capBand === false) return false;
    if (minMktCap != null && (mcapUsd == null || mcapUsd < minMktCap)) return false;
    if (maxMktCap != null && (mcapUsd == null || mcapUsd > maxMktCap)) return false;

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
      const pa = priceUsd(quotes[a.ticker], rowSnapshot(snapshots, a.ticker), a) ?? -Infinity;
      const pb = priceUsd(quotes[b.ticker], rowSnapshot(snapshots, b.ticker), b) ?? -Infinity;
      return pb - pa;
    }
    if (sortBy === 'marketCap') {
      const ma = rowMarketCapUsd(a, rowSnapshot(snapshots, a.ticker), quotes[a.ticker]) ?? -Infinity;
      const mb = rowMarketCapUsd(b, rowSnapshot(snapshots, b.ticker), quotes[b.ticker]) ?? -Infinity;
      return mb - ma;
    }
    if (sortBy === 'forwardPE') {
      const ma = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).forwardPE ?? Infinity;
      const mb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).forwardPE ?? Infinity;
      return ma - mb;
    }
    if (sortBy === 'pbRatio') {
      const ma = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).pbRatio ?? Infinity;
      const mb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).pbRatio ?? Infinity;
      return ma - mb;
    }
    if (sortBy === 'epsGrowth') {
      const ga = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).epsGrowth ?? -Infinity;
      const gb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).epsGrowth ?? -Infinity;
      return gb - ga;
    }
    if (sortBy === 'revenueGrowth') {
      const ga = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).revenueGrowth ?? -Infinity;
      const gb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).revenueGrowth ?? -Infinity;
      return gb - ga;
    }
    if (sortBy === 'fcfYield') {
      const fa = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).fcfYield ?? -Infinity;
      const fb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).fcfYield ?? -Infinity;
      return fb - fa;
    }
    if (sortBy === 'dividendYield') {
      const fa = mergedMetrics(a, rowSnapshot(snapshots, a.ticker)).dividendYield ?? -Infinity;
      const fb = mergedMetrics(b, rowSnapshot(snapshots, b.ticker)).dividendYield ?? -Infinity;
      return fb - fa;
    }
    if (sortBy === 'beta') {
      const ba = rowSnapshot(snapshots, a.ticker)?.profile?.beta ?? -Infinity;
      const bb = rowSnapshot(snapshots, b.ticker)?.profile?.beta ?? -Infinity;
      return bb - ba;
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
