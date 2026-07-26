/** FMP company-screener criteria (live market universe). */

export const LIVE_UNIVERSE_LIMIT_OPTIONS = [
  { id: '100', label: '100 symbols' },
  { id: '200', label: '200 symbols' },
  { id: '300', label: '300 symbols' },
  { id: '500', label: '500 symbols (max)' },
];

export const LIVE_UNIVERSE_COUNTRY_OPTIONS = [
  { id: '', label: 'Any country' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'CA', label: 'Canada' },
  { id: 'DE', label: 'Germany' },
  { id: 'FR', label: 'France' },
  { id: 'JP', label: 'Japan' },
  { id: 'AU', label: 'Australia' },
];

export const LIVE_UNIVERSE_EXCHANGE_OPTIONS = [
  { id: '', label: 'Any exchange' },
  { id: 'NASDAQ', label: 'NASDAQ' },
  { id: 'NYSE', label: 'NYSE' },
  { id: 'AMEX', label: 'AMEX' },
  { id: 'LSE', label: 'LSE' },
  { id: 'TSX', label: 'TSX' },
];

export const DEFAULT_LIVE_UNIVERSE = {
  country: 'US',
  exchange: '',
  sector: '',
  industry: '',
  marketCapMinM: '300',
  volumeMin: '100000',
  priceMin: '',
  priceMax: '',
  limit: '300',
  activelyTrading: true,
  excludeEtf: true,
};

export function normalizeLiveUniverse(raw) {
  const base = { ...DEFAULT_LIVE_UNIVERSE, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    ...base,
    country: String(base.country ?? '').trim(),
    exchange: String(base.exchange ?? '').trim(),
    sector: String(base.sector ?? '').trim(),
    industry: String(base.industry ?? '').trim(),
    marketCapMinM: String(base.marketCapMinM ?? '').trim(),
    volumeMin: String(base.volumeMin ?? '').trim(),
    priceMin: String(base.priceMin ?? '').trim(),
    priceMax: String(base.priceMax ?? '').trim(),
    limit: String(base.limit ?? '300').trim(),
    activelyTrading: base.activelyTrading !== false,
    excludeEtf: base.excludeEtf !== false,
  };
}

/** Map UI config → FMP /company-screener query params. */
export function liveUniverseToFmpQuery(cfg) {
  const c = normalizeLiveUniverse(cfg);
  const q = {};

  const capM = parseFloat(c.marketCapMinM);
  if (Number.isFinite(capM) && capM > 0) {
    q.marketCapMoreThan = String(Math.round(capM * 1_000_000));
  }

  const vol = parseFloat(c.volumeMin);
  if (Number.isFinite(vol) && vol > 0) q.volumeMoreThan = String(Math.round(vol));

  const pMin = parseFloat(c.priceMin);
  if (Number.isFinite(pMin) && pMin > 0) q.priceMoreThan = String(pMin);

  const pMax = parseFloat(c.priceMax);
  if (Number.isFinite(pMax) && pMax > 0) q.priceLowerThan = String(pMax);

  if (c.country) q.country = c.country;
  if (c.exchange) q.exchange = c.exchange;
  if (c.sector) q.sector = c.sector;
  if (c.industry) q.industry = c.industry;

  const lim = parseInt(c.limit, 10);
  q.limit = String(Math.min(500, Math.max(10, Number.isFinite(lim) ? lim : 300)));

  if (c.activelyTrading) q.isActivelyTrading = 'true';
  if (c.excludeEtf) q.isEtf = 'false';

  return q;
}

export function mergeLiveUniverseTickers(liveTickers, extraTickers = []) {
  const set = new Set((liveTickers || []).map((t) => String(t).trim().toUpperCase()).filter(Boolean));
  for (const t of extraTickers || []) {
    const u = String(t).trim().toUpperCase();
    if (u) set.add(u);
  }
  return [...set].sort();
}

export function liveUniverseSummary(cfg) {
  const c = normalizeLiveUniverse(cfg);
  const parts = ['FMP live screener'];
  if (c.country) parts.push(c.country);
  if (c.exchange) parts.push(c.exchange);
  if (c.sector) parts.push(c.sector);
  if (c.marketCapMinM) parts.push(`cap ≥ $${c.marketCapMinM}M`);
  parts.push(`up to ${c.limit} names`);
  return parts.join(' · ');
}
