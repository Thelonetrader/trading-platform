import { barsPerYear } from './backtestConfig';

function periodReturnPct(equityCurve, initialCapital) {
  if (!equityCurve?.length || initialCapital <= 0) return 0;
  const finalEq = equityCurve[equityCurve.length - 1].equity;
  return (finalEq / initialCapital - 1) * 100;
}

function maxDrawdownPct(equityCurve) {
  let peak = -Infinity;
  let maxDd = 0;
  for (const p of equityCurve || []) {
    peak = Math.max(peak, p.equity);
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - p.equity) / peak) * 100);
  }
  return maxDd;
}

function equityReturns(equityCurve) {
  const rets = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const cur = equityCurve[i].equity;
    if (prev > 0) rets.push(cur / prev - 1);
  }
  return rets;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

export function buyAndHoldReturnPct(bars, startIndex = 0) {
  if (!bars?.length) return null;
  const i0 = Math.max(0, startIndex);
  const i1 = bars.length - 1;
  if (i1 <= i0) return null;
  const c0 = bars[i0].close;
  const c1 = bars[i1].close;
  if (!c0 || !c1) return null;
  return (c1 / c0 - 1) * 100;
}

export function buildBuyHoldCurve(bars, startIndex, initialCapital) {
  const curve = [];
  if (!bars?.length || initialCapital <= 0) return curve;
  const c0 = bars[startIndex]?.close;
  if (!c0) return curve;
  const shares = initialCapital / c0;
  for (let i = startIndex; i < bars.length; i++) {
    curve.push({
      time: bars[i].time,
      equity: shares * bars[i].close,
      barIndex: i,
    });
  }
  return curve;
}

export function computeBacktestStats({
  trades,
  equityCurve,
  initialCapital,
  barSize = '1 day',
  buyHoldReturnPct = null,
}) {
  const finalEquity =
    equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const totalReturnPct = initialCapital > 0 ? ((finalEquity / initialCapital - 1) * 100) : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const numTrades = trades.length;
  const winRatePct = numTrades ? (wins.length / numTrades) * 100 : 0;

  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? -grossLoss / losses.length : 0;
  const expectancy = numTrades ? trades.reduce((s, t) => s + t.pnl, 0) / numTrades : 0;

  const avgBarsHeld = numTrades ? trades.reduce((s, t) => s + t.barsHeld, 0) / numTrades : 0;

  let maxConsecutiveLosses = 0;
  let streak = 0;
  for (const t of trades) {
    if (t.pnl <= 0) {
      streak += 1;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, streak);
    } else streak = 0;
  }

  const maxDrawdown = maxDrawdownPct(equityCurve);
  const rets = equityReturns(equityCurve);
  const bpy = barsPerYear(barSize);
  const avgRet = mean(rets);
  const sd = stdDev(rets);
  const sharpe =
    sd > 0 ? (avgRet / sd) * Math.sqrt(bpy) : 0;

  const downRets = rets.filter((r) => r < 0);
  const downSd = stdDev(downRets);
  const sortino =
    downSd > 0 ? (avgRet / downSd) * Math.sqrt(bpy) : sharpe;

  const years = equityCurve.length / bpy;
  const cagr =
    years > 0 && initialCapital > 0 && finalEquity > 0
      ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100
      : totalReturnPct;

  let barsInMarket = 0;
  for (const t of trades) barsInMarket += t.barsHeld || 0;
  const exposurePct =
    equityCurve.length > 0 ? Math.min(100, (barsInMarket / equityCurve.length) * 100) : 0;

  const alphaVsHold =
    buyHoldReturnPct != null ? totalReturnPct - buyHoldReturnPct : null;

  return {
    numTrades,
    winRatePct,
    totalReturnPct,
    cagrPct: cagr,
    maxDrawdownPct: maxDrawdown,
    profitFactor,
    avgBarsHeld,
    avgWin,
    avgLoss,
    expectancy,
    maxConsecutiveLosses,
    sharpe,
    sortino,
    exposurePct,
    finalEquity,
    initialCapital,
    buyHoldReturnPct,
    alphaVsHoldPct: alphaVsHold,
  };
}

/** 0–5 score: higher = more evidence the backtest is tradable (heuristic, not a guarantee). */
export function computeConfidenceScore(stats, oosStats, walkForward = null) {
  if (!stats || stats.numTrades === 0) {
    if (walkForward?.numFolds > 0 && walkForward.compoundedReturnPct > 0) {
      return { score: 1.5, notes: ['Walk-forward OOS positive but full-sample trade count is zero'] };
    }
    return { score: 0, notes: ['No completed trades'] };
  }

  let score = 0;
  const notes = [];
  const oos = walkForward?.combinedOosStats ?? oosStats;

  if (stats.numTrades >= 15) {
    score += 1;
  } else if (stats.numTrades >= 8) {
    score += 0.5;
    notes.push('Low trade count (<15) — statistics may be unstable');
  } else {
    notes.push('Very few trades — treat metrics as indicative only');
  }

  if (stats.profitFactor >= 1.3 && stats.totalReturnPct > 0) score += 1;
  else if (stats.profitFactor < 1) notes.push('Profit factor below 1');

  if (stats.maxDrawdownPct <= 20) score += 1;
  else if (stats.maxDrawdownPct > 35) notes.push('Deep max drawdown (>35%)');

  if (stats.sharpe >= 0.8) score += 1;
  else if (stats.sharpe < 0) notes.push('Negative Sharpe on bar returns');

  if (walkForward?.numFolds >= 2) {
    if (walkForward.wfEfficiencyPct >= 60) score += 1;
    else if (walkForward.wfEfficiencyPct >= 45) score += 0.5;
    else notes.push(`Walk-forward: only ${walkForward.wfEfficiencyPct.toFixed(0)}% of OOS folds profitable`);

    if (walkForward.compoundedReturnPct > 0) score += 0.5;
    else notes.push('Walk-forward compounded OOS return is not positive');

    if (walkForward.numFolds < 3) {
      notes.push('Few walk-forward folds — prefer longer history (e.g. daily 5Y)');
    }
  } else if (oos && oos.numTrades >= 3) {
    const oosOk = oos.totalReturnPct >= 0 || oos.totalReturnPct > stats.totalReturnPct * 0.4;
    if (oosOk && stats.totalReturnPct > 0) score += 1;
    else notes.push('Out-of-sample return weaker than in-sample — possible overfit');
  } else if (oos?.numTrades === 0) {
    notes.push('No OOS trades in holdout window');
  }

  if (stats.alphaVsHoldPct != null && stats.alphaVsHoldPct > 0) score += 0.5;

  return { score: Math.min(5, Math.round(score * 2) / 2), notes };
}

export function aggregateSummaries(summaries) {
  const withStats = (summaries || []).filter((s) => s.stats);
  if (!withStats.length) return null;

  const n = withStats.length;
  const sum = (fn) => withStats.reduce((s, x) => s + fn(x.stats), 0) / n;

  const profitable = withStats.filter((x) => x.stats.totalReturnPct > 0).length;
  const beatHold = withStats.filter(
    (x) => x.stats.alphaVsHoldPct != null && x.stats.alphaVsHoldPct > 0,
  ).length;
  const withWf = withStats.filter((x) => x.walkForward?.numFolds > 0);

  return {
    numSymbols: n,
    avgReturnPct: sum((st) => st.totalReturnPct),
    avgCagrPct: sum((st) => st.cagrPct),
    avgWinRatePct: sum((st) => st.winRatePct),
    avgSharpe: sum((st) => st.sharpe),
    avgMaxDrawdownPct: sum((st) => st.maxDrawdownPct),
    avgConfidence:
      withStats.reduce((s, x) => s + (x.confidence?.score ?? 0), 0) / n,
    totalTrades: withStats.reduce((s, x) => s + x.stats.numTrades, 0),
    pctProfitable: (profitable / n) * 100,
    pctBeatBuyHold: (beatHold / n) * 100,
    avgWfEfficiency:
      withWf.length > 0
        ? withWf.reduce((s, x) => s + (x.walkForward.wfEfficiencyPct ?? 0), 0) / withWf.length
        : null,
    avgWfCompoundedReturn:
      withWf.length > 0
        ? withWf.reduce((s, x) => s + (x.walkForward.compoundedReturnPct ?? 0), 0) / withWf.length
        : null,
  };
}

export { periodReturnPct, maxDrawdownPct };
