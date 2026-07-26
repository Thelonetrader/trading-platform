import {
  BETA_PRESETS,
  MARKET_CAP_SIZE_PRESETS,
  PRICE_USD_PRESETS,
} from '../data/screenerFilterOptions';

/** Stacked fundamental constraints (AND across selected chips). */
export const FUNDAMENTAL_QUICK_FILTERS = [
  { id: 'pe_8', label: 'P/E ≤ 8', rules: { maxPe: '8' } },
  { id: 'pe_15', label: 'P/E ≤ 15', rules: { maxPe: '15' } },
  { id: 'pe_25', label: 'P/E ≤ 25', rules: { maxPe: '25' } },
  { id: 'pe_40', label: 'P/E ≤ 40', rules: { maxPe: '40' } },
  { id: 'pe_min_5', label: 'P/E ≥ 5', rules: { minPe: '5' } },
  { id: 'pb_1', label: 'P/B ≤ 1', rules: { maxPb: '1' } },
  { id: 'pb_2', label: 'P/B ≤ 2', rules: { maxPb: '2' } },
  { id: 'pb_3', label: 'P/B ≤ 3', rules: { maxPb: '3' } },
  { id: 'eps_5', label: 'EPS gr ≥ 5%', rules: { minEpsGrowth: '5' } },
  { id: 'eps_10', label: 'EPS gr ≥ 10%', rules: { minEpsGrowth: '10' } },
  { id: 'eps_20', label: 'EPS gr ≥ 20%', rules: { minEpsGrowth: '20' } },
  { id: 'rev_5', label: 'Rev gr ≥ 5%', rules: { minRevenueGrowth: '5' } },
  { id: 'rev_10', label: 'Rev gr ≥ 10%', rules: { minRevenueGrowth: '10' } },
  { id: 'fcf_2', label: 'FCF yld ≥ 2%', rules: { minFcfYield: '2' } },
  { id: 'fcf_3', label: 'FCF yld ≥ 3%', rules: { minFcfYield: '3' } },
  { id: 'fcf_5', label: 'FCF yld ≥ 5%', rules: { minFcfYield: '5' } },
  { id: 'div_2', label: 'Div yld ≥ 2%', rules: { minDivYield: '2' } },
  { id: 'div_3', label: 'Div yld ≥ 3%', rules: { minDivYield: '3' } },
  { id: 'op_10', label: 'Op margin ≥ 10%', rules: { minOperatingMargin: '10' } },
  { id: 'op_20', label: 'Op margin ≥ 20%', rules: { minOperatingMargin: '20' } },
  { id: 'gm_30', label: 'Gross margin ≥ 30%', rules: { minGrossMargin: '30' } },
  { id: 'nd_2', label: 'Net debt/EBITDA ≤ 2', rules: { maxNetDebtEbitda: '2' } },
  { id: 'nd_3', label: 'Net debt/EBITDA ≤ 3', rules: { maxNetDebtEbitda: '3' } },
  { id: 'cov_3', label: 'Interest cov ≥ 3', rules: { minInterestCoverage: '3' } },
  { id: 'cov_5', label: 'Interest cov ≥ 5', rules: { minInterestCoverage: '5' } },
];

export const DAY_CHANGE_QUICK_FILTERS = [
  { id: 'up_1', label: 'Up ≥ 1% today', rules: { minChange: '1' } },
  { id: 'up_2', label: 'Up ≥ 2% today', rules: { minChange: '2' } },
  { id: 'up_5', label: 'Up ≥ 5% today', rules: { minChange: '5' } },
  { id: 'down_2', label: 'Down ≤ −2%', rules: { maxChange: '-2' } },
  { id: 'down_5', label: 'Down ≤ −5%', rules: { maxChange: '-5' } },
  { id: 'flat', label: 'Flat ±0.5%', rules: { minChange: '-0.5', maxChange: '0.5' } },
];

export const RATING_QUICK_OPTIONS = [
  { id: 'hold+', label: 'Hold+ (≥2.5)' },
  { id: 'buy+', label: 'Buy+ (≥3.5)' },
  { id: 'sb', label: 'Strong Buy (≥4.5)' },
];

const MIN_KEYS = new Set([
  'minPe',
  'minPb',
  'minEpsGrowth',
  'minRevenueGrowth',
  'minFcfYield',
  'minDivYield',
  'minOperatingMargin',
  'minGrossMargin',
  'minInterestCoverage',
  'minBeta',
  'minChange',
  'minPriceUsd',
  'minMktCapM',
]);

const MAX_KEYS = new Set([
  'maxPe',
  'maxPb',
  'maxEpsGrowth',
  'maxRevenueGrowth',
  'maxFcfYield',
  'maxNetDebtEbitda',
  'maxBeta',
  'maxChange',
  'maxPriceUsd',
  'maxMktCapM',
]);

function parseNum(raw) {
  if (raw === '' || raw == null) return null;
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? null : n;
}

function mergeBound(key, current, incoming) {
  const inc = parseNum(incoming);
  if (inc == null) return current;
  const cur = parseNum(current);
  if (MIN_KEYS.has(key)) {
    if (cur == null) return String(incoming);
    return String(Math.max(cur, inc));
  }
  if (MAX_KEYS.has(key)) {
    if (cur == null) return String(incoming);
    return String(Math.min(cur, inc));
  }
  return incoming;
}

export function mergeQuickFilterRules(baseFilters, chipCatalog, chipIds) {
  const out = {};
  for (const id of chipIds || []) {
    const chip = chipCatalog.find((c) => c.id === id);
    if (!chip?.rules) continue;
    for (const [key, val] of Object.entries(chip.rules)) {
      const fromBase = baseFilters[key] ?? out[key] ?? '';
      out[key] = mergeBound(key, out[key] ?? fromBase, val);
    }
  }
  return out;
}

export function effectiveNumericFilters(filters) {
  const base = { ...filters };
  const fund = mergeQuickFilterRules(base, FUNDAMENTAL_QUICK_FILTERS, filters.fundamentalChipIds);
  const day = mergeQuickFilterRules(base, DAY_CHANGE_QUICK_FILTERS, filters.dayChangeChipIds);
  return { ...base, ...fund, ...day };
}

export function mktCapBandOptions() {
  return MARKET_CAP_SIZE_PRESETS.filter((p) => p.id);
}

export function priceBandOptions() {
  return PRICE_USD_PRESETS.filter((p) => p.id);
}

export function betaBandOptions() {
  return BETA_PRESETS.filter((p) => p.id);
}

function inMktCapBand(mcapUsd, preset) {
  if (mcapUsd == null) return false;
  const min = parseNum(preset.minMktCapM);
  const max = parseNum(preset.maxMktCapM);
  const m = mcapUsd / 1e6;
  if (min != null && m < min) return false;
  if (max != null && m > max) return false;
  return true;
}

function inPriceBand(pxUsd, preset) {
  if (pxUsd == null) return false;
  const min = parseNum(preset.minPriceUsd);
  const max = parseNum(preset.maxPriceUsd);
  if (min != null && pxUsd < min) return false;
  if (max != null && pxUsd > max) return false;
  return true;
}

function inBetaBand(beta, preset) {
  if (beta == null) return false;
  const min = parseNum(preset.minBeta);
  const max = parseNum(preset.maxBeta);
  if (min != null && beta < min) return false;
  if (max != null && beta > max) return false;
  return true;
}

export function matchesAnyMktCapBand(mcapUsd, bandIds) {
  const ids = (bandIds || []).filter(Boolean);
  if (!ids.length) return null;
  return ids.some((id) => {
    const p = MARKET_CAP_SIZE_PRESETS.find((x) => x.id === id);
    return p && inMktCapBand(mcapUsd, p);
  });
}

export function matchesAnyPriceBand(pxUsd, bandIds) {
  const ids = (bandIds || []).filter(Boolean);
  if (!ids.length) return null;
  return ids.some((id) => {
    const p = PRICE_USD_PRESETS.find((x) => x.id === id);
    return p && inPriceBand(pxUsd, p);
  });
}

export function matchesAnyBetaBand(beta, bandIds) {
  const ids = (bandIds || []).filter(Boolean);
  if (!ids.length) return null;
  const b = parseNum(beta);
  if (b == null) return false;
  return ids.some((id) => {
    const p = BETA_PRESETS.find((x) => x.id === id);
    return p && inBetaBand(b, p);
  });
}

export function effectiveAlertLiveFilters(rule) {
  const base = {
    minChange:
      rule.minDayChangePct != null && rule.minDayChangePct !== ''
        ? String(rule.minDayChangePct)
        : '',
    maxChange:
      rule.maxDayChangePct != null && rule.maxDayChangePct !== ''
        ? String(rule.maxDayChangePct)
        : '',
  };
  const merged = mergeQuickFilterRules(base, DAY_CHANGE_QUICK_FILTERS, rule.dayChangeChipIds);
  return {
    minDayChangePct: parseNum(merged.minChange),
    maxDayChangePct: parseNum(merged.maxChange),
    minPrice: parseNum(rule.minPrice != null ? String(rule.minPrice) : ''),
    maxPrice: parseNum(rule.maxPrice != null ? String(rule.maxPrice) : ''),
  };
}

export function ruleHasLiveFilters(rule) {
  const live = effectiveAlertLiveFilters(rule);
  const priceBands = (rule.priceBandIds || []).filter(Boolean);
  const dayChips = (rule.dayChangeChipIds || []).filter(Boolean);
  return (
    dayChips.length > 0 ||
    priceBands.length > 0 ||
    live.minDayChangePct != null ||
    live.maxDayChangePct != null ||
    live.minPrice != null ||
    live.maxPrice != null ||
    rule.minPctAboveBuy != null
  );
}

export function chipLabels(catalog, ids) {
  return (ids || []).map((id) => catalog.find((c) => c.id === id)?.label || id);
}

export function idsFromLabels(catalog, labels) {
  return (labels || [])
    .map((label) => catalog.find((c) => c.label === label)?.id)
    .filter(Boolean);
}

/** Extra numeric presets beyond quick-filter chips (advanced fundamentals fields). */
const FUNDAMENTAL_NUMERIC_EXTRA = {
  minPe: ['5', '8', '10', '12', '15', '18', '20'],
  maxPe: ['8', '10', '15', '18', '20', '25', '30', '40', '50', '80'],
  minPb: ['0.5', '1', '1.5', '2', '3'],
  maxPb: ['1', '1.5', '2', '3', '5', '8'],
  minEpsGrowth: ['0', '5', '8', '10', '15', '20', '25', '30'],
  maxEpsGrowth: ['5', '10', '15', '20', '30', '50'],
  minRevenueGrowth: ['0', '5', '8', '10', '15', '20', '25'],
  maxRevenueGrowth: ['5', '10', '15', '20', '30', '40'],
  minFcfYield: ['1', '2', '3', '4', '5', '6', '8', '10'],
  maxFcfYield: ['2', '3', '5', '8', '10', '15'],
  minDivYield: ['1', '2', '3', '4', '5', '6', '8'],
  minOperatingMargin: ['5', '10', '12', '15', '18', '20', '25', '30'],
  minGrossMargin: ['20', '25', '30', '35', '40', '50', '60', '70'],
  maxNetDebtEbitda: ['0', '1', '1.5', '2', '2.5', '3', '4', '5'],
  minInterestCoverage: ['1', '2', '3', '4', '5', '6', '8', '10'],
  minBeta: ['0', '0.5', '0.8', '1', '1.2'],
  maxBeta: ['0.8', '1', '1.2', '1.5', '2', '2.5', '3'],
};

let _fundamentalSuggestionsCache = null;

function buildFundamentalSuggestionsMap() {
  if (_fundamentalSuggestionsCache) return _fundamentalSuggestionsCache;
  const map = {};
  for (const chip of FUNDAMENTAL_QUICK_FILTERS) {
    if (!chip.rules) continue;
    for (const [key, val] of Object.entries(chip.rules)) {
      if (!map[key]) map[key] = new Set();
      map[key].add(String(val));
    }
  }
  for (const [key, vals] of Object.entries(FUNDAMENTAL_NUMERIC_EXTRA)) {
    if (!map[key]) map[key] = new Set();
    for (const v of vals) map[key].add(v);
  }
  const out = {};
  for (const [key, set] of Object.entries(map)) {
    out[key] = [...set].sort((a, b) => parseFloat(a) - parseFloat(b));
  }
  _fundamentalSuggestionsCache = out;
  return out;
}

/** Typeahead options for a screener fundamental numeric filter key. */
export function fundamentalNumericSuggestions(fieldKey) {
  const map = buildFundamentalSuggestionsMap();
  return map[fieldKey] || [];
}
