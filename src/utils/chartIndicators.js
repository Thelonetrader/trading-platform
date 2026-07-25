/** Technical indicators on OHLCV bar arrays (oldest → newest). */

export function barCloses(bars) {
  if (!bars?.length) return [];
  return bars.map((b) => Number(b.close)).filter((c) => Number.isFinite(c));
}

export function sma(values, period) {
  const p = Math.max(1, period);
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= p) sum -= values[i - p];
    if (i >= p - 1) out[i] = sum / p;
  }
  return out;
}

export function ema(values, period) {
  const p = Math.max(1, period);
  const out = new Array(values.length).fill(null);
  const k = 2 / (p + 1);
  for (let i = 0; i < values.length; i++) {
    if (i === 0) out[i] = values[i];
    else if (out[i - 1] == null) out[i] = values[i];
    else out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  for (let i = 0; i < p - 1; i++) out[i] = null;
  return out;
}

export function rsi(values, period = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  out[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out[i] = 100 - 100 / (1 + rs2);
  }
  return out;
}

export function macd(values, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const line = values.map((_, i) => {
    if (emaFast[i] == null || emaSlow[i] == null) return null;
    return emaFast[i] - emaSlow[i];
  });
  const signal = ema(
    line.map((v) => v ?? 0),
    signalPeriod,
  );
  const hist = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
  return { line, signal, hist };
}

export function highest(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let h = -Infinity;
    for (let j = i - period + 1; j <= i; j++) h = Math.max(h, values[j]);
    out[i] = h;
  }
  return out;
}

export function lowest(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let l = Infinity;
    for (let j = i - period + 1; j <= i; j++) l = Math.min(l, values[j]);
    out[i] = l;
  }
  return out;
}

export function lastValid(series) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null && Number.isFinite(series[i])) return { index: i, value: series[i] };
  }
  return { index: -1, value: null };
}

export function prevValid(series, fromIndex) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (series[i] != null && Number.isFinite(series[i])) return { index: i, value: series[i] };
  }
  return { index: -1, value: null };
}
