import { readJson } from './storageStats';

export const BACKTEST_PREFS_KEY = 'chartBacktestPrefs';

export const BACKTEST_BAR_OPTIONS = [
  { id: '1 day', duration: '1 Y', label: 'Daily · 1 year', maxSymbols: 30, durationKey: '1y' },
  { id: '1 day', duration: '2 Y', label: 'Daily · 2 years', maxSymbols: 25, durationKey: '2y' },
  { id: '1 day', duration: '5 Y', label: 'Daily · 5 years', maxSymbols: 20, durationKey: '5y' },
  { id: '1 hour', duration: '3 M', label: '1 hour · 3 months', maxSymbols: 18, durationKey: '1h_3m' },
  { id: '1 hour', duration: '6 M', label: '1 hour · 6 months', maxSymbols: 15, durationKey: '1h_6m' },
];

export const DEFAULT_BACKTEST_PREFS = {
  backtestDurationKey: '2y',
  minStrength: 2,
  initialCapital: 10000,
  positionPct: 95,
  commissionBps: 5,
  slippageBps: 5,
  fillModel: 'next_open',
  stopLossPct: 0,
  takeProfitPct: 0,
  maxHoldBars: 0,
  oosSplitPct: 30,
  walkForwardEnabled: true,
  wfPreset: 'daily_quarterly',
  wfTrainBars: 252,
  wfTestBars: 63,
  wfStepBars: 63,
};

export function barsPerYear(barSize) {
  if (barSize === '1 hour') return 252 * 6.5;
  return 252;
}

export function resolveBacktestBarOption(durationKey) {
  const opt =
    BACKTEST_BAR_OPTIONS.find((b) => b.durationKey === durationKey) ||
    BACKTEST_BAR_OPTIONS.find((b) => b.duration === '2 Y') ||
    BACKTEST_BAR_OPTIONS[1];
  return opt;
}

export function loadBacktestPrefs() {
  const saved = readJson(BACKTEST_PREFS_KEY, null);
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_BACKTEST_PREFS };
  return { ...DEFAULT_BACKTEST_PREFS, ...saved };
}

export function saveBacktestPrefs(prefs) {
  try {
    localStorage.setItem(BACKTEST_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

export function prefsToEngineOptions(prefs) {
  return {
    minStrength: Number(prefs.minStrength) || 2,
    initialCapital: Number(prefs.initialCapital) || 10000,
    positionPct: Math.min(100, Math.max(1, Number(prefs.positionPct) || 95)),
    commissionBps: Number(prefs.commissionBps) || 0,
    slippageBps: Number(prefs.slippageBps) || 0,
    fillModel: prefs.fillModel === 'bar_close' ? 'bar_close' : 'next_open',
    stopLossPct: Math.max(0, Number(prefs.stopLossPct) || 0),
    takeProfitPct: Math.max(0, Number(prefs.takeProfitPct) || 0),
    maxHoldBars: Math.max(0, Math.floor(Number(prefs.maxHoldBars) || 0)),
    oosSplitPct: Math.min(50, Math.max(10, Number(prefs.oosSplitPct) || 30)),
    walkForwardEnabled: prefs.walkForwardEnabled !== false,
    wfPreset: prefs.wfPreset || 'daily_quarterly',
    wfTrainBars: Number(prefs.wfTrainBars) || 252,
    wfTestBars: Number(prefs.wfTestBars) || 63,
    wfStepBars: Number(prefs.wfStepBars) || 63,
  };
}
