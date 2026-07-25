import { getBestEvalForTicker } from '../scorecards/storage';
import { getJournalIndexByTicker } from './journalIndex';
import { readJson } from './storageStats';
import { quoteForSymbol } from './quoteDisplay';

export const RANK_WEIGHTS_KEY = 'rankWeights';

export const DEFAULT_RANK_WEIGHTS = {
  scorecard: 45,
  priority: 25,
  journal: 20,
  notes: 10,
};

export function getRankWeights() {
  try {
    const raw = localStorage.getItem(RANK_WEIGHTS_KEY);
    if (!raw) return { ...DEFAULT_RANK_WEIGHTS };
    return { ...DEFAULT_RANK_WEIGHTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RANK_WEIGHTS };
  }
}

export function saveRankWeights(weights) {
  localStorage.setItem(RANK_WEIGHTS_KEY, JSON.stringify({ ...DEFAULT_RANK_WEIGHTS, ...weights }));
}

export function parseTags(raw) {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function priorityScore(priority) {
  if (priority === 'High') return 100;
  if (priority === 'Low') return 25;
  return 55;
}

function journalScore(journal) {
  if (!journal) return 0;
  return Math.min(100, 35 + journal.count * 20);
}

/** @returns {{ score: number, breakdown: object }} */
export function computeCustomRank({ watch, evalRow, journal, weights = getRankWeights() }) {
  const w = weights;
  const totalW = w.scorecard + w.priority + w.journal + w.notes || 1;

  const parts = {
    scorecard: evalRow ? (evalRow.avg / 5) * 100 : 0,
    priority: priorityScore(watch?.priority),
    journal: journalScore(journal),
    notes: watch?.notes?.trim() ? 100 : 0,
  };

  const score =
    (parts.scorecard * w.scorecard +
      parts.priority * w.priority +
      parts.journal * w.journal +
      parts.notes * w.notes) /
    totalW;

  return { score: Math.round(score * 10) / 10, breakdown: parts };
}

export function buildRankContextForTicker(ticker, watchlist = readJson('watchlist', [])) {
  const sym = (ticker || '').trim().toUpperCase();
  const watch = watchlist.find((w) => (w.ticker || '').trim().toUpperCase() === sym);
  const journal = getJournalIndexByTicker().get(sym);
  const evalRow = getBestEvalForTicker(sym);
  const { score, breakdown } = computeCustomRank({ watch, evalRow, journal });
  return {
    ticker: sym,
    watch,
    journal,
    eval: evalRow,
    tags: parseTags(watch?.tags),
    customRank: score,
    rankBreakdown: breakdown,
  };
}

export function rankAllWatchlistItems(quotes = {}) {
  const watchlist = readJson('watchlist', []);
  const journalIndex = getJournalIndexByTicker();
  const weights = getRankWeights();

  return watchlist.map((item) => {
    const ticker = (item.ticker || '').trim().toUpperCase();
    const evalRow = getBestEvalForTicker(ticker);
    const journal = journalIndex.get(ticker);
    const { score, breakdown } = computeCustomRank({ watch: item, evalRow, journal, weights });
    return {
      ticker,
      watch: item,
      eval: evalRow,
      journal,
      tags: parseTags(item.tags),
      customRank: score,
      rankBreakdown: breakdown,
      quote: quoteForSymbol(quotes, ticker),
    };
  });
}
