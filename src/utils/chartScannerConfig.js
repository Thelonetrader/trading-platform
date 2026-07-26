import { readJson } from './storageStats';
import { migrateCapFilterBtoM } from './fxUsd';
import { normalizeSymbolPicks } from './filterChipLists';
import { DEFAULT_LIVE_UNIVERSE, normalizeLiveUniverse } from './liveUniverse';
import {
  coerceDurationForBarSize,
  defaultDurationForBarSize,
  durationsForBarSize,
} from './chartBars';

export const SCANNER_PREFS_KEY = 'chartScannerPrefs';

/** Hard cap per run (IB pacing — large scans take time). */
export const SCAN_ABSOLUTE_MAX = 300;

export const SCAN_SIZE_OPTIONS = [
  { id: 'auto', label: 'Auto (fits timeframe)' },
  { id: '50', label: 'Up to 50 symbols' },
  { id: '100', label: 'Up to 100 symbols' },
  { id: '150', label: 'Up to 150 symbols' },
  { id: '250', label: 'Up to 250 symbols' },
  { id: 'all', label: 'Full universe (max 300)' },
];

export function scanBarKey(barSize, duration) {
  return `${barSize}|${duration}`;
}

export const SCAN_BAR_OPTIONS = [
  { barSize: '5 mins', duration: '5 D', label: '5 min · 5 days', maxSymbols: 40, pacingMs: 480 },
  { barSize: '5 mins', duration: '1 M', label: '5 min · 1 month', maxSymbols: 35, pacingMs: 520 },
  { barSize: '15 mins', duration: '1 M', label: '15 min · 1 month', maxSymbols: 50, pacingMs: 450 },
  { barSize: '15 mins', duration: '3 M', label: '15 min · 3 months', maxSymbols: 45, pacingMs: 480 },
  { barSize: '1 hour', duration: '1 M', label: '1 hour · 1 month', maxSymbols: 60, pacingMs: 400 },
  { barSize: '1 hour', duration: '3 M', label: '1 hour · 3 months', maxSymbols: 70, pacingMs: 380 },
  { barSize: '1 hour', duration: '6 M', label: '1 hour · 6 months', maxSymbols: 65, pacingMs: 420 },
  { barSize: '1 day', duration: '6 M', label: 'Daily · 6 months', maxSymbols: 100, pacingMs: 350 },
  { barSize: '1 day', duration: '1 Y', label: 'Daily · 1 year', maxSymbols: 120, pacingMs: 320 },
  { barSize: '1 day', duration: '2 Y', label: 'Daily · 2 years', maxSymbols: 100, pacingMs: 340 },
  { barSize: '1 week', duration: '2 Y', label: 'Weekly · 2 years', maxSymbols: 80, pacingMs: 380 },
];

export const DEFAULT_SCAN_FILTERS = {
  minStrength: 0,
  minRsi: '',
  maxRsi: '',
  trendVsSma50: 'any',
  minChangePct: '',
  maxChangePct: '',
  minPrice: '',
  maxPrice: '',
  minVolRatio: '',
  minPctAboveSma50: '',
  maxPctAboveSma50: '',
  minMktCapM: '',
  maxMktCapM: '',
  minPriceUsd: '',
  maxPriceUsd: '',
};

export const DEFAULT_SCANNER_PREFS = {
  universeId: 'live',
  customUniverse: '',
  liveUniverse: { ...DEFAULT_LIVE_UNIVERSE },
  symbolPicks: [],
  scanSize: 'auto',
  strategyId: 'multi_confirm',
  barKey: scanBarKey('1 day', '1 Y'),
  signalFilter: 'action',
  sortBy: 'strength',
  setupTab: 'presets',
  activeScanPresetId: '',
  columns: {
    change5: true,
    pctSma50: true,
    volRatio: true,
    marketCap: true,
    atrPct: false,
    bbWidth: false,
    emaTrend: true,
  },
  filters: { ...DEFAULT_SCAN_FILTERS },
};

export const SCAN_PRESETS = [
  {
    id: 'pro_trend',
    label: 'Trend · multi-confirm daily',
    blurb: 'Aligned SMA, RSI zone, MACD — daily swing bias.',
    strategyId: 'multi_confirm',
    barKey: scanBarKey('1 day', '1 Y'),
    signalFilter: 'action',
    filters: { ...DEFAULT_SCAN_FILTERS, minStrength: 2, trendVsSma50: 'above_sma50' },
  },
  {
    id: 'momentum_intraday',
    label: 'Momentum · 15m volume surge',
    blurb: 'Intraday push with elevated volume vs 20-bar average.',
    strategyId: 'volume_surge',
    barKey: scanBarKey('15 mins', '1 M'),
    signalFilter: 'buy',
    filters: { ...DEFAULT_SCAN_FILTERS, minStrength: 2, minVolRatio: '1.3', minChangePct: '0.5' },
  },
  {
    id: 'oversold_bounce',
    label: 'Mean reversion · oversold daily',
    blurb: 'RSI + Bollinger lower-band bounce candidates.',
    strategyId: 'bollinger_bounce',
    barKey: scanBarKey('1 day', '1 Y'),
    signalFilter: 'buy',
    filters: { ...DEFAULT_SCAN_FILTERS, maxRsi: '38' },
  },
  {
    id: 'breakout_hunt',
    label: 'Breakout · 20-bar + live confirm',
    blurb: 'Price at range highs with live confirmation.',
    strategyId: 'breakout_20',
    barKey: scanBarKey('1 day', '6 M'),
    signalFilter: 'buy',
    filters: { ...DEFAULT_SCAN_FILTERS, minStrength: 2, trendVsSma50: 'above_sma50' },
  },
  {
    id: 'golden_cross',
    label: 'Golden cross · 50/200 daily',
    blurb: 'Long-term trend change (needs ~200 bars).',
    strategyId: 'golden_cross_50_200',
    barKey: scanBarKey('1 day', '2 Y'),
    signalFilter: 'buy',
    filters: { ...DEFAULT_SCAN_FILTERS },
  },
  {
    id: 'macd_swing',
    label: 'MACD · signal line cross',
    blurb: 'Classic MACD line vs signal cross on daily bars.',
    strategyId: 'macd_signal_cross',
    barKey: scanBarKey('1 day', '1 Y'),
    signalFilter: 'action',
    filters: { ...DEFAULT_SCAN_FILTERS, minStrength: 2 },
  },
  {
    id: 'pullback_uptrend',
    label: 'Pullback · buy the dip in uptrend',
    blurb: 'Price above SMA50, RSI cooled to 38–48.',
    strategyId: 'trend_pullback',
    barKey: scanBarKey('1 day', '1 Y'),
    signalFilter: 'buy',
    filters: { ...DEFAULT_SCAN_FILTERS, trendVsSma50: 'above_sma50' },
  },
  {
    id: 'short_fade',
    label: 'Fade · overbought / breakdown',
    blurb: 'RSI extreme — short-bias research signals.',
    strategyId: 'rsi_reversal',
    barKey: scanBarKey('1 day', '1 Y'),
    signalFilter: 'sell',
    filters: { ...DEFAULT_SCAN_FILTERS, minRsi: '65' },
  },
];

export function resolveScanBarOption(barKey) {
  const found = SCAN_BAR_OPTIONS.find((b) => scanBarKey(b.barSize, b.duration) === barKey);
  if (found) return found;
  const fallback = SCAN_BAR_OPTIONS.find((b) => b.barSize === '1 day' && b.duration === '1 Y');
  return fallback || SCAN_BAR_OPTIONS[0];
}

/** How many symbols this run will request from IB. */
export function resolveScanRunLimits({ barOpt, scanSize = 'auto', universeCount = 0 }) {
  const bar = barOpt || SCAN_BAR_OPTIONS[0];
  let cap = bar.maxSymbols ?? 30;
  if (scanSize === '50') cap = 50;
  else if (scanSize === '100') cap = 100;
  else if (scanSize === '150') cap = 150;
  else if (scanSize === '250') cap = 250;
  else if (scanSize === 'all') cap = SCAN_ABSOLUTE_MAX;

  cap = Math.min(SCAN_ABSOLUTE_MAX, Math.max(1, cap));
  const maxSymbols = universeCount > 0 ? Math.min(universeCount, cap) : cap;

  let pacingMs = bar.pacingMs ?? 400;
  if (maxSymbols > 120) pacingMs = Math.max(280, pacingMs - 40);
  else if (maxSymbols > 60) pacingMs = Math.max(300, pacingMs - 25);

  const estimateSec = Math.ceil((maxSymbols * pacingMs) / 1000);
  const sizeLabel = SCAN_SIZE_OPTIONS.find((o) => o.id === scanSize)?.label || 'Auto';

  return { maxSymbols, pacingMs, cap, estimateSec, sizeLabel };
}

export function formatScanEstimate(seconds) {
  if (seconds < 60) return `~${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
}

export function loadScannerPrefs() {
  const saved = readJson(SCANNER_PREFS_KEY, null);
  if (!saved || typeof saved !== 'object') {
    return {
      ...DEFAULT_SCANNER_PREFS,
      filters: { ...DEFAULT_SCAN_FILTERS },
      liveUniverse: { ...DEFAULT_LIVE_UNIVERSE },
    };
  }
  const filters = migrateCapFilterBtoM({
    ...DEFAULT_SCAN_FILTERS,
    ...(saved.filters || {}),
  });
  return {
    ...DEFAULT_SCANNER_PREFS,
    ...saved,
    filters,
    symbolPicks: normalizeSymbolPicks(saved.symbolPicks),
    liveUniverse: normalizeLiveUniverse({ ...DEFAULT_LIVE_UNIVERSE, ...(saved.liveUniverse || {}) }),
    columns: { ...DEFAULT_SCANNER_PREFS.columns, ...(saved.columns || {}) },
  };
}

export function saveScannerPrefs(prefs) {
  try {
    localStorage.setItem(SCANNER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function durationsForScanBarSize(barSize) {
  return durationsForBarSize(barSize);
}

export function applyScanPreset(prefs, presetId) {
  const preset = SCAN_PRESETS.find((p) => p.id === presetId);
  if (!preset) return prefs;
  return {
    ...prefs,
    activeScanPresetId: presetId,
    strategyId: preset.strategyId,
    barKey: preset.barKey,
    signalFilter: preset.signalFilter,
    filters: { ...DEFAULT_SCAN_FILTERS, ...preset.filters },
  };
}
