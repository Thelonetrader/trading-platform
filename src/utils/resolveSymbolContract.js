/**
 * Client-side fallback when Electron resolve is unavailable (suffix heuristics only).
 * Mirrors electron/providers/resolveSymbol.js ticker suffix table.
 */

const TICKER_SUFFIX_IB = {
  '.L': { exchange: 'LSE', currency: 'GBP' },
  '.TO': { exchange: 'TSE', currency: 'CAD' },
  '.V': { exchange: 'TSE', currency: 'CAD' },
  '.AX': { exchange: 'ASX', currency: 'AUD' },
  '.HK': { exchange: 'SEHK', currency: 'HKD' },
  '.DE': { exchange: 'IBIS', currency: 'EUR' },
  '.F': { exchange: 'IBIS', currency: 'EUR' },
  '.PA': { exchange: 'SBF', currency: 'EUR' },
  '.AS': { exchange: 'AEB', currency: 'EUR' },
  '.SW': { exchange: 'EBS', currency: 'CHF' },
  '.ST': { exchange: 'SFB', currency: 'SEK' },
  '.OL': { exchange: 'OSE', currency: 'NOK' },
  '.CO': { exchange: 'CPH', currency: 'DKK' },
  '.MI': { exchange: 'BVME', currency: 'EUR' },
  '.MC': { exchange: 'BM', currency: 'EUR' },
  '.SA': { exchange: 'BVMF', currency: 'BRL' },
  '.T': { exchange: 'TSEJ', currency: 'JPY' },
};

export function resolveSymbolHeuristic(ticker) {
  const symbol = String(ticker || '').trim().toUpperCase();
  if (!symbol) {
    return {
      symbol: '',
      exchange: 'SMART',
      currency: 'USD',
      primaryExch: null,
      listingExchange: null,
      companyName: null,
      sector: null,
      source: 'heuristic',
    };
  }
  for (const [suffix, ib] of Object.entries(TICKER_SUFFIX_IB)) {
    if (symbol.endsWith(suffix)) {
      return {
        symbol,
        exchange: ib.exchange,
        currency: ib.currency,
        primaryExch: null,
        listingExchange: ib.exchange,
        companyName: null,
        sector: null,
        source: 'heuristic',
      };
    }
  }
  return {
    symbol,
    exchange: 'SMART',
    currency: 'USD',
    primaryExch: null,
    listingExchange: null,
    companyName: null,
    sector: null,
    source: 'heuristic',
  };
}

export async function resolveSymbolForTerminal(ticker) {
  const upper = String(ticker || '').trim().toUpperCase();
  if (!upper) return resolveSymbolHeuristic('');

  if (typeof window !== 'undefined' && window.marketData?.resolveSymbol) {
    try {
      const res = await window.marketData.resolveSymbol(upper);
      if (res?.symbol) {
        return {
          symbol: res.symbol,
          exchange: res.exchange || 'SMART',
          currency: res.currency || 'USD',
          primaryExch: res.primaryExch || null,
          listingExchange: res.listingExchange || null,
          companyName: res.companyName || null,
          sector: res.sector || null,
          price: res.price,
          source: res.source || 'fmp',
          error: res.error,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return resolveSymbolHeuristic(upper);
}

export function contractFromResolved(resolved) {
  return {
    exchange: resolved.exchange || 'SMART',
    currency: resolved.currency || 'USD',
    primaryExch: resolved.primaryExch || undefined,
    name: resolved.companyName || undefined,
    listingExchange: resolved.listingExchange || undefined,
  };
}
