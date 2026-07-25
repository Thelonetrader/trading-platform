import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ScreenerTable from './components/ScreenerTable';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import { WATCHLIST_CHANGED_EVENT } from './utils/liveSubscribe';
import { readJson } from './utils/storageStats';
import { getJournalIndexByTicker } from './utils/journalIndex';
import {
  DEFAULT_SCREENER_FILTERS,
  deleteScreenerPreset,
  listScreenerPresets,
  saveScreenerPreset,
} from './utils/screenerPresets';
import { listScorecardEvals } from './scorecards/storage';
import { UNIVERSE_OPTIONS } from './data/screenerIndexLists';
import { buildUniverseRows, resolveUniverseTickers } from './utils/screenerUniverse';
import {
  RATING_FILTERS,
  SORT_OPTIONS,
  countLiveQuotes,
  filterAndSortRows,
} from './utils/screenerFilters';

const PRIORITIES = ['High', 'Medium', 'Low'];

const JOURNAL_FILTERS = [
  { id: 'any', label: 'Any journal status' },
  { id: 'has', label: 'Has journal entry' },
  { id: 'none', label: 'No journal yet' },
];

export default function Screener({
  quotes = {},
  connection,
  refreshKey = 0,
  onOpenTerminal,
  onOpenScorecard,
  onUniverseTickersChange,
  hasFmpKey = false,
  fetchScreenerSnapshots,
  isElectron = false,
}) {
  const [priorityFilter, setPriorityFilter] = useState(DEFAULT_SCREENER_FILTERS.priorityFilter);
  const [sectorQuery, setSectorQuery] = useState(DEFAULT_SCREENER_FILTERS.sectorQuery);
  const [ratingFilter, setRatingFilter] = useState(DEFAULT_SCREENER_FILTERS.ratingFilter);
  const [requireScorecard, setRequireScorecard] = useState(DEFAULT_SCREENER_FILTERS.requireScorecard);
  const [journalFilter, setJournalFilter] = useState(DEFAULT_SCREENER_FILTERS.journalFilter);
  const [minChange, setMinChange] = useState(DEFAULT_SCREENER_FILTERS.minChange);
  const [maxChange, setMaxChange] = useState(DEFAULT_SCREENER_FILTERS.maxChange);
  const [sortBy, setSortBy] = useState(DEFAULT_SCREENER_FILTERS.sortBy);
  const [search, setSearch] = useState(DEFAULT_SCREENER_FILTERS.search);
  const [tagQuery, setTagQuery] = useState(DEFAULT_SCREENER_FILTERS.tagQuery);
  const [minRank, setMinRank] = useState(DEFAULT_SCREENER_FILTERS.minRank);
  const [minPe, setMinPe] = useState(DEFAULT_SCREENER_FILTERS.minPe);
  const [maxPe, setMaxPe] = useState(DEFAULT_SCREENER_FILTERS.maxPe);
  const [minEpsGrowth, setMinEpsGrowth] = useState(DEFAULT_SCREENER_FILTERS.minEpsGrowth);
  const [minFcfYield, setMinFcfYield] = useState(DEFAULT_SCREENER_FILTERS.minFcfYield);
  const [universeId, setUniverseId] = useState(DEFAULT_SCREENER_FILTERS.universeId);
  const [customUniverse, setCustomUniverse] = useState(DEFAULT_SCREENER_FILTERS.customUniverse);
  const [universeDataTick, setUniverseDataTick] = useState(0);

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
    const bump = () => setUniverseDataTick((t) => t + 1);
    window.addEventListener('portfolio-changed', bump);
    return () => window.removeEventListener('portfolio-changed', bump);
  }, []);

  const universeTickers = useMemo(
    () => resolveUniverseTickers(universeId, customUniverse),
    [universeId, customUniverse, watchlistSnapshot, universeDataTick, refreshKey],
  );

  useEffect(() => {
    const journalIndex = getJournalIndexByTicker();
    const built = buildUniverseRows(universeTickers, journalIndex);
    onUniverseTickersChange?.(
      built.map((r) => ({
        ticker: r.ticker,
        exchange: r.exchange,
        currency: r.currency,
      })),
    );
  }, [universeTickers, refreshKey, onUniverseTickersChange]);

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

  const filters = {
    priorityFilter,
    sectorQuery,
    ratingFilter,
    requireScorecard,
    journalFilter,
    minChange,
    maxChange,
    sortBy,
    search,
    tagQuery,
    minRank,
    minPe,
    maxPe,
    minEpsGrowth,
    minFcfYield,
    universeId,
    customUniverse,
  };

  const evalCount = listScorecardEvals().length;
  const liveCount = countLiveQuotes(universeTickers, quotes);

  const rows = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    const built = buildUniverseRows(universeTickers, journalIndex);
    return filterAndSortRows(built, filters, quotes, snapshots);
  }, [
    universeTickers,
    priorityFilter,
    sectorQuery,
    ratingFilter,
    requireScorecard,
    journalFilter,
    minChange,
    maxChange,
    sortBy,
    search,
    tagQuery,
    minRank,
    minPe,
    maxPe,
    minEpsGrowth,
    minFcfYield,
    quotes,
    snapshots,
    refreshKey,
  ]);

  const applyFilters = (next) => {
    setPriorityFilter(next.priorityFilter ?? DEFAULT_SCREENER_FILTERS.priorityFilter);
    setSectorQuery(next.sectorQuery ?? '');
    setRatingFilter(next.ratingFilter ?? 'any');
    setRequireScorecard(!!next.requireScorecard);
    setJournalFilter(next.journalFilter ?? 'any');
    setMinChange(next.minChange ?? '');
    setMaxChange(next.maxChange ?? '');
    setSortBy(next.sortBy ?? 'priority');
    setSearch(next.search ?? '');
    setTagQuery(next.tagQuery ?? '');
    setMinRank(next.minRank ?? '');
    setMinPe(next.minPe ?? '');
    setMaxPe(next.maxPe ?? '');
    setMinEpsGrowth(next.minEpsGrowth ?? '');
    setMinFcfYield(next.minFcfYield ?? '');
    setUniverseId(next.universeId ?? 'watchlist');
    setCustomUniverse(next.customUniverse ?? '');
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
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Market scan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Stock Screener
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 620 }}>
            Live IB bid/ask and day change plus FMP fundamentals (P/E, growth, market cap). Save screens as presets.
          </div>
        </div>
        <div
          style={{
            background: '#0a0f1e',
            border: '1px solid #1a2035',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 12,
            minWidth: 220,
          }}
        >
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>Live data</div>
          <div style={{ color: connection?.status === 'connected' ? '#22c55e' : '#64748b' }}>
            IB: {connection?.status === 'connected' ? 'Connected' : 'Offline'}
            {connection?.status === 'connected' && (
              <span style={{ color: '#64748b' }}>
                {' '}
                · {liveCount}/{universeTickers.length} priced
              </span>
            )}
          </div>
          <div style={{ color: hasFmpKey ? '#818cf8' : '#64748b', marginTop: 4 }}>
            FMP: {hasFmpKey ? `Fundamentals · updated ${snapAge}` : 'No API key'}
          </div>
          {snapLoading && <div style={{ color: '#475569', marginTop: 4 }}>Loading fundamentals…</div>}
          {snapError && <div style={{ color: '#f59e0b', marginTop: 6, lineHeight: 1.4 }}>{snapError}</div>}
          <button
            type="button"
            onClick={loadSnapshots}
            disabled={snapLoading || !hasFmpKey || !universeTickers.length}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #1a2035',
              background: 'transparent',
              color: '#818cf8',
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
          background: '#0a0f1e',
          border: '1px solid #1a2035',
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
          <select style={inputStyle} value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
            <option value="">— Select preset —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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

      <div
        style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Universe · {universeTickers.length} symbols · {evalCount} saved evals</label>
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
            <label style={labelStyle}>Custom tickers</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              placeholder="AAPL, MSFT, NVDA"
              value={customUniverse}
              onChange={(e) => setCustomUniverse(e.target.value.toUpperCase())}
            />
          </div>
        )}
        <div>
          <label style={labelStyle}>Search</label>
          <input style={inputStyle} placeholder="Ticker or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Sector contains</label>
          <input style={inputStyle} placeholder="tech, energy…" value={sectorQuery} onChange={(e) => setSectorQuery(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Min rating</label>
          <select style={inputStyle} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            {RATING_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Journal</label>
          <select style={inputStyle} value={journalFilter} onChange={(e) => setJournalFilter(e.target.value)}>
            {JOURNAL_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort by</label>
          <select style={inputStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Min Δ%</label>
          <input style={inputStyle} type="number" placeholder="—" value={minChange} onChange={(e) => setMinChange(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Max Δ%</label>
          <input style={inputStyle} type="number" placeholder="—" value={maxChange} onChange={(e) => setMaxChange(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Min P/E</label>
          <input style={inputStyle} type="number" placeholder="—" value={minPe} onChange={(e) => setMinPe(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Max P/E</label>
          <input style={inputStyle} type="number" placeholder="—" value={maxPe} onChange={(e) => setMaxPe(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Min EPS gr %</label>
          <input style={inputStyle} type="number" placeholder="—" value={minEpsGrowth} onChange={(e) => setMinEpsGrowth(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Min FCF yld %</label>
          <input style={inputStyle} type="number" placeholder="—" value={minFcfYield} onChange={(e) => setMinFcfYield(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Min rank</label>
          <input style={inputStyle} type="number" min={0} max={100} placeholder="—" value={minRank} onChange={(e) => setMinRank(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Tag</label>
          <input style={inputStyle} placeholder="thesis" value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Priority</span>
        {PRIORITIES.map((p) => (
          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={priorityFilter[p]}
              onChange={() => setPriorityFilter((prev) => ({ ...prev, [p]: !prev[p] }))}
            />
            {p}
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginLeft: 8 }}>
          <input type="checkbox" checked={requireScorecard} onChange={() => setRequireScorecard((v) => !v)} />
          Only scored
        </label>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
        {rows.length} match{rows.length === 1 ? '' : 'es'}
      </div>

      {universeTickers.length === 0 ? (
        <EmptyState
          text={
            universeId === 'watchlist'
              ? 'Add symbols to your watchlist, or pick another universe (Mag 7, Dow, custom list, etc.).'
              : 'This universe has no tickers — add a custom list or choose a different source.'
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState text="No names match your filters. Relax day-change, P/E, or rating criteria." />
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
        background: '#0a0f1e',
        border: '1px dashed #1a2035',
        borderRadius: 12,
        padding: 48,
        textAlign: 'center',
        color: '#475569',
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
    background: enabled ? '#6366f1' : '#1a2035',
    color: enabled ? '#fff' : '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'default',
  };
}

const btnOutline = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #6366f1',
  background: '#6366f115',
  color: '#818cf8',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function btnDanger(enabled) {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #1a2035',
    background: 'transparent',
    color: enabled ? '#ef4444' : '#334155',
    fontSize: 13,
    cursor: enabled ? 'pointer' : 'default',
  };
}
