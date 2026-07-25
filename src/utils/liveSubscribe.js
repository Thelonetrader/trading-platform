import { getPortfolioSubscribeSymbols } from './portfolioPricing';
import { getWatchlistSymbols, readJson } from './storageStats';

export const WATCHLIST_CHANGED_EVENT = 'watchlist-changed';

export function dispatchWatchlistChanged() {
  window.dispatchEvent(new Event(WATCHLIST_CHANGED_EVENT));
}

function contractEntry(ticker, exchange, currency, primaryExch) {
  const t = (ticker || '').trim().toUpperCase();
  if (!t) return null;
  const entry = {
    ticker: t,
    exchange: exchange || 'SMART',
    currency: currency || 'USD',
  };
  if (primaryExch) entry.primaryExch = primaryExch;
  return entry;
}

function entryForTicker(ticker) {
  const sym = (ticker || '').trim().toUpperCase();
  const w = readJson('watchlist', []).find((x) => (x.ticker || '').toUpperCase() === sym);
  return contractEntry(sym, w?.exchange, w?.currency, w?.primaryExch);
}

/** Union of watchlist, portfolio, terminal focus, and ad-hoc tickers (e.g. scorecard). */
export function mergeLiveSubscribeSymbols({
  activeSymbol = '',
  activeContract = {},
  extraTickers = [],
} = {}) {
  const byTicker = new Map();

  const add = (entry) => {
    const e =
      typeof entry === 'string'
        ? entryForTicker(entry)
        : contractEntry(entry.ticker, entry.exchange, entry.currency, entry.primaryExch);
    if (!e) return;
    byTicker.set(e.ticker, e);
  };

  getWatchlistSymbols().forEach(add);
  getPortfolioSubscribeSymbols().forEach(add);

  if (activeSymbol) {
    add({ ticker: activeSymbol, ...activeContract });
  }

  for (const t of extraTickers) {
    add(t);
  }

  return [...byTicker.values()];
}
