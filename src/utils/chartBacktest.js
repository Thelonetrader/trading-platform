import { evaluateChartSignal } from './chartScannerEngine';
import {
  buildBuyHoldCurve,
  buyAndHoldReturnPct,
  computeBacktestStats,
  computeConfidenceScore,
  aggregateSummaries,
} from './backtestMetrics';
import {
  resolveWalkForwardWindows,
  walkForwardBacktest,
} from './walkForwardBacktest';

export const BACKTEST_MIN_BARS = 55;

function commissionAmount(notional, commissionBps) {
  return notional * (commissionBps / 10000);
}

function slipPrice(price, side, slippageBps) {
  if (!slippageBps || price <= 0) return price;
  const m = slippageBps / 10000;
  return side === 'buy' ? price * (1 + m) : price * (1 - m);
}

function closePosition({
  position,
  shares,
  exitPrice,
  exitTime,
  exitBar,
  exitReason,
  exitStrength,
  commissionBps,
  trades,
}) {
  const notional = shares * exitPrice;
  const comm = commissionAmount(notional, commissionBps);
  const pnl = (exitPrice - position.entryPrice) * shares - position.entryComm - comm;
  trades.push({
    entryTime: position.entryTime,
    exitTime,
    entryBar: position.entryBar,
    exitBar,
    entryPrice: position.entryPrice,
    exitPrice,
    shares,
    pnl,
    pnlPct: position.entryPrice > 0 ? (exitPrice / position.entryPrice - 1) * 100 : 0,
    barsHeld: exitBar - position.entryBar,
    exitStrength: exitStrength ?? 0,
    exitReason: exitReason || 'signal',
  });
}

/**
 * Bar-by-bar simulation: signals from history through bar close; default fill on next bar open.
 */
export function backtestBars(bars, strategyId, options = {}) {
  const {
    minStrength = 2,
    commissionBps = 5,
    slippageBps = 5,
    initialCapital = 10000,
    positionPct = 95,
    fillModel = 'next_open',
    stopLossPct = 0,
    takeProfitPct = 0,
    maxHoldBars = 0,
    barSize = '1 day',
    oosSplitPct = 30,
  } = options;

  const empty = {
    trades: [],
    equityCurve: [],
    buyHoldCurve: [],
    stats: null,
    isStats: null,
    oosStats: null,
    confidence: { score: 0, notes: [] },
    error: null,
  };

  if (!bars?.length || bars.length < BACKTEST_MIN_BARS) {
    return {
      ...empty,
      stats: computeBacktestStats({
        trades: [],
        equityCurve: [],
        initialCapital,
        barSize,
      }),
      error: `Need ${BACKTEST_MIN_BARS}+ bars (have ${bars?.length || 0})`,
    };
  }

  const startIdx = BACKTEST_MIN_BARS - 1;
  const trades = [];
  const equityCurve = [];
  let cash = initialCapital;
  let shares = 0;
  let position = null;
  let pendingEntry = null;
  let pendingExit = null;

  const tryExit = (bar, i, price, reason, strength = 0) => {
    if (!position || shares <= 0) return;
    closePosition({
      position,
      shares,
      exitPrice: price,
      exitTime: bar.time,
      exitBar: i,
      exitReason: reason,
      exitStrength: strength,
      commissionBps,
      trades,
    });
    cash += shares * price - commissionAmount(shares * price, commissionBps);
    shares = 0;
    position = null;
    pendingExit = null;
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];

    if (i > startIdx && fillModel === 'next_open') {
      if (pendingExit && position) {
        tryExit(bar, i, slipPrice(bar.open, 'sell', slippageBps), 'signal_next_open');
      } else if (pendingEntry && !position) {
        const entryPrice = slipPrice(bar.open, 'buy', slippageBps);
        if (entryPrice > 0) {
          const budget = cash * (positionPct / 100);
          const commEst = commissionAmount(budget, commissionBps);
          const sh = Math.floor((budget - commEst) / entryPrice);
          if (sh > 0) {
            const cost = sh * entryPrice;
            const comm = commissionAmount(cost, commissionBps);
            cash -= cost + comm;
            shares = sh;
            position = {
              entryBar: i,
              entryPrice,
              entryTime: bar.time,
              entryComm: comm,
              stopPrice:
                stopLossPct > 0 ? entryPrice * (1 - stopLossPct / 100) : null,
              takeProfitPrice:
                takeProfitPct > 0 ? entryPrice * (1 + takeProfitPct / 100) : null,
            };
          }
        }
        pendingEntry = null;
      }
    }

    if (position && shares > 0 && i > startIdx) {
      if (stopLossPct > 0 && position.stopPrice != null && bar.low <= position.stopPrice) {
        const stopPx = slipPrice(position.stopPrice, 'sell', slippageBps);
        tryExit(bar, i, stopPx, 'stop_loss');
      } else if (
        takeProfitPct > 0 &&
        position.takeProfitPrice != null &&
        bar.high >= position.takeProfitPrice
      ) {
        const tpPx = slipPrice(position.takeProfitPrice, 'sell', slippageBps);
        tryExit(bar, i, tpPx, 'take_profit');
      } else if (maxHoldBars > 0 && i - position.entryBar >= maxHoldBars) {
        tryExit(bar, i, slipPrice(bar.close, 'sell', slippageBps), 'max_hold');
      }
    }

    if (i >= startIdx) {
      const mtm = cash + shares * bar.close;
      equityCurve.push({ time: bar.time, equity: mtm, barIndex: i });

      const slice = bars.slice(0, i + 1);
      const { signal, strength } = evaluateChartSignal(slice, strategyId, bar.close);
      const actionable =
        (signal === 'BUY' || signal === 'SELL') && strength >= minStrength;

      if (position && actionable && signal === 'SELL') {
        if (fillModel === 'bar_close') {
          tryExit(bar, i, slipPrice(bar.close, 'sell', slippageBps), 'signal', strength);
        } else if (i < bars.length - 1) {
          pendingExit = { strength };
          pendingEntry = null;
        }
      } else if (!position && !pendingEntry && actionable && signal === 'BUY') {
        if (fillModel === 'bar_close') {
          const entryPrice = slipPrice(bar.close, 'buy', slippageBps);
          if (entryPrice > 0) {
            const budget = cash * (positionPct / 100);
            const sh = Math.floor(
              (budget - commissionAmount(budget, commissionBps)) / entryPrice,
            );
            if (sh > 0) {
              const cost = sh * entryPrice;
              const comm = commissionAmount(cost, commissionBps);
              cash -= cost + comm;
              shares = sh;
              position = {
                entryBar: i,
                entryPrice,
                entryTime: bar.time,
                entryComm: comm,
                stopPrice:
                  stopLossPct > 0 ? entryPrice * (1 - stopLossPct / 100) : null,
                takeProfitPrice:
                  takeProfitPct > 0 ? entryPrice * (1 + takeProfitPct / 100) : null,
              };
            }
          }
        } else if (i < bars.length - 1) {
          pendingEntry = { strength };
        }
      }
    }
  }

  if (position && shares > 0) {
    const last = bars[bars.length - 1];
    tryExit(last, bars.length - 1, slipPrice(last.close, 'sell', slippageBps), 'end_of_series');
    equityCurve.push({
      time: last.time,
      equity: cash,
      barIndex: bars.length - 1,
    });
  }

  const bhReturn = buyAndHoldReturnPct(bars, startIdx);
  const buyHoldCurve = buildBuyHoldCurve(bars, startIdx, initialCapital);
  const stats = computeBacktestStats({
    trades,
    equityCurve,
    initialCapital,
    barSize,
    buyHoldReturnPct: bhReturn,
  });

  const splitIdx = Math.floor(bars.length * (1 - oosSplitPct / 100));
  const isTrades = trades.filter((t) => t.exitBar != null && t.exitBar < splitIdx);
  const oosTrades = trades.filter((t) => t.entryBar != null && t.entryBar >= splitIdx);

  const isCurve = equityCurve.filter((p) => p.barIndex < splitIdx);
  const oosCurve = equityCurve.filter((p) => p.barIndex >= splitIdx);

  const isStats =
    isTrades.length > 0 || isCurve.length > 0
      ? computeBacktestStats({
          trades: isTrades,
          equityCurve: isCurve.length ? isCurve : equityCurve,
          initialCapital,
          barSize,
          buyHoldReturnPct: buyAndHoldReturnPct(bars.slice(0, splitIdx), startIdx),
        })
      : null;

  const oosStats =
    oosTrades.length > 0 || oosCurve.length > 0
      ? computeBacktestStats({
          trades: oosTrades,
          equityCurve: oosCurve.length ? oosCurve : equityCurve,
          initialCapital,
          barSize,
          buyHoldReturnPct: buyAndHoldReturnPct(bars.slice(splitIdx), 0),
        })
      : null;

  const confidence = computeConfidenceScore(stats, oosStats);

  return {
    trades,
    equityCurve,
    buyHoldCurve,
    stats,
    isStats,
    oosStats,
    confidence,
    splitBarIndex: splitIdx,
    error: null,
  };
}

export async function runChartBacktest({
  entries,
  strategyId,
  barSize,
  duration,
  fetchHistoricalBars,
  onProgress,
  maxSymbols = 30,
  pacingMs = 400,
  engineOptions = {},
}) {
  const list = (entries || []).slice(0, maxSymbols);
  const summaries = [];
  const allTrades = [];
  const barSizeId = barSize || '1 day';

  for (let idx = 0; idx < list.length; idx++) {
    const entry = list[idx];
    const symbol = (entry.ticker || entry.symbol || entry).toString().trim().toUpperCase();
    onProgress?.({ idx, total: list.length, symbol, phase: 'backtest' });

    let bars = [];
    let error = null;
    try {
      const res = await fetchHistoricalBars(
        {
          ticker: symbol,
          exchange: entry.exchange || 'SMART',
          currency: entry.currency || 'USD',
          primaryExch: entry.primaryExch,
        },
        { barSize: barSizeId, duration },
      );
      if (res.error) error = res.error;
      else bars = res.bars || [];
    } catch (e) {
      error = e.message || 'Historical request failed';
    }

    if (error || !bars.length) {
      summaries.push({
        symbol,
        stats: null,
        confidence: { score: 0, notes: [] },
        error: error || 'No bars',
        trades: [],
        equityCurve: [],
        buyHoldCurve: [],
      });
    } else {
      const wfWindows = resolveWalkForwardWindows(barSizeId, engineOptions);
      let walkForward = null;
      if (engineOptions.walkForwardEnabled) {
        walkForward = walkForwardBacktest(bars, strategyId, { ...engineOptions, barSize: barSizeId }, wfWindows);
      }

      const bt = backtestBars(bars, strategyId, { ...engineOptions, barSize: barSizeId });
      const confidence = computeConfidenceScore(bt.stats, bt.oosStats, walkForward?.numFolds ? walkForward : null);

      const displayOosStats =
        walkForward?.combinedOosStats && walkForward.numFolds > 0
          ? walkForward.combinedOosStats
          : bt.oosStats;

      const trades = bt.trades.map((t) => ({
        symbol,
        entry_time: t.entryTime,
        exit_time: t.exitTime,
        entry_price: t.entryPrice != null ? Number(t.entryPrice).toFixed(4) : '',
        exit_price: t.exitPrice != null ? Number(t.exitPrice).toFixed(4) : '',
        shares: t.shares,
        pnl: t.pnl != null ? Number(t.pnl).toFixed(2) : '',
        pnl_pct: t.pnlPct != null ? Number(t.pnlPct).toFixed(2) : '',
        bars_held: t.barsHeld,
        exit_strength: t.exitStrength ?? '',
        exit_reason: t.exitReason || '',
      }));
      allTrades.push(...trades);
      summaries.push({
        symbol,
        stats: bt.stats,
        isStats: bt.isStats,
        oosStats: displayOosStats,
        walkForward: walkForward?.numFolds ? walkForward : null,
        confidence,
        error: bt.error || walkForward?.error,
        trades: bt.trades,
        equityCurve: bt.equityCurve,
        buyHoldCurve: bt.buyHoldCurve,
        wfStitchedEquity: walkForward?.stitchedOosEquity ?? [],
        barCount: bars.length,
      });
    }

    if (idx < list.length - 1 && pacingMs > 0) {
      await new Promise((r) => setTimeout(r, pacingMs));
    }
  }

  onProgress?.({ idx: list.length, total: list.length, phase: 'done' });

  return {
    summaries,
    trades: allTrades,
    aggregate: aggregateSummaries(summaries),
    engineOptions,
  };
}
