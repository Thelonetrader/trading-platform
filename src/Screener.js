import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ScreenerTable from './components/ScreenerTable';
import ScreenerSetupPanel from './components/ScreenerSetupPanel';
import { SelectWithChevron } from './components/ComboField';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import { WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { readJson } from './utils/storageStats';
import { getJournalIndexByTicker } from './utils/journalIndex';
import {
  DEFAULT_SCREENER_FILTERS,
  deleteScreenerPreset,
  listScreenerPresets,
  loadScreenerLiveFilters,
  saveScreenerLiveFilters,
  saveScreenerPreset,
} from './utils/screenerPresets';
import { listScorecardEvals } from './scorecards/storage';
import { buildUniverseRows, resolveUniverseTickers } from './utils/screenerUniverse';
import { migrateCapFilterBtoM } from './utils/fxUsd';
import { migrateScreenerMultiFilters } from './utils/filterChipLists';
import { countLiveQuotes, filterAndSortRows } from './utils/screenerFilters';
import { buildScreenerFilterSuggestions } from './utils/screenerFilterSuggestions';
import { useLiveUniverseTickers } from './hooks/useLiveUniverse';

export default function Screener({
  quotes = {},
  connection,
  refreshKey = 0,
  onOpenTerminal,
  onOpenScorecard,
  onUniverseTickersChange,
  hasFmpKey = false,
  fetchScreenerSnapshots,
  searchSymbols,
  fetchCompanyScreener,
  isElectron = false,
}) {
  const [filters, setFilters] = useState(() => loadScreenerLiveFilters());
  const [presets, setPresets] = useState(() => listScreenerPresets());
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');

  const [snapshots, setSnapshots] = useState({});
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapError, setSnapError] = useState('');
  const [snapUpdatedAt, setSnapUpdatedAt] = useState(null);

  const [watchlistSnapshot, setWatchlistSnapshot] = useState(() => readJson('watchlist', []));

  useEffect(() => {
    setPresets(listScreenerPresets());
    setWatchlistSnapshot(readJson('watchlist', []));
  }, [refreshKey]);

  useEffect(() => {
    saveScreenerLiveFilters(filters);
  }, [filters]);

  const [universeDataTick, setUniverseDataTick] = useState(0);
  useEffect(() => {
    const bump = () => setUniverseDataTick((t) => t + 1);
    window.addEventListener('portfolio-changed', bump);
    return () => window.removeEventListener('portfolio-changed', bump);
  }, []);

  const { universeId, customUniverse, symbolPicks = [], liveUniverse: liveUniverseCfg } = filters;

  const symbolPickTickers = useMemo(
    () => (symbolPicks || []).map((p) => p.ticker).filter(Boolean),
    [symbolPicks],
  );

  const liveUniverse = useLiveUniverseTickers({
    universeId,
    liveUniverse: liveUniverseCfg,
    symbolPickTickers,
    fetchCompanyScreener,
    hasFmpKey,
  });

  const nameByTickerFromPicks = useMemo(() => {
    const map = {};
    for (const p of symbolPicks || []) {
      if (p.ticker && p.name) map[p.ticker.toUpperCase()] = p.name;
    }
    return map;
  }, [symbolPicks]);

  const nameByTicker = useMemo(() => {
    if (universeId === 'live') {
      return { ...liveUniverse.nameByTicker, ...nameByTickerFromPicks };
    }
    return nameByTickerFromPicks;
  }, [universeId, liveUniverse.nameByTicker, nameByTickerFromPicks]);

  const universeTickers = useMemo(() => {
    if (universeId === 'live') {
      return liveUniverse.mergedTickers || [];
    }
    return resolveUniverseTickers(universeId, customUniverse, symbolPickTickers);
  }, [
    universeId,
    customUniverse,
    symbolPickTickers,
    liveUniverse.mergedTickers,
    watchlistSnapshot,
    universeDataTick,
    refreshKey,
  ]);

  useEffect(() => {
    const journalIndex = getJournalIndexByTicker();
    const built = buildUniverseRows(universeTickers, journalIndex, undefined, nameByTicker);
    onUniverseTickersChange?.(
      built.map((r) => ({
        ticker: r.ticker,
        exchange: r.exchange,
        currency: r.currency,
      })),
    );
  }, [universeTickers, refreshKey, onUniverseTickersChange, nameByTicker]);

  useEffect(() => {
    const onWatchlist = () => setWatchlistSnapshot(readJson('watchlist', []));
    window.addEventListener(WATCHLIST_CHANGED_EVENT, onWatchlist);
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, onWatchlist);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, onWatchlist);
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, onWatchlist);
    };
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!fetchScreenerSnapshots || !universeTickers.length) {
      setSnapshots({});
      return;
    }
    if (!hasFmpKey) {
      setSnapError('Add FMP key in Settings for fundamentals columns and metric filters.');
      return;
    }
    setSnapLoading(true);
    setSnapError('');
    try {
      const res = await fetchScreenerSnapshots(universeTickers);
      if (res.error) setSnapError(res.error);
      setSnapshots(res.snapshots || {});
      setSnapUpdatedAt(Date.now());
    } catch (e) {
      setSnapError(e.message || 'Fundamentals load failed');
    } finally {
      setSnapLoading(false);
    }
  }, [fetchScreenerSnapshots, hasFmpKey, universeTickers]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const suggestionRows = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    return buildUniverseRows(universeTickers, journalIndex, undefined, nameByTicker);
  }, [universeTickers, refreshKey, nameByTicker]);

  const filterSuggestions = useMemo(
    () => buildScreenerFilterSuggestions({ snapshots, rows: suggestionRows }),
    [snapshots, suggestionRows],
  );

  const evalCount = listScorecardEvals().length;
  const liveCount = countLiveQuotes(universeTickers, quotes);

  const rows = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    const built = buildUniverseRows(universeTickers, journalIndex, undefined, nameByTicker);
    return filterAndSortRows(built, filters, quotes, snapshots);
  }, [universeTickers, filters, quotes, snapshots, refreshKey, nameByTicker]);

  const applyFilters = (next) => {
    setFilters(
      migrateScreenerMultiFilters(migrateCapFilterBtoM({ ...DEFAULT_SCREENER_FILTERS, ...next, activeProPresetId: '' })),
    );
  };

  const handleLoadPreset = () => {
    const preset = presets.find((p) => String(p.id) === String(selectedPresetId));
    if (!preset?.filters) return;
    applyFilters(preset.filters);
    setPresetMsg(`Loaded “${preset.name}”`);
    setTimeout(() => setPresetMsg(''), 2500);
  };

  const handleSavePreset = () => {
    const saved = saveScreenerPreset(presetName, filters);
    if (!saved) {
      setPresetMsg('Enter a preset name');
      return;
    }
    setPresets(listScreenerPresets());
    setSelectedPresetId(String(saved.id));
    setPresetMsg(`Saved “${saved.name}”`);
    setTimeout(() => setPresetMsg(''), 2500);
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    const preset = presets.find((p) => String(p.id) === String(selectedPresetId));
    deleteScreenerPreset(Number(selectedPresetId));
    setPresets(listScreenerPresets());
    setSelectedPresetId('');
    setPresetMsg(preset ? `Deleted “${preset.name}”` : 'Preset deleted');
    setTimeout(() => setPresetMsg(''), 2500);
  };

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

  const snapAge =
    snapUpdatedAt != null
      ? `${Math.max(0, Math.round((Date.now() - snapUpdatedAt) / 60000))}m ago`
      : '—';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--tp-text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Market scan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tp-text-strong)', letterSpacing: '-0.02em' }}>
            Stock Screener
          </div>
          <div style={{ fontSize: 13, color: 'var(--tp-text-muted)', marginTop: 6, maxWidth: 620 }}>
            Live IB quotes plus FMP fundamentals. Cap and price filters use USD equivalents for all listing currencies.
            Market cap inputs are in millions ($M).
          </div>
        </div>
        <div
          style={{
            background: 'var(--tp-bg-panel)',
            border: '1px solid var(--tp-border)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 12,
            minWidth: 220,
          }}
        >
          <div style={{ color: 'var(--tp-text-secondary)', fontWeight: 600, marginBottom: 8 }}>Live data</div>
          <div style={{ color: connection?.status === 'connected' ? '#22c55e' : '#64748b' }}>
            IB: {connection?.status === 'connected' ? 'Connected' : 'Offline'}
            {connection?.status === 'connected' && (
              <span style={{ color: 'var(--tp-text-muted)' }}>
                {' '}
                · {liveCount}/{universeTickers.length} priced
              </span>
            )}
          </div>
          <div style={{ color: hasFmpKey ? 'var(--tp-accent)' : '#64748b', marginTop: 4 }}>
            FMP: {hasFmpKey ? `Fundamentals · updated ${snapAge}` : 'No API key'}
          </div>
          {snapLoading && <div style={{ color: 'var(--tp-text-faint)', marginTop: 4 }}>Loading fundamentals…</div>}
          {snapError && <div style={{ color: '#f59e0b', marginTop: 6, lineHeight: 1.4 }}>{snapError}</div>}
          <button
            type="button"
            onClick={loadSnapshots}
            disabled={snapLoading || !hasFmpKey || !universeTickers.length}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--tp-border)',
              background: 'transparent',
              color: 'var(--tp-accent)',
              fontSize: 11,
              fontWeight: 600,
              cursor: snapLoading ? 'wait' : 'pointer',
            }}
          >
            Refresh fundamentals
          </button>
          {!isElectron && (
            <div style={{ color: '#f59e0b', marginTop: 8 }}>Run electron:dev for IB live quotes.</div>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'var(--tp-bg-panel)',
          border: '1px solid var(--tp-border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <label style={labelStyle}>Saved screen</label>
          <SelectWithChevron style={inputStyle} value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
            <option value="">— Select preset —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectWithChevron>
        </div>
        <button type="button" onClick={handleLoadPreset} disabled={!selectedPresetId} style={btnPrimary(selectedPresetId)}>
          Load
        </button>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <label style={labelStyle}>Save as</label>
          <input style={inputStyle} placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
        </div>
        <button type="button" onClick={handleSavePreset} style={btnOutline}>
          Save
        </button>
        <button type="button" onClick={handleDeletePreset} disabled={!selectedPresetId} style={btnDanger(selectedPresetId)}>
          Delete
        </button>
        {presetMsg && <span style={{ fontSize: 12, color: '#22c55e', alignSelf: 'center' }}>{presetMsg}</span>}
      </div>

      <ScreenerSetupPanel
        filters={filters}
        onFiltersChange={setFilters}
        universeTickersCount={universeTickers.length}
        evalCount={evalCount}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        filterSuggestions={filterSuggestions}
        searchSymbols={searchSymbols}
        hasFmpKey={hasFmpKey}
        liveUniverse={liveUniverse}
        onRefreshLiveUniverse={liveUniverse.refresh}
      />

      <div style={{ fontSize: 13, color: 'var(--tp-text-muted)', marginBottom: 10, position: 'relative', zIndex: 0 }}>
        {rows.length} match{rows.length === 1 ? '' : 'es'}
      </div>

      {universeTickers.length === 0 ? (
        <EmptyState
          text={
            universeId === 'live'
              ? liveUniverse.error ||
                (liveUniverse.loading
                  ? 'Loading live market universe from FMP…'
                  : 'Live universe is empty — adjust filters and click Refresh live universe.')
              : universeId === 'watchlist'
              ? 'Add symbols to your watchlist, or open Universe → optional limit and pick another source.'
              : universeId === 'global'
                ? 'No symbols in scope yet — use Find symbols to search any market, or add watchlist names.'
                : 'This universe has no tickers — add a custom list or choose a different source.'
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState text="No names match your filters. Relax criteria or refresh FMP fundamentals." />
      ) : (
        <ScreenerTable
          rows={rows}
          quotes={quotes}
          snapshots={snapshots}
          connection={connection}
          onOpenTerminal={onOpenTerminal}
          onOpenScorecard={onOpenScorecard}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        background: 'var(--tp-bg-panel)',
        border: '1px dashed var(--tp-border)',
        borderRadius: 12,
        padding: 48,
        textAlign: 'center',
        color: 'var(--tp-text-faint)',
      }}
    >
      {text}
    </div>
  );
}

function btnPrimary(enabled) {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: enabled ? '#6366f1' : 'var(--tp-bg-active)',
    color: enabled ? '#fff' : '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'default',
  };
}

const btnOutline = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--tp-accent-border)',
  background: 'var(--tp-accent-soft)',
  color: 'var(--tp-accent-on-soft)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function btnDanger(enabled) {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--tp-border)',
    background: 'transparent',
    color: enabled ? '#ef4444' : '#334155',
    fontSize: 13,
    cursor: enabled ? 'pointer' : 'default',
  };
}
