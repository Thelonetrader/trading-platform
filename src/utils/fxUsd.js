/** Approximate FX → USD for screener caps/prices (research-grade, not for execution). */
const FX_TO_USD = {
  USD: 1,
  USX: 1,
  GBP: 1.27,
  GBX: 0.0127,
  EUR: 1.08,
  CHF: 1.12,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.65,
  HKD: 0.128,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  SGD: 0.74,
  NZD: 0.6,
  KRW: 0.00075,
  TWD: 0.031,
  INR: 0.012,
  BRL: 0.18,
  MXN: 0.058,
  ZAR: 0.055,
  CNY: 0.14,
  CNH: 0.14,
};

export function listingCurrency(snap, row) {
  const fromProfile = snap?.profile?.currency;
  if (fromProfile) return String(fromProfile).toUpperCase();
  if (row?.currency) return String(row.currency).toUpperCase();
  return 'USD';
}

export function fxToUsd(amount, currency) {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  const ccy = (currency || 'USD').toUpperCase();
  const rate = FX_TO_USD[ccy] ?? 1;
  return Number(amount) * rate;
}

/** User enters millions; thresholds stored as USD dollars for comparison. */
export function parseCapMillions(raw) {
  if (raw === '' || raw == null) return null;
  const n = parseFloat(String(raw).replace(/,/g, ''));
  if (Number.isNaN(n)) return null;
  return n * 1e6;
}

export function marketCapUsd(snap, row) {
  const m = snap?.profile?.mktCap;
  if (m == null || !Number(m) || Number(m) <= 0) return null;
  return fxToUsd(Number(m), listingCurrency(snap, row));
}

export function priceUsd(quote, snap, row) {
  const local =
    quote?.last > 0
      ? quote.last
      : quote?.bid > 0 && quote?.ask > 0
        ? (quote.bid + quote.ask) / 2
        : snap?.profile?.price > 0
          ? snap.profile.price
          : null;
  if (local == null) return null;
  return fxToUsd(local, listingCurrency(snap, row));
}


export function migrateCapFilterBtoM(filters) {
  if (!filters || typeof filters !== 'object') return filters;
  const next = { ...filters };
  if ((next.minMktCapM === '' || next.minMktCapM == null) && next.minMktCapB) {
    const b = parseFloat(next.minMktCapB);
    if (!Number.isNaN(b)) next.minMktCapM = String(b * 1000);
  }
  if ((next.maxMktCapM === '' || next.maxMktCapM == null) && next.maxMktCapB) {
    const b = parseFloat(next.maxMktCapB);
    if (!Number.isNaN(b)) next.maxMktCapM = String(b * 1000);
  }
  delete next.minMktCapB;
  delete next.maxMktCapB;
  return next;
}

export function fmtMktCapMillions(usdCap) {
  if (usdCap == null || !Number.isFinite(usdCap) || usdCap <= 0) return '—';
  const m = usdCap / 1e6;
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)}T`;
  if (m >= 1000) return `${(m / 1000).toFixed(2)}B`;
  if (m >= 1) return `${m.toFixed(1)}M`;
  return `${m.toFixed(2)}M`;
}

export const CURRENCY_FILTER_OPTIONS = [
  { id: 'any', label: 'Any currency' },
  { id: 'USD', label: 'USD' },
  { id: 'GBP', label: 'GBP' },
  { id: 'EUR', label: 'EUR' },
  { id: 'CAD', label: 'CAD' },
  { id: 'AUD', label: 'AUD' },
  { id: 'CHF', label: 'CHF' },
  { id: 'JPY', label: 'JPY' },
  { id: 'HKD', label: 'HKD' },
];
