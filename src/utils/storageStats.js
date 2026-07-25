import { effectiveHoldingPrice } from './portfolioPricing';

export function readJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getPortfolioStats(quotes = {}) {
  const holdings = readJson('portfolio');
  const totalValue = holdings.reduce((sum, h) => {
    const shares = parseFloat(h.shares) || 0;
    const price = effectiveHoldingPrice(h, quotes);
    return sum + shares * price;
  }, 0);
  const totalCost = holdings.reduce((sum, h) => {
    const shares = parseFloat(h.shares) || 0;
    const cost = parseFloat(h.avgBuyPrice) || 0;
    return sum + shares * cost;
  }, 0);
  const plPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  return {
    holdingsCount: holdings.length,
    totalValue,
    plPct,
  };
}

export function getWatchlistSymbols() {
  return readJson('watchlist')
    .map((s) => ({
      ticker: (s.ticker || '').toUpperCase(),
      exchange: s.exchange || 'SMART',
      currency: s.currency || 'USD',
    }))
    .filter((s) => s.ticker);
}

export function getJournalCount() {
  return readJson('trades').length;
}

export function formatGbp(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
