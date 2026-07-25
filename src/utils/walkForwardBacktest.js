import { BACKTEST_MIN_BARS, backtestBars } from './chartBacktest';
import { buyAndHoldReturnPct, computeBacktestStats } from './backtestMetrics';

export const WF_PRESETS = {
  daily_quarterly: { trainBars: 252, testBars: 63, stepBars: 63, label: 'Daily · 12mo train / 3mo test' },
  daily_monthly: { trainBars: 252, testBars: 21, stepBars: 21, label: 'Daily · 12mo train / 1mo test' },
  daily_semiannual: { trainBars: 504, testBars: 126, stepBars: 126, label: 'Daily · 24mo train / 6mo test' },
  hourly_monthly: { trainBars: 130, testBars: 32, stepBars: 32, label: 'Hourly · ~1mo train / ~1wk test' },
};

export function resolveWalkForwardWindows(barSize, prefs) {
  const presetKey = prefs?.wfPreset || 'daily_quarterly';
  if (presetKey === 'custom') {
    return {
      trainBars: Math.max(BACKTEST_MIN_BARS, Number(prefs.wfTrainBars) || 252),
      testBars: Math.max(5, Number(prefs.wfTestBars) || 63),
      stepBars: Math.max(1, Number(prefs.wfStepBars) || 63),
      label: 'Custom windows',
    };
  }
  if (barSize === '1 hour') {
    const p = WF_PRESETS.hourly_monthly;
    return { ...p, label: p.label };
  }
  const p = WF_PRESETS[presetKey] || WF_PRESETS.daily_quarterly;
  return { ...p, label: p.label };
}

function foldOosStats(oosTrades, initialCapital, barSize) {
  if (!oosTrades.length) {
    return {
      numTrades: 0,
      totalReturnPct: 0,
      winRatePct: 0,
      profitFactor: 0,
    };
  }
  let equity = initialCapital;
  const curve = [{ equity, time: oosTrades[0].entryTime, barIndex: 0 }];
  for (const t of oosTrades) {
    equity += t.pnl;
    curve.push({ equity, time: t.exitTime, barIndex: curve.length });
  }
  const st = computeBacktestStats({
    trades: oosTrades,
    equityCurve: curve,
    initialCapital,
    barSize,
  });
  return st;
}

/**
 * Rolling walk-forward: train window (indicators warm-up inside slice), then test window.
 * Capital compounds from fold to fold; stitched equity curve spans OOS segments only.
 */
export function walkForwardBacktest(bars, strategyId, engineOptions = {}, wfWindows) {
  const { trainBars, testBars, stepBars } = wfWindows;
  const barSize = engineOptions.barSize || '1 day';
  const minLen = trainBars + testBars + BACKTEST_MIN_BARS;
  const empty = {
    folds: [],
    stitchedOosEquity: [],
    combinedOosStats: null,
    wfEfficiencyPct: 0,
    avgFoldOosReturnPct: 0,
    numFolds: 0,
    error: bars.length < minLen ? `Need ${minLen}+ bars for walk-forward (have ${bars.length})` : null,
  };
  if (empty.error) return empty;

  const folds = [];
  let runningCapital = engineOptions.initialCapital ?? 10000;
  const stitchedOosEquity = [];
  const allOosTrades = [];

  for (let cursor = 0; cursor + trainBars + testBars <= bars.length; cursor += stepBars) {
    const testStart = cursor + trainBars;
    const testEnd = testStart + testBars;
    const sliceFrom = Math.max(0, cursor - (BACKTEST_MIN_BARS - 1));
    const slice = bars.slice(sliceFrom, testEnd);
    const oosStartLocal = testStart - sliceFrom;
    const oosEndLocal = testEnd - sliceFrom;

    const foldEngine = {
      ...engineOptions,
      initialCapital: runningCapital,
      oosSplitPct: 0,
      barSize,
    };

    const bt = backtestBars(slice, strategyId, foldEngine);
    if (bt.error) continue;

    const isTrades = bt.trades.filter((t) => t.exitBar != null && t.exitBar < oosStartLocal);
    const oosTrades = bt.trades
      .filter(
        (t) =>
          t.entryBar != null &&
          t.entryBar >= oosStartLocal &&
          t.entryBar < oosEndLocal,
      )
      .map((t) => ({
        ...t,
        globalEntryBar: t.entryBar + sliceFrom,
        globalExitBar: t.exitBar + sliceFrom,
        foldIndex: folds.length,
      }));

    allOosTrades.push(...oosTrades);

    const isStats = foldOosStats(isTrades, runningCapital, barSize);
    const oosStats = foldOosStats(oosTrades, runningCapital, barSize);

    const oosCurvePoints = bt.equityCurve.filter(
      (p) => p.barIndex >= oosStartLocal && p.barIndex < oosEndLocal,
    );
    for (const p of oosCurvePoints) {
      stitchedOosEquity.push({
        time: p.time,
        equity: p.equity,
        barIndex: p.barIndex + sliceFrom,
        foldIndex: folds.length,
      });
    }

    const lastOosPoint = oosCurvePoints[oosCurvePoints.length - 1];
    if (lastOosPoint) runningCapital = lastOosPoint.equity;

    folds.push({
      index: folds.length,
      trainFrom: cursor,
      testFrom: testStart,
      testTo: testEnd,
      trainFromTime: bars[cursor]?.time,
      testFromTime: bars[testStart]?.time,
      testToTime: bars[testEnd - 1]?.time,
      startCapital: foldEngine.initialCapital,
      endCapital: runningCapital,
      isStats,
      oosStats,
      oosTrades,
      isTrades: isTrades.length,
      oosTradesCount: oosTrades.length,
    });
  }

  if (!folds.length) {
    return {
      ...empty,
      error: 'Walk-forward produced no folds — increase history or shorten windows',
    };
  }

  const positiveOos = folds.filter((f) => (f.oosStats?.totalReturnPct ?? 0) > 0).length;
  const wfEfficiencyPct = (positiveOos / folds.length) * 100;
  const avgFoldOosReturnPct =
    folds.reduce((s, f) => s + (f.oosStats?.totalReturnPct ?? 0), 0) / folds.length;

  const initialCapital = engineOptions.initialCapital ?? 10000;
  const combinedOosStats = computeBacktestStats({
    trades: allOosTrades,
    equityCurve:
      stitchedOosEquity.length > 0
        ? stitchedOosEquity
        : [{ equity: initialCapital, time: bars[0]?.time, barIndex: 0 }],
    initialCapital,
    barSize,
    buyHoldReturnPct: buyAndHoldReturnPct(bars, folds[0]?.testFrom ?? 0),
  });

  combinedOosStats.wfEfficiencyPct = wfEfficiencyPct;
  combinedOosStats.wfAvgFoldOosReturnPct = avgFoldOosReturnPct;
  combinedOosStats.wfNumFolds = folds.length;
  combinedOosStats.wfPositiveFolds = positiveOos;
  combinedOosStats.wfCompoundedReturnPct =
    initialCapital > 0 ? ((runningCapital / initialCapital - 1) * 100) : 0;
  combinedOosStats.wfFinalCapital = runningCapital;

  return {
    folds,
    stitchedOosEquity,
    combinedOosStats,
    wfEfficiencyPct,
    avgFoldOosReturnPct,
    numFolds: folds.length,
    compoundedReturnPct: combinedOosStats.wfCompoundedReturnPct,
    error: null,
    windows: wfWindows,
  };
}

export function walkForwardPresetOptions(barSize) {
  if (barSize === '1 hour') {
    return [{ id: 'hourly_monthly', label: WF_PRESETS.hourly_monthly.label }];
  }
  return [
    { id: 'daily_quarterly', label: WF_PRESETS.daily_quarterly.label },
    { id: 'daily_monthly', label: WF_PRESETS.daily_monthly.label },
    { id: 'daily_semiannual', label: WF_PRESETS.daily_semiannual.label },
    { id: 'custom', label: 'Custom bar counts' },
  ];
}

export function minBarsForWalkForward(wfWindows) {
  return wfWindows.trainBars + wfWindows.testBars + BACKTEST_MIN_BARS;
}
