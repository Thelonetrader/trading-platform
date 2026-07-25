/** Map FMP profile + ticker suffix → IB stock contract fields. */

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

function contractFromTickerSuffix(symbol) {
  const upper = String(symbol || '').trim().toUpperCase();
  for (const [suffix, ib] of Object.entries(TICKER_SUFFIX_IB)) {
    if (upper.endsWith(suffix)) {
      return {
        symbol: upper,
        exchange: ib.exchange,
        currency: ib.currency,
        primaryExch: null,
        listingExchange: ib.exchange,
      };
    }
  }
  return {
    symbol: upper,
    exchange: 'SMART',
    currency: 'USD',
    primaryExch: null,
    listingExchange: null,
  };
}

function mapFmpExchangeToIb(exchangeShort, exchangeFull, currency, country) {
  const s = String(exchangeShort || exchangeFull || '').toUpperCase();
  const ccy = String(currency || 'USD').toUpperCase();
  const ctry = String(country || '').toUpperCase();

  if (s.includes('NASDAQ')) {
    return { exchange: 'SMART', currency: 'USD', primaryExch: 'NASDAQ', listingExchange: exchangeShort || 'NASDAQ' };
  }
  if (s.includes('NYSE') && !s.includes('EURONEXT')) {
    return { exchange: 'SMART', currency: 'USD', primaryExch: 'NYSE', listingExchange: exchangeShort || 'NYSE' };
  }
  if (s === 'AMEX' || s.includes('AMERICAN')) {
    return { exchange: 'SMART', currency: 'USD', primaryExch: 'AMEX', listingExchange: 'AMEX' };
  }
  if (s.includes('ARCA')) {
    return { exchange: 'SMART', currency: 'USD', primaryExch: 'ARCA', listingExchange: 'ARCA' };
  }
  if (s === 'BATS' || s.includes('CBOE BZX')) {
    return { exchange: 'SMART', currency: 'USD', primaryExch: 'BATS', listingExchange: 'BATS' };
  }

  if (s === 'LSE' || s.includes('LONDON')) {
    return { exchange: 'LSE', currency: ccy || 'GBP', primaryExch: null, listingExchange: 'LSE' };
  }
  if (s.includes('TORONTO') || s === 'TSX') {
    return { exchange: 'TSE', currency: ccy || 'CAD', primaryExch: null, listingExchange: 'TSX' };
  }
  if (s.includes('ASX') || s.includes('AUSTRALIAN')) {
    return { exchange: 'ASX', currency: ccy || 'AUD', primaryExch: null, listingExchange: 'ASX' };
  }
  if (s.includes('XETRA') || s.includes('FRANKFURT') || s === 'DB') {
    return { exchange: 'IBIS', currency: ccy || 'EUR', primaryExch: null, listingExchange: s || 'XETRA' };
  }
  if (s.includes('HONG') || s === 'HKEX' || s === 'HKSE') {
    return { exchange: 'SEHK', currency: ccy || 'HKD', primaryExch: null, listingExchange: 'HKEX' };
  }
  if (s.includes('EURONEXT') && (s.includes('PARIS') || s === 'EPA')) {
    return { exchange: 'SBF', currency: ccy || 'EUR', primaryExch: null, listingExchange: 'Euronext Paris' };
  }
  if (s.includes('EURONEXT') && s.includes('AMSTERDAM')) {
    return { exchange: 'AEB', currency: ccy || 'EUR', primaryExch: null, listingExchange: 'Euronext Amsterdam' };
  }
  if (s.includes('SIX') || s.includes('SWISS')) {
    return { exchange: 'EBS', currency: ccy || 'CHF', primaryExch: null, listingExchange: 'SIX' };
  }
  if (s.includes('TOKYO') || s === 'JPX') {
    return { exchange: 'TSEJ', currency: ccy || 'JPY', primaryExch: null, listingExchange: 'TSE' };
  }

  if (ccy === 'USD' || ctry === 'US' || ctry === 'USA') {
    return {
      exchange: 'SMART',
      currency: 'USD',
      primaryExch: s && s.length <= 8 ? s : null,
      listingExchange: exchangeShort || exchangeFull || null,
    };
  }

  return {
    exchange: s || 'SMART',
    currency: ccy,
    primaryExch: null,
    listingExchange: exchangeShort || exchangeFull || null,
  };
}

function buildResolvedSymbol(symbol, profile, source) {
  const fromSuffix = contractFromTickerSuffix(symbol);
  if (!profile) {
  return {
    symbol: fromSuffix.symbol,
    companyName: null,
    sector: null,
    exchange: fromSuffix.exchange,
      currency: fromSuffix.currency,
      primaryExch: fromSuffix.primaryExch,
      listingExchange: fromSuffix.listingExchange,
      price: null,
      source,
    };
  }

  const ib = mapFmpExchangeToIb(
    profile.exchangeShortName,
    profile.exchange,
    profile.currency,
    profile.country,
  );

  const suffixOverride =
    fromSuffix.exchange !== 'SMART' || fromSuffix.currency !== 'USD' ? fromSuffix : null;

  return {
    symbol: String(profile.symbol || symbol).toUpperCase(),
    companyName: profile.companyName || null,
    sector: profile.sector || null,
    exchange: suffixOverride?.exchange || ib.exchange,
    currency: suffixOverride?.currency || ib.currency,
    primaryExch: suffixOverride ? null : ib.primaryExch,
    listingExchange: ib.listingExchange || profile.exchangeShortName || profile.exchange || null,
    price: profile.price != null ? Number(profile.price) : null,
    source,
  };
}

module.exports = {
  contractFromTickerSuffix,
  mapFmpExchangeToIb,
  buildResolvedSymbol,
};
