import {
  DOW30_TICKERS,
  MAG7_TICKERS,
  SP50_SAMPLE_TICKERS,
} from '../data/screenerIndexLists';
import { getBestEvalForTicker, listScorecardEvals } from '../scorecards/storage';
import { computeCustomRank, getRankWeights, parseTags } from './customRank';
import { readJson } from './storageStats';

const STATIC_LISTS = {
  mag7: MAG7_TICKERS,
  dow30: DOW30_TICKERS,
  sp50: SP50_SAMPLE_TICKERS,
};

export function parseCustomUniverse(text) {
  const raw = (text || '').replace(/\n/g, ',').split(/[,;\s]+/);
  const out = [];
  const seen = new Set();
  for (const part of raw) {
    const t = part.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function resolveUniverseTickers(universeId, customUniverse = '', extraTickers = []) {
  const watchlist = readJson('watchlist', []);
  const portfolio = readJson('portfolio', []);
  const evals = listScorecardEvals();
  const tickers = new Set();

  const add = (t) => {
    const u = (t || '').trim().toUpperCase();
    if (u) tickers.add(u);
  };

  switch (universeId) {
    case 'global':
      watchlist.forEach((w) => add(w.ticker));
      portfolio.forEach((h) => add(h.ticker));
      evals.forEach((e) => add(e.ticker));
      (STATIC_LISTS.mag7 || []).forEach(add);
      (STATIC_LISTS.dow30 || []).forEach(add);
      (STATIC_LISTS.sp50 || []).forEach(add);
      break;
    case 'library':
      evals.forEach((e) => add(e.ticker));
      break;
    case 'portfolio':
      portfolio.forEach((h) => add(h.ticker));
      break;
    case 'combined':
      watchlist.forEach((w) => add(w.ticker));
      portfolio.forEach((h) => add(h.ticker));
      evals.forEach((e) => add(e.ticker));
      break;
    case 'mag7':
    case 'dow30':
    case 'sp50':
      (STATIC_LISTS[universeId] || []).forEach(add);
      break;
    case 'custom':
      parseCustomUniverse(customUniverse).forEach(add);
      break;
    case 'watchlist':
    default:
      watchlist.forEach((w) => add(w.ticker));
      break;
  }

  for (const t of extraTickers || []) {
    add(t);
  }

  return [...tickers].sort();
}

function sectorFromWatchlistLabel(sectorText) {
  const s = (sectorText || '').toLowerCase();
  if (s.includes('tech') || s.includes('software') || s.includes('saas')) return 'tech';
  if (s.includes('energy') || s.includes('oil') || s.includes('commod')) return 'energy';
  if (s.includes('bank') || s.includes('financ') || s.includes('insur')) return 'financial';
  if (s.includes('health') || s.includes('pharma') || s.includes('biotech')) return 'healthcare';
  if (s.includes('consumer') || s.includes('staples') || s.includes('retail') || s.includes('industrial')) {
    return 'consumer';
  }
  return 'core';
}

/** Build screener rows for any resolved universe (merges watchlist metadata when present). */
export function buildUniverseRows(tickers, journalIndex, weights = getRankWeights(), nameByTicker = {}) {
  const watchlist = readJson('watchlist', []);
  const watchByTicker = new Map(
    watchlist.map((w) => [(w.ticker || '').trim().toUpperCase(), w]),
  );

  return tickers.map((ticker) => {
    const item = watchByTicker.get(ticker);
    const pickedName = nameByTicker[ticker] || nameByTicker[ticker?.toUpperCase?.()] || '';
    const base = item || {
      id: `uni-${ticker}`,
      ticker,
      name: pickedName,
      sector: '',
      priority: 'Medium',
      exchange: 'SMART',
      currency: 'USD',
      addedDate: '',
    };
    const evalRow = getBestEvalForTicker(ticker);
    const journal = journalIndex.get(ticker);
    const { score } = computeCustomRank({ watch: base, evalRow, journal, weights });
    return {
      id: base.id,
      ticker,
      name: base.name || '',
      sectorLabel: base.sector || '',
      sectorId: evalRow?.sectorId || sectorFromWatchlistLabel(base.sector),
      priority: base.priority || 'Medium',
      notes: base.notes || '',
      tags: parseTags(base.tags),
      customRank: score,
      buyPrice: base.buyPrice,
      addedDate: base.addedDate,
      exchange: base.exchange || 'SMART',
      currency: base.currency || 'USD',
      eval: evalRow,
      journal,
      onWatchlist: !!item,
    };
  });
}
