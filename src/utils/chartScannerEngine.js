import {
  barCloses,
  highest,
  lowest,
  macd as macdSeries,
  rsi as rsiSeries,
  sma,
} from './chartIndicators';

export const SCAN_STRATEGIES = [
  {
    id: 'multi_confirm',
    label: 'Multi-confirm trend',
    description: 'SMA20 vs SMA50 + RSI zone + MACD histogram alignment.',
  },
  {
    id: 'sma_cross',
    label: 'SMA 20/50 cross',
    description: 'Golden cross (buy) / death cross (sell) on latest bars.',
  },
  {
    id: 'rsi_reversal',
    label: 'RSI extremes',
    description: 'RSI(14) oversold bounce / overbought fade signals.',
  },
  {
    id: 'macd_cross',
    label: 'MACD histogram flip',
    description: 'MACD histogram crosses zero line.',
  },
  {
    id: 'breakout_20',
    label: '20-bar breakout + live',
    description: 'Close breaks 20-period high; live price confirms.',
  },
];

const MIN_BARS = 55;

function crossUp(prevA, prevB, a, b) {
  return prevA != null && prevB != null && a != null && b != null && prevA <= prevB && a > b;
}

function crossDown(prevA, prevB, a, b) {
  return prevA != null && prevB != null && a != null && b != null && prevA >= prevB && a < b;
}

function clampStrength(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}

/**
 * @returns {{ signal: 'BUY'|'SELL'|'NEUTRAL', strength: number, reasons: string[], metrics: object }}
 */
export function evaluateChartSignal(bars, strategyId, livePrice = null) {
  const closes = barCloses(bars);
  if (closes.length < MIN_BARS) {
    return {
      signal: 'NEUTRAL',
      strength: 0,
      reasons: [`Need ${MIN_BARS}+ bars (have ${closes.length})`],
      metrics: {},
    };
  }

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi = rsiSeries(closes, 14);
  const { hist: macdHist } = macdSeries(closes);
  const hi20 = highest(closes, 20);
  const lo20 = lowest(closes, 20);

  const i = closes.length - 1;
  const pi = i - 1;
  const px = livePrice != null && Number.isFinite(Number(livePrice)) ? Number(livePrice) : closes[i];

  const metrics = {
    close: closes[i],
    live: px,
    sma20: sma20[i],
    sma50: sma50[i],
    rsi: rsi[i],
    macdHist: macdHist[i],
    high20: hi20[i],
    low20: lo20[i],
  };

  const reasons = [];
  let buyScore = 0;
  let sellScore = 0;

  const addBuy = (r, w = 1) => {
    reasons.push(`+ ${r}`);
    buyScore += w;
  };
  const addSell = (r, w = 1) => {
    reasons.push(`− ${r}`);
    sellScore += w;
  };

  if (strategyId === 'sma_cross' || strategyId === 'multi_confirm') {
    if (crossUp(sma20[pi], sma50[pi], sma20[i], sma50[i])) addBuy('SMA20 crossed above SMA50', 2);
    if (crossDown(sma20[pi], sma50[pi], sma20[i], sma50[i])) addSell('SMA20 crossed below SMA50', 2);
    if (sma20[i] != null && sma50[i] != null && sma20[i] > sma50[i] && px > sma20[i]) {
      addBuy('Price above SMA20 in uptrend', 1);
    }
    if (sma20[i] != null && sma50[i] != null && sma20[i] < sma50[i] && px < sma20[i]) {
      addSell('Price below SMA20 in downtrend', 1);
    }
  }

  if (strategyId === 'rsi_reversal' || strategyId === 'multi_confirm') {
    const prevRsi = rsi[pi];
    if (rsi[i] != null && rsi[i] < 32) addBuy(`RSI oversold (${rsi[i].toFixed(1)})`, 2);
    else if (prevRsi != null && prevRsi < 35 && rsi[i] != null && rsi[i] >= 38) {
      addBuy('RSI bouncing from oversold', 2);
    }
    if (rsi[i] != null && rsi[i] > 68) addSell(`RSI overbought (${rsi[i].toFixed(1)})`, 2);
    else if (prevRsi != null && prevRsi > 65 && rsi[i] != null && rsi[i] <= 62) {
      addSell('RSI rolling from overbought', 2);
    }
  }

  if (strategyId === 'macd_cross' || strategyId === 'multi_confirm') {
    if (crossUp(macdHist[pi], 0, macdHist[i], 0)) addBuy('MACD histogram crossed above zero', 2);
    if (crossDown(macdHist[pi], 0, macdHist[i], 0)) addSell('MACD histogram crossed below zero', 2);
    if (macdHist[i] != null && macdHist[i] > 0) addBuy('MACD histogram positive', 0.5);
    if (macdHist[i] != null && macdHist[i] < 0) addSell('MACD histogram negative', 0.5);
  }

  if (strategyId === 'breakout_20') {
    if (hi20[i] != null && closes[i] >= hi20[i] * 0.998) {
      addBuy('Close at/near 20-bar high', 2);
      if (px >= closes[i]) addBuy('Live price confirms breakout', 1);
    }
    if (lo20[i] != null && closes[i] <= lo20[i] * 1.002) {
      addSell('Close at/near 20-bar low', 2);
      if (px <= closes[i]) addSell('Live price confirms breakdown', 1);
    }
  }

  if (strategyId === 'multi_confirm') {
    if (rsi[i] != null && rsi[i] >= 45 && rsi[i] <= 62 && sma20[i] > sma50[i]) {
      addBuy('RSI trend zone with SMA alignment', 1);
    }
  }

  let signal = 'NEUTRAL';
  let strength = 0;
  if (buyScore > sellScore && buyScore >= 1.5) {
    signal = 'BUY';
    strength = clampStrength(buyScore);
  } else if (sellScore > buyScore && sellScore >= 1.5) {
    signal = 'SELL';
    strength = clampStrength(sellScore);
  } else if (buyScore > 0 || sellScore > 0) {
    signal = 'NEUTRAL';
    strength = clampStrength(Math.max(buyScore, sellScore));
    reasons.push('Mixed signals — no clear edge');
  } else {
    reasons.push('No rule triggered');
  }

  return { signal, strength, reasons, metrics };
}

export function filterSignals(results, mode) {
  if (mode === 'all') return results;
  if (mode === 'action') {
    return results.filter((r) => r.signal === 'BUY' || r.signal === 'SELL');
  }
  if (mode === 'buy') return results.filter((r) => r.signal === 'BUY');
  if (mode === 'sell') return results.filter((r) => r.signal === 'SELL');
  return results;
}

export function sortScanResults(results, sortBy) {
  const rank = { BUY: 0, SELL: 1, NEUTRAL: 2 };
  const copy = [...results];
  copy.sort((a, b) => {
    if (sortBy === 'strength') return (b.strength || 0) - (a.strength || 0);
    if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
    const ra = rank[a.signal] ?? 9;
    const rb = rank[b.signal] ?? 9;
    if (ra !== rb) return ra - rb;
    return (b.strength || 0) - (a.strength || 0);
  });
  return copy;
}

export async function runChartScan({
  entries,
  strategyId,
  barSize,
  duration,
  fetchHistoricalBars,
  quotes,
  onProgress,
  maxSymbols = 30,
  pacingMs = 400,
}) {
  const list = (entries || []).slice(0, maxSymbols);
  const results = [];

  for (let idx = 0; idx < list.length; idx++) {
    const entry = list[idx];
    const symbol = (entry.ticker || entry.symbol || entry).toString().trim().toUpperCase();
    onProgress?.({ idx, total: list.length, symbol, phase: 'bars' });

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
        { barSize, duration },
      );
      if (res.error) error = res.error;
      else bars = res.bars || [];
    } catch (e) {
      error = e.message || 'Historical request failed';
    }

    const q = quotes?.[symbol];
    const live =
      q?.last > 0
        ? q.last
        : q?.bid > 0 && q?.ask > 0
          ? (q.bid + q.ask) / 2
          : q?.close > 0
            ? q.close
            : null;

    const evalRes = bars.length ? evaluateChartSignal(bars, strategyId, live) : {
      signal: 'NEUTRAL',
      strength: 0,
      reasons: [error || 'No bars'],
      metrics: {},
    };

    results.push({
      symbol,
      exchange: entry.exchange || 'SMART',
      currency: entry.currency || 'USD',
      signal: evalRes.signal,
      strength: evalRes.strength,
      reasons: evalRes.reasons,
      metrics: evalRes.metrics,
      live,
      barCount: bars.length,
      error,
    });

    if (idx < list.length - 1 && pacingMs > 0) {
      await new Promise((r) => setTimeout(r, pacingMs));
    }
  }

  onProgress?.({ idx: list.length, total: list.length, phase: 'done' });
  return results;
}
