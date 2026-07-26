import {
  atr,
  barCloses,
  barVolumes,
  bollingerBands,
  ema,
  highest,
  lowest,
  macd as macdSeries,
  rsi as rsiSeries,
  sma,
} from './chartIndicators';
import { displayChangePct } from './quoteDisplay';
import { listingCurrency, marketCapUsd, parseCapMillions, priceUsd } from './fxUsd';

export const STRATEGY_CATEGORIES = [
  { id: 'all', label: 'All strategies' },
  { id: 'trend', label: 'Trend' },
  { id: 'momentum', label: 'Momentum' },
  { id: 'mean_reversion', label: 'Mean reversion' },
  { id: 'breakout', label: 'Breakout / volume' },
];

export const SCAN_STRATEGIES = [
  {
    id: 'multi_confirm',
    label: 'Multi-confirm trend',
    category: 'trend',
    minBars: 55,
    description: 'SMA20/50 + RSI zone + MACD histogram alignment.',
  },
  {
    id: 'sma_cross',
    label: 'SMA 20/50 cross',
    category: 'trend',
    minBars: 55,
    description: 'Golden / death cross on the latest bars.',
  },
  {
    id: 'ema_cross',
    label: 'EMA 9/21 cross',
    category: 'trend',
    minBars: 30,
    description: 'Fast EMA vs slow EMA crossover.',
  },
  {
    id: 'golden_cross_50_200',
    label: 'SMA 50/200 golden cross',
    category: 'trend',
    minBars: 205,
    description: 'Long-term trend change (requires ~200 bars).',
  },
  {
    id: 'trend_pullback',
    label: 'Uptrend pullback',
    category: 'trend',
    minBars: 55,
    description: 'Above SMA50 with RSI dip into buy zone.',
  },
  {
    id: 'macd_cross',
    label: 'MACD histogram flip',
    category: 'momentum',
    minBars: 55,
    description: 'Histogram crosses zero line.',
  },
  {
    id: 'macd_signal_cross',
    label: 'MACD signal cross',
    category: 'momentum',
    minBars: 55,
    description: 'MACD line crosses signal line.',
  },
  {
    id: 'rsi_reversal',
    label: 'RSI extremes',
    category: 'mean_reversion',
    minBars: 55,
    description: 'Oversold bounce / overbought fade.',
  },
  {
    id: 'bollinger_bounce',
    label: 'Bollinger lower bounce',
    category: 'mean_reversion',
    minBars: 55,
    description: 'Close near lower band with RSI support.',
  },
  {
    id: 'bollinger_breakout',
    label: 'Bollinger squeeze break',
    category: 'breakout',
    minBars: 55,
    description: 'Narrow bands then close above upper band.',
  },
  {
    id: 'breakout_20',
    label: '20-bar breakout + live',
    category: 'breakout',
    minBars: 55,
    description: 'Close at 20-bar high; live confirms.',
  },
  {
    id: 'volume_surge',
    label: 'Volume surge + price',
    category: 'breakout',
    minBars: 55,
    description: 'Volume vs 20-bar avg with directional close.',
  },
];

const DEFAULT_MIN_BARS = 55;

function strategyMinBars(strategyId) {
  return SCAN_STRATEGIES.find((s) => s.id === strategyId)?.minBars ?? DEFAULT_MIN_BARS;
}

function crossUp(prevA, prevB, a, b) {
  return prevA != null && prevB != null && a != null && b != null && prevA <= prevB && a > b;
}

function crossDown(prevA, prevB, a, b) {
  return prevA != null && prevB != null && a != null && b != null && prevA >= prevB && a < b;
}

function clampStrength(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeExtendedMetrics(bars, closes, i, px) {
  const vols = barVolumes(bars);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = closes.length >= 200 ? sma(closes, 200) : new Array(closes.length).fill(null);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const rsi = rsiSeries(closes, 14);
  const { line: macdLine, signal: macdSignal, hist: macdHist } = macdSeries(closes);
  const hi20 = highest(closes, 20);
  const lo20 = lowest(closes, 20);
  const bb = bollingerBands(closes, 20, 2);
  const atr14 = atr(bars, 14);

  const avgVol20 =
    i >= 19
      ? vols.slice(i - 19, i + 1).reduce((s, v) => s + v, 0) / 20
      : null;
  const volRatio = avgVol20 > 0 ? vols[i] / avgVol20 : null;

  const change5 =
    i >= 5 && closes[i - 5] > 0 ? ((closes[i] / closes[i - 5] - 1) * 100) : null;
  const pctFromSma50 =
    sma50[i] != null && sma50[i] > 0 ? ((px / sma50[i] - 1) * 100) : null;
  const bbWidth =
    bb.upper[i] != null && bb.mid[i] > 0
      ? ((bb.upper[i] - bb.lower[i]) / bb.mid[i]) * 100
      : null;
  const atrPct = px > 0 && atr14[i] != null ? (atr14[i] / px) * 100 : null;

  return {
    close: closes[i],
    live: px,
    sma20: sma20[i],
    sma50: sma50[i],
    sma200: sma200[i],
    ema9: ema9[i],
    ema21: ema21[i],
    rsi: rsi[i],
    macdHist: macdHist[i],
    macdLine: macdLine[i],
    macdSignal: macdSignal[i],
    high20: hi20[i],
    low20: lo20[i],
    bbUpper: bb.upper[i],
    bbLower: bb.lower[i],
    bbMid: bb.mid[i],
    bbWidth,
    atr14: atr14[i],
    atrPct,
    volRatio,
    change5,
    pctFromSma50,
    series: { sma20, sma50, sma200, ema9, ema21, rsi, macdHist, macdLine, macdSignal, hi20, lo20, bb, vols },
  };
}

export function evaluateChartSignal(bars, strategyId, livePrice = null) {
  const minBars = strategyMinBars(strategyId);
  const closes = barCloses(bars);
  if (closes.length < minBars) {
    return {
      signal: 'NEUTRAL',
      strength: 0,
      reasons: [`Need ${minBars}+ bars (have ${closes.length})`],
      metrics: {},
    };
  }

  const i = closes.length - 1;
  const pi = i - 1;
  const px = livePrice != null && Number.isFinite(Number(livePrice)) ? Number(livePrice) : closes[i];
  const m = computeExtendedMetrics(bars, closes, i, px);
  const { sma20, sma50, sma200, ema9, ema21, rsi, macdHist, macdLine, macdSignal, hi20, lo20, bb, vols } =
    m.series;

  const metrics = { ...m };
  delete metrics.series;

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

  if (strategyId === 'ema_cross') {
    if (crossUp(ema9[pi], ema21[pi], ema9[i], ema21[i])) addBuy('EMA9 crossed above EMA21', 2);
    if (crossDown(ema9[pi], ema21[pi], ema9[i], ema21[i])) addSell('EMA9 crossed below EMA21', 2);
  }

  if (strategyId === 'golden_cross_50_200') {
    if (crossUp(sma50[pi], sma200[pi], sma50[i], sma200[i])) addBuy('SMA50 crossed above SMA200', 3);
    if (crossDown(sma50[pi], sma200[pi], sma50[i], sma200[i])) addSell('SMA50 crossed below SMA200', 3);
    if (sma50[i] > sma200[i] && px > sma50[i]) addBuy('Price above SMA50 in long uptrend', 1);
  }

  if (strategyId === 'trend_pullback') {
    if (sma50[i] != null && px > sma50[i] && sma20[i] > sma50[i]) {
      if (rsi[i] != null && rsi[i] >= 38 && rsi[i] <= 48) addBuy('Pullback RSI in uptrend', 2);
      if (rsi[i] != null && rsi[i] < 38) addBuy('Deep pullback RSI in uptrend', 2.5);
    }
    if (sma50[i] != null && px < sma50[i] && rsi[i] != null && rsi[i] > 55) {
      addSell('Failed rally under SMA50', 1.5);
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
  }

  if (strategyId === 'macd_signal_cross') {
    if (crossUp(macdLine[pi], macdSignal[pi], macdLine[i], macdSignal[i])) {
      addBuy('MACD crossed above signal', 2.5);
    }
    if (crossDown(macdLine[pi], macdSignal[pi], macdLine[i], macdSignal[i])) {
      addSell('MACD crossed below signal', 2.5);
    }
  }

  if (strategyId === 'bollinger_bounce') {
    if (bb.lower[i] != null && closes[i] <= bb.lower[i] * 1.005) {
      addBuy('At/below lower Bollinger band', 2);
      if (rsi[i] != null && rsi[i] < 40) addBuy('RSI supports bounce', 1);
    }
    if (bb.upper[i] != null && closes[i] >= bb.upper[i] * 0.995) {
      addSell('At/above upper Bollinger band', 2);
    }
  }

  if (strategyId === 'bollinger_breakout') {
    const prevWidth =
      bb.mid[pi] > 0 && bb.upper[pi] != null
        ? (bb.upper[pi] - bb.lower[pi]) / bb.mid[pi]
        : null;
    const curWidth = metrics.bbWidth != null ? metrics.bbWidth / 100 : null;
    if (prevWidth != null && curWidth != null && prevWidth < 0.06 && bb.upper[i] != null && closes[i] > bb.upper[i]) {
      addBuy('Squeeze breakout above upper band', 3);
    }
    if (bb.lower[i] != null && closes[i] < bb.lower[i]) addSell('Breakdown below lower band', 2);
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

  if (strategyId === 'volume_surge') {
    const avgVol =
      i >= 19 ? vols.slice(i - 19, i + 1).reduce((s, v) => s + v, 0) / 20 : 0;
    const ratio = avgVol > 0 ? vols[i] / avgVol : 0;
    if (ratio >= 1.5 && closes[i] > closes[pi]) {
      addBuy(`Volume ${ratio.toFixed(1)}× avg + up bar`, 2.5);
    }
    if (ratio >= 1.5 && closes[i] < closes[pi]) {
      addSell(`Volume ${ratio.toFixed(1)}× avg + down bar`, 2.5);
    }
  }

  if (strategyId === 'multi_confirm') {
    if (rsi[i] != null && rsi[i] >= 45 && rsi[i] <= 62 && sma20[i] > sma50[i]) {
      addBuy('RSI trend zone with SMA alignment', 1);
    }
    if (macdHist[i] != null && macdHist[i] > 0) addBuy('MACD histogram positive', 0.5);
    if (macdHist[i] != null && macdHist[i] < 0) addSell('MACD histogram negative', 0.5);
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

export function applyScanFilters(results, filters, quotes = {}, snapshots = {}) {
  const f = filters || {};
  const minStr = Number(f.minStrength) || 0;
  const minRsi = numOrNull(f.minRsi);
  const maxRsi = numOrNull(f.maxRsi);
  const minChg = numOrNull(f.minChangePct);
  const maxChg = numOrNull(f.maxChangePct);
  const minPx = numOrNull(f.minPrice);
  const maxPx = numOrNull(f.maxPrice);
  const minVol = numOrNull(f.minVolRatio);
  const minPct50 = numOrNull(f.minPctAboveSma50);
  const maxPct50 = numOrNull(f.maxPctAboveSma50);
  const minMktCap = parseCapMillions(f.minMktCapM);
  const maxMktCap = parseCapMillions(f.maxMktCapM);
  const trend = f.trendVsSma50 || 'any';

  return (results || []).filter((row) => {
    if ((row.strength || 0) < minStr) return false;
    const m = row.metrics || {};
    if (minRsi != null && (m.rsi == null || m.rsi < minRsi)) return false;
    if (maxRsi != null && (m.rsi == null || m.rsi > maxRsi)) return false;
    if (minVol != null && (m.volRatio == null || m.volRatio < minVol)) return false;
    if (minPct50 != null && (m.pctFromSma50 == null || m.pctFromSma50 < minPct50)) return false;
    if (maxPct50 != null && (m.pctFromSma50 == null || m.pctFromSma50 > maxPct50)) return false;

    if (trend === 'above_sma50') {
      if (m.sma50 == null || m.live == null || m.live <= m.sma50) return false;
    }
    if (trend === 'below_sma50') {
      if (m.sma50 == null || m.live == null || m.live >= m.sma50) return false;
    }

    const q = quotes[row.symbol];
    const chNum = displayChangePct(q);
    if (minChg != null && (chNum == null || chNum < minChg)) return false;
    if (maxChg != null && (chNum == null || chNum > maxChg)) return false;

    const snap = snapshots[row.symbol];
    const rowMeta = { currency: listingCurrency(snap, null) };
    const pxUsd = priceUsd(q, snap, rowMeta);
    if (minPx != null && (pxUsd == null || pxUsd < minPx)) return false;
    if (maxPx != null && (pxUsd == null || pxUsd > maxPx)) return false;

    const mcap = marketCapUsd(snap, rowMeta);
    if (minMktCap != null && (mcap == null || mcap < minMktCap)) return false;
    if (maxMktCap != null && (mcap == null || mcap > maxMktCap)) return false;

    return true;
  });
}

export function sortScanResults(results, sortBy, snapshots = {}) {
  const rank = { BUY: 0, SELL: 1, NEUTRAL: 2 };
  const copy = [...results];
  copy.sort((a, b) => {
    if (sortBy === 'change5') {
      return (b.metrics?.change5 ?? -999) - (a.metrics?.change5 ?? -999);
    }
    if (sortBy === 'rsi') {
      return (b.metrics?.rsi ?? -1) - (a.metrics?.rsi ?? -1);
    }
    if (sortBy === 'volRatio') {
      return (b.metrics?.volRatio ?? 0) - (a.metrics?.volRatio ?? 0);
    }
    if (sortBy === 'marketCap') {
      const ma = marketCapUsd(snapshots[a.symbol], { currency: listingCurrency(snapshots[a.symbol], null) }) ?? -Infinity;
      const mb = marketCapUsd(snapshots[b.symbol], { currency: listingCurrency(snapshots[b.symbol], null) }) ?? -Infinity;
      return mb - ma;
    }
    if (sortBy === 'pctSma50') {
      return (b.metrics?.pctFromSma50 ?? -999) - (a.metrics?.pctFromSma50 ?? -999);
    }
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
  onSymbolError,
}) {
  const cap = Math.min(Math.max(1, maxSymbols), 500);
  const list = (entries || []).slice(0, cap);
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
      onSymbolError?.({ symbol, error });
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

    const evalRes = bars.length
      ? evaluateChartSignal(bars, strategyId, live)
      : {
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

export function strategiesForCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return SCAN_STRATEGIES;
  return SCAN_STRATEGIES.filter((s) => s.category === categoryId);
}
