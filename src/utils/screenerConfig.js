import { readJson } from './storageStats';
import { migrateCapFilterBtoM } from './fxUsd';
import { migrateScreenerMultiFilters } from './filterChipLists';
import { DEFAULT_LIVE_UNIVERSE, normalizeLiveUniverse } from './liveUniverse';

export const SCREENER_PREFS_KEY = 'screenerLiveFilters';

export const SCREENER_PRO_PRESETS = [
  {
    id: 'large_cap_growth',
    label: 'Large cap growth',
    blurb: '>$10B USD equiv · EPS & revenue growth · reasonable P/E',
    filters: {
      minMktCapM: '10000',
      minEpsGrowth: '10',
      minRevenueGrowth: '5',
      maxPe: '45',
      sortBy: 'marketCap',
    },
  },
  {
    id: 'small_cap_momentum',
    label: 'Small cap momentum',
    blurb: '$300M–$2B · strong day & EPS growth',
    filters: {
      minMktCapM: '300',
      maxMktCapM: '2000',
      minChange: '1.5',
      minEpsGrowth: '15',
      sortBy: 'change',
    },
  },
  {
    id: 'dividend_quality',
    label: 'Dividend quality',
    blurb: 'Mid/large cap · yield · coverage',
    filters: {
      minMktCapM: '2000',
      minDivYield: '2',
      minInterestCoverage: '3',
      maxPe: '25',
      sortBy: 'dividendYield',
    },
  },
  {
    id: 'value_deep',
    label: 'Deep value',
    blurb: 'Low P/E & P/B · positive FCF yield',
    filters: {
      maxPe: '12',
      maxPb: '1.5',
      minFcfYield: '3',
      sortBy: 'forwardPE',
    },
  },
  {
    id: 'international',
    label: 'International (non-USD)',
    blurb: 'Any listing currency · caps in USD equivalent',
    filters: {
      currencyFilter: 'non_usd',
      minMktCapM: '500',
      sortBy: 'marketCap',
    },
  },
];

export const DEFAULT_SCREENER_FILTERS = {
  priorityFilter: { High: true, Medium: true, Low: true },
  sectorMatches: [],
  industryMatches: [],
  exchangeMatches: [],
  currencyFilters: [],
  currencyFilter: 'any',
  ratingFilter: 'hold+',
  requireScorecard: false,
  journalFilter: 'any',
  minChange: '',
  maxChange: '',
  sortBy: 'priority',
  searchTerms: [],
  symbolPicks: [],
  tagMatches: [],
  minRank: '',
  universeId: 'live',
  customUniverse: '',
  liveUniverse: { ...DEFAULT_LIVE_UNIVERSE },
  minPe: '',
  maxPe: '',
  minPb: '',
  maxPb: '',
  minEpsGrowth: '',
  maxEpsGrowth: '',
  minRevenueGrowth: '',
  maxRevenueGrowth: '',
  minFcfYield: '',
  maxFcfYield: '',
  minDivYield: '',
  minOperatingMargin: '',
  minGrossMargin: '',
  maxNetDebtEbitda: '',
  minInterestCoverage: '',
  minBeta: '',
  maxBeta: '',
  minPriceUsd: '',
  maxPriceUsd: '',
  minMktCapM: '',
  maxMktCapM: '',
  setupTab: 'presets',
  fundamentalChipIds: [],
  dayChangeChipIds: [],
  mktCapBandIds: [],
  priceBandIds: [],
  betaBandIds: [],
  ratingMatches: [],
  activeProPresetId: '',
};

export function loadScreenerLiveFilters() {
  const saved = readJson(SCREENER_PREFS_KEY, null);
  const base = { ...DEFAULT_SCREENER_FILTERS };
  let out;
  if (!saved || typeof saved !== 'object') {
    out = migrateScreenerMultiFilters({ ...base });
  } else {
    out = migrateScreenerMultiFilters(migrateCapFilterBtoM({ ...base, ...saved }));
  }
  out.liveUniverse = normalizeLiveUniverse(out.liveUniverse);
  if (out.activeProPresetId && !getScreenerProPreset(out.activeProPresetId)) {
    out = { ...out, activeProPresetId: '' };
  }
  return out;
}

export function saveScreenerLiveFilters(filters) {
  try {
    localStorage.setItem(SCREENER_PREFS_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function getScreenerProPreset(presetId) {
  return SCREENER_PRO_PRESETS.find((p) => p.id === presetId) || null;
}

/** Keys kept when clearing a pro preset (universe / symbol search unchanged). */
const PRO_PRESET_PRESERVE_KEYS = [
  'setupTab',
  'universeId',
  'customUniverse',
  'liveUniverse',
  'symbolPicks',
  'searchTerms',
];

export function clearScreenerProPreset(filters) {
  const preserved = {};
  for (const key of PRO_PRESET_PRESERVE_KEYS) {
    if (filters?.[key] !== undefined) preserved[key] = filters[key];
  }
  return migrateScreenerMultiFilters(
    migrateCapFilterBtoM({
      ...DEFAULT_SCREENER_FILTERS,
      ...preserved,
      activeProPresetId: '',
    }),
  );
}

export function applyScreenerProPreset(filters, presetId) {
  const preset = SCREENER_PRO_PRESETS.find((p) => p.id === presetId);
  if (!preset) return filters;
  return migrateScreenerMultiFilters(
    migrateCapFilterBtoM({
      ...DEFAULT_SCREENER_FILTERS,
      ...filters,
      ...preset.filters,
      setupTab: resolveSetupTabForPreset(filters?.setupTab),
      activeProPresetId: presetId,
    }),
  );
}

function resolveSetupTabForPreset(setupTab) {
  const valid = new Set(['presets', 'universe', 'fundamentals', 'size', 'research']);
  const raw = String(setupTab ?? 'presets').trim();
  return valid.has(raw) ? raw : 'presets';
}