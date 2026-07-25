import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UNIVERSE_OPTIONS } from './data/screenerIndexLists';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import { WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { readJson } from './utils/storageStats';
import { getJournalIndexByTicker } from './utils/journalIndex';
import { buildUniverseRows, resolveUniverseTickers } from './utils/screenerUniverse';
import { displayChangePct, displayPrice } from './utils/quoteDisplay';
import {
  SCAN_STRATEGIES,
  filterSignals,
  runChartScan,
  sortScanResults,
} from './utils/chartScannerEngine';
import { runChartBacktest } from './utils/chartBacktest';
import {
  loadBacktestPrefs,
  prefsToEngineOptions,
  resolveBacktestBarOption,
} from './utils/backtestConfig';
import { resolveWalkForwardWindows } from './utils/walkForwardBacktest';
import BacktestResultsPanel from './components/BacktestResultsPanel';
import {
  downloadBacktestSummaryCsv,
  downloadBacktestTradesCsv,
  downloadScanResultsCsv,
  downloadWalkForwardFoldsCsv,
} from './utils/chartScannerExport';

const BAR_OPTIONS = [
  { id: '1 day', duration: '1 Y', label: 'Daily (1Y history)', maxSymbols: 30 },
  { id: '1 hour', duration: '3 M', label: '1 hour (3M history)', maxSymbols: 18 },
];

const SIGNAL_FILTERS = [
  { id: 'action', label: 'Buy & sell only' },
  { id: 'all', label: 'All signals' },
  { id: 'buy', label: 'Buy only' },
  { id: 'sell', label: 'Sell only' },
];

function signalColor(sig) {
  if (sig === 'BUY') return '#22c55e';
  if (sig === 'SELL') return '#ef4444';
  return '#64748b';
}

export default function ChartScanner({
  quotes = {},
  connection,
  fetchHistoricalBars,
  isElectron,
  onOpenTerminal,
  onUniverseEntriesChange,
}) {
  const [universeId, setUniverseId] = useState('watchlist');
  const [customUniverse, setCustomUniverse] = useState('');
  const [strategyId, setStrategyId] = useState('multi_confirm');
  const [barOptionId, setBarOptionId] = useState('1 day');
  const [signalFilter, setSignalFilter] = useState('action');
  const [sortBy, setSortBy] = useState('strength');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [scanError, setScanError] = useState('');
  const [lastScanAt, setLastScanAt] = useState(null);
  const [watchlistSnapshot, setWatchlistSnapshot] = useState(() => readJson('watchlist', []));
  const [backtesting, setBacktesting] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(null);
  const [backtestSummaries, setBacktestSummaries] = useState([]);
  const [backtestTrades, setBacktestTrades] = useState([]);
  const [backtestAggregate, setBacktestAggregate] = useState(null);
  const [backtestError, setBacktestError] = useState('');
  const [lastBacktestAt, setLastBacktestAt] = useState(null);
  const [backtestPrefs, setBacktestPrefs] = useState(() => loadBacktestPrefs());
  const [selectedBacktestSymbol, setSelectedBacktestSymbol] = useState(null);
  const [backtestMeta, setBacktestMeta] = useState('');

  useEffect(() => {
    const reload = () => setWatchlistSnapshot(readJson('watchlist', []));
    window.addEventListener(WATCHLIST_CHANGED_EVENT, reload);
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, reload);
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    };
  }, []);

  const universeTickers = useMemo(
    () => resolveUniverseTickers(universeId, customUniverse),
    [universeId, customUniverse, watchlistSnapshot],
  );

  const universeEntries = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    return buildUniverseRows(universeTickers, journalIndex).map((r) => ({
      ticker: r.ticker,
      exchange: r.exchange,
      currency: r.currency,
    }));
  }, [universeTickers]);

  useEffect(() => {
    onUniverseEntriesChange?.(universeEntries);
  }, [universeEntries, onUniverseEntriesChange]);

  const barOpt = BAR_OPTIONS.find((b) => b.id === barOptionId) || BAR_OPTIONS[0];
  const backtestBarOpt = resolveBacktestBarOption(backtestPrefs.backtestDurationKey);
  const engineOptions = useMemo(
    () => prefsToEngineOptions(backtestPrefs),
    [backtestPrefs],
  );

  const displayed = useMemo(() => {
    const filtered = filterSignals(results, signalFilter);
    return sortScanResults(filtered, sortBy);
  }, [results, signalFilter, sortBy]);

  const runScan = useCallback(async () => {
    if (!isElectron || !fetchHistoricalBars) {
      setScanError('Run npm run electron:dev and connect IB for chart scanning.');
      return;
    }
    if (connection?.status !== 'connected') {
      setScanError('Connect IB in Settings — scanner uses IB historical bars + live quotes.');
      return;
    }
    if (!universeEntries.length) {
      setScanError('Choose a universe with at least one symbol.');
      return;
    }

    setScanning(true);
    setScanError('');
    setResults([]);
    setProgress({ idx: 0, total: universeEntries.length, symbol: '…' });

    try {
      const out = await runChartScan({
        entries: universeEntries,
        strategyId,
        barSize: barOpt.id,
        duration: barOpt.duration,
        fetchHistoricalBars,
        quotes,
        maxSymbols: barOpt.maxSymbols,
        pacingMs: 450,
        onProgress: setProgress,
      });
      setResults(out);
      setLastScanAt(Date.now());
    } catch (e) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }, [
    barOpt.duration,
    barOpt.id,
    barOpt.maxSymbols,
    connection?.status,
    fetchHistoricalBars,
    isElectron,
    quotes,
    strategyId,
    universeEntries,
  ]);

  const runBacktest = useCallback(async () => {
    if (!isElectron || !fetchHistoricalBars) {
      setBacktestError('Run npm run electron:dev and connect IB for backtesting.');
      return;
    }
    if (connection?.status !== 'connected') {
      setBacktestError('Connect IB in Settings — backtest uses IB historical bars.');
      return;
    }
    if (!universeEntries.length) {
      setBacktestError('Choose a universe with at least one symbol.');
      return;
    }

    setBacktesting(true);
    setBacktestError('');
    setBacktestSummaries([]);
    setBacktestTrades([]);
    setBacktestAggregate(null);
    setBacktestMeta('');
    setSelectedBacktestSymbol(null);
    setBacktestProgress({ idx: 0, total: universeEntries.length, symbol: '…' });

    try {
      const out = await runChartBacktest({
        entries: universeEntries,
        strategyId,
        barSize: backtestBarOpt.id,
        duration: backtestBarOpt.duration,
        fetchHistoricalBars,
        maxSymbols: backtestBarOpt.maxSymbols,
        pacingMs: 450,
        engineOptions,
        onProgress: setBacktestProgress,
      });
      setBacktestSummaries(out.summaries);
      setBacktestTrades(out.trades);
      setBacktestAggregate(out.aggregate);
      const firstWithStats = out.summaries.find((s) => s.stats);
      if (firstWithStats) setSelectedBacktestSymbol(firstWithStats.symbol);
      const fill =
        backtestPrefs.fillModel === 'next_open' ? 'next-bar open fills' : 'same-bar close fills';
      const wf = engineOptions.walkForwardEnabled
        ? resolveWalkForwardWindows(backtestBarOpt.id, engineOptions)
        : null;
      setBacktestMeta(
        `${backtestBarOpt.label} · ${fill} · ${engineOptions.commissionBps} bps commission · ${engineOptions.slippageBps} bps slippage${
          wf
            ? ` · walk-forward: ${wf.label} (train ${wf.trainBars} / test ${wf.testBars} / step ${wf.stepBars})`
            : ` · static OOS ${engineOptions.oosSplitPct}% holdout`
        }`,
      );
      setLastBacktestAt(Date.now());
    } catch (e) {
      setBacktestError(e.message || 'Backtest failed');
    } finally {
      setBacktesting(false);
      setBacktestProgress(null);
    }
  }, [
    backtestBarOpt.duration,
    backtestBarOpt.id,
    backtestBarOpt.label,
    backtestBarOpt.maxSymbols,
    backtestPrefs.fillModel,
    connection?.status,
    engineOptions,
    fetchHistoricalBars,
    isElectron,
    strategyId,
    universeEntries,
  ]);

  const exportScanCsv = useCallback(() => {
    if (!results.length) return;
    downloadScanResultsCsv(results, {
      quotes,
      strategyId,
      barSize: barOpt.id,
      scannedAt: lastScanAt,
    });
  }, [barOpt.id, lastScanAt, quotes, results, strategyId]);

  const exportBacktestCsv = useCallback(() => {
    if (!backtestSummaries.length) return;
    downloadBacktestSummaryCsv(backtestSummaries, {
      strategyId,
      barSize: backtestBarOpt.id,
      duration: backtestBarOpt.duration,
      fillModel: engineOptions.fillModel,
      minStrength: engineOptions.minStrength,
      commissionBps: engineOptions.commissionBps,
      slippageBps: engineOptions.slippageBps,
      stopLossPct: engineOptions.stopLossPct,
      takeProfitPct: engineOptions.takeProfitPct,
      maxHoldBars: engineOptions.maxHoldBars,
      oosSplitPct: engineOptions.oosSplitPct,
    });
    if (backtestTrades.length) downloadBacktestTradesCsv(backtestTrades);
    const wfRows = backtestSummaries.flatMap((s) =>
      (s.walkForward?.folds || []).map((f) => ({
        symbol: s.symbol,
        fold: f.index + 1,
        test_from: f.testFromTime || f.testFrom,
        test_to: f.testToTime || f.testTo,
        is_return_pct: f.isStats?.totalReturnPct?.toFixed(2) ?? '',
        oos_return_pct: f.oosStats?.totalReturnPct?.toFixed(2) ?? '',
        oos_trades: f.oosTradesCount,
        end_capital: f.endCapital?.toFixed(2) ?? '',
      })),
    );
    if (wfRows.length) downloadWalkForwardFoldsCsv(wfRows);
  }, [
    backtestSummaries,
    backtestTrades,
    backtestBarOpt.duration,
    backtestBarOpt.id,
    engineOptions,
    strategyId,
  ]);

  const inputStyle = {
    background: '#060b16',
    border: '1px solid #1a2035',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };

  const livePriced = universeTickers.filter((t) => displayPrice(quotes[t]) != null).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Technical scan
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>Chart Scanner</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, maxWidth: 680, lineHeight: 1.55 }}>
          Runs indicator rules on IB historical bars and blends in <strong style={{ color: '#94a3b8' }}>live</strong>{' '}
          last/bid/ask when subscribed. Outputs research signals — not auto-trading or financial advice.
        </p>
      </div>

      <div
        style={{
          background: '#450a0a22',
          border: '1px solid #7f1d1d55',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 12,
          color: '#fca5a5',
          marginBottom: 16,
          lineHeight: 1.45,
        }}
      >
        Signals are rule-based research hints. Verify on the Terminal chart before placing orders. Past patterns do not
        guarantee future results.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Universe ({universeTickers.length} symbols, max {barOpt.maxSymbols} scanned)</label>
          <select style={inputStyle} value={universeId} onChange={(e) => setUniverseId(e.target.value)}>
            {UNIVERSE_OPTIONS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        {universeId === 'custom' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <textarea
              style={{ ...inputStyle, minHeight: 64 }}
              placeholder="AAPL, MSFT, …"
              value={customUniverse}
              onChange={(e) => setCustomUniverse(e.target.value.toUpperCase())}
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>Strategy</label>
          <select style={inputStyle} value={strategyId} onChange={(e) => setStrategyId(e.target.value)}>
            {SCAN_STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Bar size</label>
          <select style={inputStyle} value={barOptionId} onChange={(e) => setBarOptionId(e.target.value)}>
            {BAR_OPTIONS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Show</label>
          <select style={inputStyle} value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)}>
            {SIGNAL_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort</label>
          <select style={inputStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="strength">Strength</option>
            <option value="symbol">Symbol</option>
          </select>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#475569', margin: '-8px 0 12px' }}>
        {SCAN_STRATEGIES.find((s) => s.id === strategyId)?.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: scanning ? '#334155' : '#6366f1',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: scanning ? 'wait' : 'pointer',
          }}
        >
          {scanning ? 'Scanning…' : 'Run chart scan'}
        </button>
        <button
          type="button"
          onClick={exportScanCsv}
          disabled={!results.length || scanning}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#0f172a',
            color: results.length ? '#e2e8f0' : '#64748b',
            fontWeight: 600,
            fontSize: 13,
            cursor: results.length ? 'pointer' : 'default',
          }}
        >
          Export scan CSV
        </button>
        <button
          type="button"
          onClick={runBacktest}
          disabled={backtesting || scanning}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: backtesting ? '#334155' : '#0d9488',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: backtesting ? 'wait' : 'pointer',
          }}
        >
          {backtesting ? 'Backtesting…' : 'Run backtest'}
        </button>
        <span style={{ fontSize: 12, color: connection?.status === 'connected' ? '#22c55e' : '#64748b' }}>
          IB {connection?.status || 'offline'}
        </span>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Live quotes: {livePriced}/{universeTickers.length}
        </span>
        {lastScanAt && (
          <span style={{ fontSize: 12, color: '#475569' }}>
            Last scan {new Date(lastScanAt).toLocaleTimeString()}
          </span>
        )}
        {scanning && progress && (
          <span style={{ fontSize: 12, color: '#818cf8' }}>
            {progress.symbol} ({progress.idx}/{progress.total})
          </span>
        )}
        {backtesting && backtestProgress && (
          <span style={{ fontSize: 12, color: '#2dd4bf' }}>
            BT {backtestProgress.symbol} ({backtestProgress.idx}/{backtestProgress.total})
          </span>
        )}
        {lastBacktestAt && !backtesting && (
          <span style={{ fontSize: 12, color: '#475569' }}>
            Last backtest {new Date(lastBacktestAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {backtestError && <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>{backtestError}</div>}

      <BacktestResultsPanel
        prefs={backtestPrefs}
        onPrefsChange={setBacktestPrefs}
        backtestSummaries={backtestSummaries}
        backtestTrades={backtestTrades}
        backtestAggregate={backtestAggregate}
        backtestMeta={backtestMeta}
        backtestBarSize={backtestBarOpt.id}
        selectedSymbol={selectedBacktestSymbol}
        onSelectSymbol={setSelectedBacktestSymbol}
        onOpenTerminal={onOpenTerminal}
        onExportCsv={exportBacktestCsv}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
      />

      {scanError && <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>{scanError}</div>}

      {displayed.length === 0 && !scanning && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: '#475569',
            border: '1px dashed #1a2035',
            borderRadius: 12,
          }}
        >
          {results.length ? 'No rows match the signal filter.' : 'Configure universe and strategy, then run chart scan.'}
        </div>
      )}

      {displayed.length > 0 && (
        <div style={{ overflow: 'auto', border: '1px solid #1a2035', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{ background: '#060b16' }}>
                {['Symbol', 'Signal', 'Str', 'Last', 'Chg%', 'RSI', 'SMA20/50', 'MACD hist', 'Reasons', ''].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: 10,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid #1a2035',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row) => {
                const q = quotes[row.symbol];
                const px = displayPrice(q) ?? row.live ?? row.metrics?.close;
                const ch = displayChangePct(q);
                const m = row.metrics || {};
                const smaTrend =
                  m.sma20 != null && m.sma50 != null
                    ? m.sma20 > m.sma50
                      ? '▲ bull'
                      : '▼ bear'
                    : '—';
                return (
                  <tr key={row.symbol} style={{ borderBottom: '1px solid #0f1424' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f8fafc' }}>{row.symbol}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: signalColor(row.signal) }}>
                      {row.signal}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#818cf8' }}>{row.strength || '—'}</td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontFamily: 'ui-monospace, monospace',
                        color: '#e2e8f0',
                      }}
                    >
                      {px != null ? Number(px).toFixed(2) : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontFamily: 'ui-monospace, monospace',
                        color: ch == null ? '#475569' : ch >= 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.rsi != null ? m.rsi.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94a3b8' }}>{smaTrend}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.macdHist != null ? m.macdHist.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', maxWidth: 280 }}>
                      {(row.reasons || []).slice(0, 3).join(' · ') || row.error || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        type="button"
                        onClick={() => onOpenTerminal?.(row.symbol)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#6366f1',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Chart
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
