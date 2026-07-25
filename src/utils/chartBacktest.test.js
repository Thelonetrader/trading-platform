import { backtestBars, BACKTEST_MIN_BARS } from './chartBacktest';

function syntheticBars(n, trend = 0.001) {
  const bars = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    price *= 1 + trend + (Math.sin(i / 7) * 0.002);
    bars.push({
      time: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: price * 0.998,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: 1e6,
    });
  }
  return bars;
}

describe('backtestBars', () => {
  it('produces stats and equity curve with enough bars', () => {
    const bars = syntheticBars(BACKTEST_MIN_BARS + 80);
    const result = backtestBars(bars, 'multi_confirm', {
      minStrength: 1,
      fillModel: 'next_open',
      initialCapital: 10000,
    });
    expect(result.error).toBeNull();
    expect(result.stats).toBeTruthy();
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.buyHoldCurve.length).toBeGreaterThan(0);
    expect(result.confidence.score).toBeGreaterThanOrEqual(0);
  });

  it('rejects short history', () => {
    const result = backtestBars(syntheticBars(10), 'sma_cross', {});
    expect(result.error).toMatch(/Need/);
  });
});
