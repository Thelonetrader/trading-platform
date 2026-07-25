import { displayPrice, quoteForSymbol } from './quoteDisplay';

/** IB (or fallback) price for manual holdings when connected. */
export function liveQuotePrice(quotes, ticker) {
  return displayPrice(quoteForSymbol(quotes, ticker));
}

export function effectiveHoldingPrice(holding, quotes = {}) {
  const live = liveQuotePrice(quotes, holding?.ticker);
  if (live != null) return live;
  const manual = parseFloat(holding?.currentPrice);
  if (Number.isFinite(manual) && manual > 0) return manual;
  return parseFloat(holding?.avgBuyPrice) || 0;
}

export function holdingUsesLiveQuote(holding, quotes = {}) {
  return liveQuotePrice(quotes, holding?.ticker) != null;
}

export function getPortfolioSubscribeSymbols() {
  try {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const byTicker = new Map(
      watchlist.map((w) => [(w.ticker || '').toUpperCase(), w]),
    );
    return JSON.parse(localStorage.getItem('portfolio') || '[]')
      .map((h) => {
        const ticker = (h.ticker || '').trim().toUpperCase();
        if (!ticker) return null;
        const w = byTicker.get(ticker);
        return {
          ticker,
          exchange: w?.exchange || 'SMART',
          currency: w?.currency || 'USD',
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
