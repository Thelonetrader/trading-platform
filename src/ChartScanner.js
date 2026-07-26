import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import { WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { readJson } from './utils/storageStats';
import { getJournalIndexByTicker } from './utils/journalIndex';
import { buildUniverseRows, resolveUniverseTickers } from './utils/screenerUniverse';
import { displayChangePct, displayPrice } from './utils/quoteDisplay';
import { fmtMktCap, marketCapFromSnapshots } from './utils/screenerFilters';
import {
  applyScanFilters,
  filterSignals,
  runChartScan,
  sortScanResults,
} from './utils/chartScannerEngine';
import {
  loadScannerPrefs,
  resolveScanBarOption,
  resolveScanRunLimits,
  saveScannerPrefs,
  formatScanEstimate,
} from './utils/chartScannerConfig';
import { useLiveUniverseTickers } from './hooks/useLiveUniverse';
import ChartScannerSetup from './components/ChartScannerSetup';
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


function signalColor(sig) {
  if (sig === 'BUY') return '#22c55e';
  if (sig === 'SELL') return '#ef4444';
  return '#64748b';
}

export default function ChartScanner({
  quotes = {},
  connection,
  fetchHistoricalBars,
  fetchScreenerSnapshots,
  hasFmpKey = false,
  isElectron,
  onOpenTerminal,
  onUniverseEntriesChange,
  searchSymbols,
  fetchCompanyScreener,
}) {
  const [scannerPrefs, setScannerPrefs] = useState(() => loadScannerPrefs());
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
  const [fundSnapshots, setFundSnapshots] = useState({});
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapError, setSnapError] = useState('');

  useEffect(() => {
    const reload = () => setWatchlistSnapshot(readJson('watchlist', []));
    window.addEventListener(WATCHLIST_CHANGED_EVENT, reload);
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, reload);
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, reload);
    };
  }, []);

  useEffect(() => {
    saveScannerPrefs(scannerPrefs);
  }, [scannerPrefs]);

  const symbolPickTickers = useMemo(
    () => (scannerPrefs.symbolPicks || []).map((p) => p.ticker).filter(Boolean),
    [scannerPrefs.symbolPicks],
  );

  const liveUniverse = useLiveUniverseTickers({
    universeId: scannerPrefs.universeId,
    liveUniverse: scannerPrefs.liveUniverse,
    symbolPickTickers,
    fetchCompanyScreener,
    hasFmpKey,
  });

  const universeTickers = useMemo(() => {
    if (scannerPrefs.universeId === 'live') {
      return liveUniverse.mergedTickers || [];
    }
    return resolveUniverseTickers(
      scannerPrefs.universeId,
      scannerPrefs.customUniverse,
      symbolPickTickers,
    );
  }, [
    scannerPrefs.universeId,
    scannerPrefs.customUniverse,
    symbolPickTickers,
    liveUniverse.mergedTickers,
    watchlistSnapshot,
  ]);

  const nameByTicker = useMemo(() => {
    if (scannerPrefs.universeId === 'live') {
      return liveUniverse.nameByTicker || {};
    }
    const map = {};
    for (const p of scannerPrefs.symbolPicks || []) {
      if (p.ticker && p.name) map[p.ticker.toUpperCase()] = p.name;
    }
    return map;
  }, [scannerPrefs.universeId, scannerPrefs.symbolPicks, liveUniverse.nameByTicker]);

  const universeEntries = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    return buildUniverseRows(universeTickers, journalIndex, undefined, nameByTicker).map((r) => ({
      ticker: r.ticker,
      exchange: r.exchange,
      currency: r.currency,
    }));
  }, [universeTickers, nameByTicker]);

  useEffect(() => {
    onUniverseEntriesChange?.(universeEntries);
  }, [universeEntries, onUniverseEntriesChange]);

  const loadFundSnapshots = useCallback(async () => {
    if (!fetchScreenerSnapshots || !universeTickers.length) {
      setFundSnapshots({});
      return;
    }
    if (!hasFmpKey) {
      setSnapError('');
      return;
    }
    setSnapLoading(true);
    setSnapError('');
    try {
      const res = await fetchScreenerSnapshots(universeTickers);
      if (res?.error) setSnapError(res.error);
      setFundSnapshots(res?.snapshots || {});
    } catch (e) {
      setSnapError(e.message || 'Fundamentals load failed');
    } finally {
      setSnapLoading(false);
    }
  }, [fetchScreenerSnapshots, hasFmpKey, universeTickers]);

  useEffect(() => {
    loadFundSnapshots();
  }, [loadFundSnapshots]);

  const needsMktCap =
    scannerPrefs.filters?.minMktCapM ||
    scannerPrefs.filters?.maxMktCapM ||
    scannerPrefs.sortBy === 'marketCap' ||
    scannerPrefs.columns?.marketCap;

  const barOpt = resolveScanBarOption(scannerPrefs.barKey);
  const scanLimits = useMemo(
    () =>
      resolveScanRunLimits({
        barOpt,
        scanSize: scannerPrefs.scanSize || 'auto',
        universeCount: universeEntries.length,
      }),
    [barOpt, scannerPrefs.scanSize, universeEntries.length],
  );

  const backtestBarOpt = resolveBacktestBarOption(backtestPrefs.backtestDurationKey);
  const backtestLimits = useMemo(
    () =>
      resolveScanRunLimits({
        barOpt: {
          maxSymbols: backtestBarOpt.maxSymbols,
          pacingMs: 450,
        },
        scanSize: scannerPrefs.scanSize || 'auto',
        universeCount: universeEntries.length,
      }),
    [backtestBarOpt.maxSymbols, scannerPrefs.scanSize, universeEntries.length],
  );
  const engineOptions = useMemo(
    () => prefsToEngineOptions(backtestPrefs),
    [backtestPrefs],
  );

  const displayed = useMemo(() => {
    const sig = filterSignals(results, scannerPrefs.signalFilter);
    const filtered = applyScanFilters(sig, scannerPrefs.filters, quotes, fundSnapshots);
    return sortScanResults(filtered, scannerPrefs.sortBy, fundSnapshots);
  }, [
    results,
    scannerPrefs.signalFilter,
    scannerPrefs.filters,
    scannerPrefs.sortBy,
    quotes,
    fundSnapshots,
  ]);

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
      setScanError(
        scannerPrefs.universeId === 'live'
          ? liveUniverse.error || 'Live universe is empty — adjust filters and refresh, or add symbols.'
          : 'Choose a universe with at least one symbol.',
      );
      return;
    }
    if (scannerPrefs.universeId === 'live' && liveUniverse.loading) {
      setScanError('Live universe still loading — wait for refresh to finish.');
      return;
    }

    setScanning(true);
    setScanError('');
    setResults([]);
    setProgress({ idx: 0, total: scanLimits.maxSymbols, symbol: '…' });

    try {
      const out = await runChartScan({
        entries: universeEntries,
        strategyId: scannerPrefs.strategyId,
        barSize: barOpt.barSize,
        duration: barOpt.duration,
        fetchHistoricalBars,
        quotes,
        maxSymbols: scanLimits.maxSymbols,
        pacingMs: scanLimits.pacingMs,
        onProgress: setProgress,
      });
      setResults(out);
      setLastScanAt(Date.now());
      loadFundSnapshots();
    } catch (e) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }, [
    barOpt.barSize,
    barOpt.duration,
    scanLimits.maxSymbols,
    scanLimits.pacingMs,
    connection?.status,
    fetchHistoricalBars,
    isElectron,
    quotes,
    scannerPrefs.strategyId,
    universeEntries,
    loadFundSnapshots,
    liveUniverse.loading,
    liveUniverse.error,
    scannerPrefs.universeId,
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
    setBacktestProgress({ idx: 0, total: backtestLimits.maxSymbols, symbol: '…' });

    try {
      const out = await runChartBacktest({
        entries: universeEntries,
        strategyId: scannerPrefs.strategyId,
        barSize: backtestBarOpt.id,
        duration: backtestBarOpt.duration,
        fetchHistoricalBars,
        maxSymbols: backtestLimits.maxSymbols,
        pacingMs: backtestLimits.pacingMs,
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
    backtestLimits.maxSymbols,
    backtestLimits.pacingMs,
    backtestPrefs.fillModel,
    connection?.status,
    engineOptions,
    fetchHistoricalBars,
    isElectron,
    scannerPrefs.strategyId,
    universeEntries,
  ]);

  const exportScanCsv = useCallback(() => {
    if (!results.length) return;
    downloadScanResultsCsv(results, {
      quotes,
      strategyId: scannerPrefs.strategyId,
      barSize: barOpt.barSize,
      scannedAt: lastScanAt,
    });
  }, [barOpt.barSize, lastScanAt, quotes, results, scannerPrefs.strategyId]);

  const exportBacktestCsv = useCallback(() => {
    if (!backtestSummaries.length) return;
    downloadBacktestSummaryCsv(backtestSummaries, {
      strategyId: scannerPrefs.strategyId,
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
    scannerPrefs,
  ]);

  const inputStyle = {
    background: 'var(--tp-bg-input)',
    border: '1px solid var(--tp-border)',
    borderRadius: 8,
    color: 'var(--tp-text-title)',
    fontSize: 13,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: 'var(--tp-text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };

  const livePriced = universeTickers.filter((t) => displayPrice(quotes[t]) != null).length;

  const cols = scannerPrefs.columns || {};
  const tableHeaders = useMemo(() => {
    const h = ['Symbol', 'Signal', 'Str', 'Last', 'Chg%'];
    if (cols.change5) h.push('5b%');
    if (cols.pctSma50) h.push('vs SMA50');
    h.push('RSI');
    if (cols.emaTrend) h.push('EMA9/21');
    h.push('SMA20/50', 'MACD hist');
    if (cols.volRatio) h.push('Vol×');
    if (cols.marketCap) h.push('Mkt cap');
    if (cols.atrPct) h.push('ATR%');
    if (cols.bbWidth) h.push('BB width');
    h.push('Reasons', '');
    return h;
  }, [cols.atrPct, cols.bbWidth, cols.change5, cols.emaTrend, cols.marketCap, cols.pctSma50, cols.volRatio]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--tp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Technical scan
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tp-text-strong)' }}>Chart Scanner Pro</div>
        <p style={{ fontSize: 13, color: 'var(--tp-text-muted)', marginTop: 8, maxWidth: 720, lineHeight: 1.55 }}>
          Presets, multi-timeframe strategies, and post-scan filters on IB historical bars plus{' '}
          <strong style={{ color: 'var(--tp-text-secondary)' }}>live</strong> quotes when this page is open. Research only — not
          financial advice.
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

      <ChartScannerSetup
        prefs={scannerPrefs}
        onPrefsChange={setScannerPrefs}
        universeCount={universeTickers.length}
        scanLimits={scanLimits}
        barOpt={barOpt}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        searchSymbols={searchSymbols}
        hasFmpKey={hasFmpKey}
        liveUniverse={liveUniverse}
        onRefreshLiveUniverse={liveUniverse.refresh}
      />

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
            background: 'var(--tp-bg-sidebar)',
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
        <span style={{ fontSize: 12, color: 'var(--tp-text-muted)' }}>
          Live quotes: {livePriced}/{universeTickers.length}
        </span>
        {lastScanAt && (
          <span style={{ fontSize: 12, color: 'var(--tp-text-faint)' }}>
            Last scan {new Date(lastScanAt).toLocaleTimeString()}
          </span>
        )}
        {scanning && progress && (
          <span style={{ fontSize: 12, color: '#818cf8' }}>
            {progress.symbol} ({progress.idx}/{progress.total})
            {scanLimits.estimateSec > 0 && progress.phase === 'bars' && (
              <span style={{ color: 'var(--tp-text-muted)' }}> · est. {formatScanEstimate(scanLimits.estimateSec)} total</span>
            )}
          </span>
        )}
        {backtesting && backtestProgress && (
          <span style={{ fontSize: 12, color: '#2dd4bf' }}>
            BT {backtestProgress.symbol} ({backtestProgress.idx}/{backtestProgress.total})
          </span>
        )}
        {lastBacktestAt && !backtesting && (
          <span style={{ fontSize: 12, color: 'var(--tp-text-faint)' }}>
            Last backtest {new Date(lastBacktestAt).toLocaleTimeString()}
          </span>
        )}
        {hasFmpKey && (
          <button
            type="button"
            onClick={loadFundSnapshots}
            disabled={snapLoading || !universeTickers.length}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: 'var(--tp-bg-sidebar)',
              color: 'var(--tp-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: snapLoading ? 'wait' : 'pointer',
            }}
          >
            {snapLoading ? 'Loading caps…' : 'Refresh market caps'}
          </button>
        )}
      </div>

      {needsMktCap && !hasFmpKey && (
        <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>
          Market cap filter/column needs an FMP API key in Settings (same as Stock Screener).
        </div>
      )}
      {snapError && (
        <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>{snapError}</div>
      )}

      {scanError && <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>{scanError}</div>}

      {displayed.length === 0 && !scanning && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--tp-text-faint)',
            border: '1px dashed var(--tp-border)',
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          {results.length
            ? `No rows match signal view or result filters (${results.length} raw).`
            : 'Pick a preset or scan setup, then run chart scan.'}
        </div>
      )}

      {displayed.length > 0 && (
        <div style={{ overflow: 'auto', border: '1px solid var(--tp-border)', borderRadius: 12, marginBottom: 24 }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--tp-border)',
              fontSize: 12,
              color: 'var(--tp-text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>
              Showing <strong style={{ color: 'var(--tp-text-secondary)' }}>{displayed.length}</strong> of {results.length} scanned
            </span>
            <span>{barOpt.label}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr style={{ background: 'var(--tp-bg-input)' }}>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: 10,
                      color: 'var(--tp-text-muted)',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--tp-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
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
                const emaTrend =
                  m.ema9 != null && m.ema21 != null
                    ? m.ema9 > m.ema21
                      ? '▲'
                      : '▼'
                    : '—';
                const cells = [
                  <td key="sym" style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--tp-text-strong)' }}>
                    {row.symbol}
                  </td>,
                  <td key="sig" style={{ padding: '10px 12px', fontWeight: 800, color: signalColor(row.signal) }}>
                    {row.signal}
                  </td>,
                  <td key="str" style={{ padding: '10px 12px', color: '#818cf8' }}>
                    {row.strength || '—'}
                  </td>,
                  <td
                    key="px"
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--tp-text)',
                    }}
                  >
                    {px != null ? Number(px).toFixed(2) : '—'}
                  </td>,
                  <td
                    key="ch"
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'ui-monospace, monospace',
                      color: ch == null ? '#475569' : ch >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—'}
                  </td>,
                ];
                if (cols.change5) {
                  cells.push(
                    <td key="c5" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.change5 != null ? `${m.change5 >= 0 ? '+' : ''}${m.change5.toFixed(2)}%` : '—'}
                    </td>,
                  );
                }
                if (cols.pctSma50) {
                  cells.push(
                    <td key="s50" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.pctFromSma50 != null ? `${m.pctFromSma50 >= 0 ? '+' : ''}${m.pctFromSma50.toFixed(2)}%` : '—'}
                    </td>,
                  );
                }
                cells.push(
                  <td key="rsi" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                    {m.rsi != null ? m.rsi.toFixed(1) : '—'}
                  </td>,
                );
                if (cols.emaTrend) {
                  cells.push(
                    <td key="ema" style={{ padding: '10px 12px', fontSize: 11, color: 'var(--tp-text-secondary)' }}>
                      {emaTrend}
                    </td>,
                  );
                }
                cells.push(
                  <td key="sma" style={{ padding: '10px 12px', fontSize: 11, color: 'var(--tp-text-secondary)' }}>
                    {smaTrend}
                  </td>,
                  <td key="macd" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                    {m.macdHist != null ? m.macdHist.toFixed(3) : '—'}
                  </td>,
                );
                if (cols.volRatio) {
                  cells.push(
                    <td key="vol" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.volRatio != null ? `${m.volRatio.toFixed(2)}×` : '—'}
                    </td>,
                  );
                }
                if (cols.marketCap) {
                  const mcap = marketCapFromSnapshots(fundSnapshots, row.symbol);
                  cells.push(
                    <td key="mcap" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {fmtMktCap(mcap)}
                    </td>,
                  );
                }
                if (cols.atrPct) {
                  cells.push(
                    <td key="atr" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.atrPct != null ? `${m.atrPct.toFixed(2)}%` : '—'}
                    </td>,
                  );
                }
                if (cols.bbWidth) {
                  cells.push(
                    <td key="bb" style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace' }}>
                      {m.bbWidth != null ? `${m.bbWidth.toFixed(2)}%` : '—'}
                    </td>,
                  );
                }
                cells.push(
                  <td key="rsn" style={{ padding: '10px 12px', fontSize: 11, color: 'var(--tp-text-muted)', maxWidth: 260 }}>
                    {(row.reasons || []).slice(0, 3).join(' · ') || row.error || '—'}
                  </td>,
                  <td key="btn" style={{ padding: '10px 12px' }}>
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
                  </td>,
                );
                return (
                  <tr key={row.symbol} style={{ borderBottom: '1px solid #0f1424' }}>
                    {cells}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  );
}
