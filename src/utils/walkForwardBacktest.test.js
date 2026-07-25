import { BACKTEST_MIN_BARS } from './chartBacktest';
import { walkForwardBacktest, resolveWalkForwardWindows } from './walkForwardBacktest';

function syntheticBars(n, trend = 0.0005) {
  const bars = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    price *= 1 + trend + Math.sin(i / 11) * 0.003;
    bars.push({
      time: `2020-${String((i % 12) + 1).padStart(2, '0')}-15`,
      open: price * 0.998,
      high: price * 1.012,
      low: price * 0.988,
      close: price,
      volume: 1e6,
    });
  }
  return bars;
}

describe('walkForwardBacktest', () => {
  it('builds multiple folds with compounded capital', () => {
    const bars = syntheticBars(400);
    const windows = { trainBars: 120, testBars: 40, stepBars: 40, label: 'test' };
    const result = walkForwardBacktest(bars, 'sma_cross', {
      minStrength: 1,
      initialCapital: 10000,
      fillModel: 'bar_close',
      barSize: '1 day',
    }, windows);

    expect(result.error).toBeNull();
    expect(result.numFolds).toBeGreaterThan(1);
    expect(result.folds.length).toBe(result.numFolds);
    expect(result.stitchedOosEquity.length).toBeGreaterThan(0);
    expect(result.combinedOosStats).toBeTruthy();
  });

  it('resolveWalkForwardWindows custom preset', () => {
    const w = resolveWalkForwardWindows('1 day', {
      wfPreset: 'custom',
      wfTrainBars: 100,
      wfTestBars: 30,
      wfStepBars: 30,
    });
    expect(w.trainBars).toBe(100);
    expect(w.testBars).toBe(30);
  });
});
