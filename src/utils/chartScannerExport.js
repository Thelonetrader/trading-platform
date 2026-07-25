import { downloadCsv, rowsToCsv } from './csvExport';
import { displayChangePct, displayPrice } from './quoteDisplay';

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function buildScanResultRows(results, { quotes = {}, strategyId, barSize, scannedAt }) {
  const when = scannedAt ? new Date(scannedAt).toISOString() : '';
  return (results || []).map((row) => {
    const q = quotes[row.symbol];
    const m = row.metrics || {};
    const px = displayPrice(q) ?? row.live ?? m.close;
    const ch = displayChangePct(q);
    return {
      symbol: row.symbol,
      signal: row.signal,
      strength: row.strength ?? '',
      last: px != null ? Number(px).toFixed(4) : '',
      change_pct: ch != null ? ch.toFixed(4) : '',
      rsi: m.rsi != null ? m.rsi.toFixed(2) : '',
      sma20: m.sma20 != null ? m.sma20.toFixed(4) : '',
      sma50: m.sma50 != null ? m.sma50.toFixed(4) : '',
      macd_hist: m.macdHist != null ? m.macdHist.toFixed(6) : '',
      bar_count: row.barCount ?? '',
      reasons: (row.reasons || []).join(' | '),
      error: row.error || '',
      strategy: strategyId || '',
      bar_size: barSize || '',
      scanned_at: when,
    };
  });
}

const SCAN_HEADERS = [
  'symbol',
  'signal',
  'strength',
  'last',
  'change_pct',
  'rsi',
  'sma20',
  'sma50',
  'macd_hist',
  'bar_count',
  'reasons',
  'error',
  'strategy',
  'bar_size',
  'scanned_at',
];

export function downloadScanResultsCsv(results, meta) {
  const rows = buildScanResultRows(results, meta);
  const csv = rowsToCsv(SCAN_HEADERS, rows);
  downloadCsv(`chart-scanner-${stamp()}.csv`, csv);
}

const BACKTEST_SUMMARY_HEADERS = [
  'symbol',
  'confidence',
  'trades',
  'win_rate_pct',
  'total_return_pct',
  'cagr_pct',
  'sharpe',
  'sortino',
  'max_drawdown_pct',
  'profit_factor',
  'expectancy',
  'alpha_vs_buy_hold_pct',
  'buy_hold_return_pct',
  'oos_return_pct',
  'wf_compounded_return_pct',
  'wf_efficiency_pct',
  'wf_num_folds',
  'oos_trades',
  'exposure_pct',
  'avg_bars_held',
  'final_equity',
  'strategy',
  'bar_size',
  'duration',
  'fill_model',
  'min_strength',
  'commission_bps',
  'slippage_bps',
  'stop_loss_pct',
  'take_profit_pct',
  'max_hold_bars',
  'oos_split_pct',
  'confidence_notes',
  'backtest_at',
  'error',
];

export function downloadBacktestSummaryCsv(summaries, meta) {
  const when = new Date().toISOString();
  const rows = (summaries || []).map((s) => ({
    symbol: s.symbol,
    confidence: s.confidence?.score ?? '',
    trades: s.stats?.numTrades ?? 0,
    win_rate_pct: s.stats?.winRatePct != null ? s.stats.winRatePct.toFixed(2) : '',
    total_return_pct: s.stats?.totalReturnPct != null ? s.stats.totalReturnPct.toFixed(2) : '',
    cagr_pct: s.stats?.cagrPct != null ? s.stats.cagrPct.toFixed(2) : '',
    sharpe: s.stats?.sharpe != null ? s.stats.sharpe.toFixed(3) : '',
    sortino: s.stats?.sortino != null ? s.stats.sortino.toFixed(3) : '',
    max_drawdown_pct: s.stats?.maxDrawdownPct != null ? s.stats.maxDrawdownPct.toFixed(2) : '',
    profit_factor: s.stats?.profitFactor != null ? s.stats.profitFactor.toFixed(2) : '',
    expectancy: s.stats?.expectancy != null ? s.stats.expectancy.toFixed(2) : '',
    alpha_vs_buy_hold_pct:
      s.stats?.alphaVsHoldPct != null ? s.stats.alphaVsHoldPct.toFixed(2) : '',
    buy_hold_return_pct:
      s.stats?.buyHoldReturnPct != null ? s.stats.buyHoldReturnPct.toFixed(2) : '',
    oos_return_pct:
      s.oosStats?.totalReturnPct != null ? s.oosStats.totalReturnPct.toFixed(2) : '',
    wf_compounded_return_pct:
      s.walkForward?.compoundedReturnPct != null
        ? s.walkForward.compoundedReturnPct.toFixed(2)
        : '',
    wf_efficiency_pct:
      s.walkForward?.wfEfficiencyPct != null ? s.walkForward.wfEfficiencyPct.toFixed(2) : '',
    wf_num_folds: s.walkForward?.numFolds ?? '',
    exposure_pct: s.stats?.exposurePct != null ? s.stats.exposurePct.toFixed(1) : '',
    avg_bars_held: s.stats?.avgBarsHeld != null ? s.stats.avgBarsHeld.toFixed(1) : '',
    final_equity: s.stats?.finalEquity != null ? s.stats.finalEquity.toFixed(2) : '',
    strategy: meta?.strategyId || '',
    bar_size: meta?.barSize || '',
    duration: meta?.duration || '',
    fill_model: meta?.fillModel || '',
    min_strength: meta?.minStrength ?? '',
    commission_bps: meta?.commissionBps ?? '',
    slippage_bps: meta?.slippageBps ?? '',
    stop_loss_pct: meta?.stopLossPct ?? '',
    take_profit_pct: meta?.takeProfitPct ?? '',
    max_hold_bars: meta?.maxHoldBars ?? '',
    oos_split_pct: meta?.oosSplitPct ?? '',
    confidence_notes: (s.confidence?.notes || []).join(' | '),
    backtest_at: when,
    error: s.error || '',
  }));
  downloadCsv(`chart-backtest-summary-${stamp()}.csv`, rowsToCsv(BACKTEST_SUMMARY_HEADERS, rows));
}

const TRADE_HEADERS = [
  'symbol',
  'entry_time',
  'exit_time',
  'entry_price',
  'exit_price',
  'shares',
  'pnl',
  'pnl_pct',
  'bars_held',
  'exit_strength',
  'exit_reason',
];

export function downloadBacktestTradesCsv(tradeRows) {
  if (!tradeRows?.length) return;
  downloadCsv(`chart-backtest-trades-${stamp()}.csv`, rowsToCsv(TRADE_HEADERS, tradeRows));
}

const WF_FOLD_HEADERS = [
  'symbol',
  'fold',
  'test_from',
  'test_to',
  'is_return_pct',
  'oos_return_pct',
  'oos_trades',
  'end_capital',
];

export function downloadWalkForwardFoldsCsv(foldRows) {
  if (!foldRows?.length) return;
  downloadCsv(`chart-walk-forward-folds-${stamp()}.csv`, rowsToCsv(WF_FOLD_HEADERS, foldRows));
}
