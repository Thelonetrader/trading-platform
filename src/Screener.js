import React, { useEffect, useMemo, useState } from 'react';
import { readJson } from './utils/storageStats';
import { getJournalIndexByTicker } from './utils/journalIndex';
import {
  DEFAULT_SCREENER_FILTERS,
  deleteScreenerPreset,
  listScreenerPresets,
  saveScreenerPreset,
} from './utils/screenerPresets';
import { SECTORS, getRatingColor } from './scorecards/model';
import { getBestEvalForTicker, listScorecardEvals } from './scorecards/storage';
import { computeCustomRank, getRankWeights, parseTags } from './utils/customRank';

const PRIORITIES = ['High', 'Medium', 'Low'];
const RATING_FILTERS = [
  { id: 'any', label: 'Any rating', minAvg: 0 },
  { id: 'hold+', label: 'Hold+ (≥2.5)', minAvg: 2.5 },
  { id: 'buy+', label: 'Buy+ (≥3.5)', minAvg: 3.5 },
  { id: 'sb', label: 'Strong Buy (≥4.5)', minAvg: 4.5 },
];

const JOURNAL_FILTERS = [
  { id: 'any', label: 'Any journal status' },
  { id: 'has', label: 'Has journal entry' },
  { id: 'none', label: 'No journal yet' },
];

const SORT_OPTIONS = [
  { id: 'priority', label: 'Priority' },
  { id: 'score', label: 'Fundamental score' },
  { id: 'rank', label: 'Custom rank' },
  { id: 'change', label: 'Day change %' },
  { id: 'ticker', label: 'Ticker A–Z' },
  { id: 'added', label: 'Date added' },
];

const priorityRank = (p) => (p === 'High' ? 0 : p === 'Medium' ? 1 : 2);

function sectorFromWatchlistLabel(sectorText) {
  const s = (sectorText || '').toLowerCase();
  if (s.includes('tech') || s.includes('software') || s.includes('saas')) return 'tech';
  if (s.includes('energy') || s.includes('oil') || s.includes('commod')) return 'energy';
  if (s.includes('bank') || s.includes('financ') || s.includes('insur')) return 'financial';
  return '';
}

function buildRows(watchlist, journalIndex, weights) {
  return watchlist.map((item) => {
    const ticker = (item.ticker || '').toUpperCase();
    const evalRow = getBestEvalForTicker(ticker);
    const journal = journalIndex.get(ticker);
    const { score } = computeCustomRank({ watch: item, evalRow, journal, weights });
    return {
      id: item.id,
      ticker,
      name: item.name || '',
      sectorLabel: item.sector || '',
      sectorId: evalRow?.sectorId || sectorFromWatchlistLabel(item.sector),
      priority: item.priority || 'Medium',
      notes: item.notes || '',
      tags: parseTags(item.tags),
      customRank: score,
      buyPrice: item.buyPrice,
      addedDate: item.addedDate,
      exchange: item.exchange || 'SMART',
      currency: item.currency || 'USD',
      eval: evalRow,
      journal,
    };
  });
}

function filterAndSortRows(rows, filters, quotes) {
  const q = filters.search.trim().toUpperCase();
  const sectorQ = filters.sectorQuery.trim().toLowerCase();
  const minCh = filters.minChange === '' ? null : parseFloat(filters.minChange);
  const maxCh = filters.maxChange === '' ? null : parseFloat(filters.maxChange);
  const minAvg = RATING_FILTERS.find((r) => r.id === filters.ratingFilter)?.minAvg ?? 0;

  const minRank = filters.minRank === '' ? null : parseFloat(filters.minRank);
  const tagQ = (filters.tagQuery || '').trim().toLowerCase();

  let filtered = rows.filter((row) => {
    if (!filters.priorityFilter[row.priority]) return false;
    if (q && !row.ticker.includes(q) && !row.name.toUpperCase().includes(q)) return false;
    if (sectorQ && !row.sectorLabel.toLowerCase().includes(sectorQ)) return false;
    if (tagQ && !row.tags.some((t) => t.toLowerCase().includes(tagQ))) return false;
    if (minRank != null && !Number.isNaN(minRank) && (row.customRank == null || row.customRank < minRank)) return false;
    if (filters.requireScorecard && !row.eval) return false;
    if (row.eval && row.eval.avg < minAvg) return false;
    if (!row.eval && minAvg > 0) return false;
    if (filters.journalFilter === 'has' && !row.journal) return false;
    if (filters.journalFilter === 'none' && row.journal) return false;

    const quote = quotes[row.ticker];
    const ch = quote?.changePct;
    if (minCh != null && (ch == null || ch < minCh)) return false;
    if (maxCh != null && (ch == null || ch > maxCh)) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (filters.sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
    if (filters.sortBy === 'added') return (b.addedDate || '').localeCompare(a.addedDate || '');
    if (filters.sortBy === 'score') {
      const sa = a.eval?.avg ?? -1;
      const sb = b.eval?.avg ?? -1;
      return sb - sa;
    }
    if (filters.sortBy === 'rank') {
      return (b.customRank ?? -1) - (a.customRank ?? -1);
    }
    if (filters.sortBy === 'change') {
      const ca = quotes[a.ticker]?.changePct ?? -Infinity;
      const cb = quotes[b.ticker]?.changePct ?? -Infinity;
      return cb - ca;
    }
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    return a.ticker.localeCompare(b.ticker);
  });

  return filtered;
}

export default function Screener({
  quotes = {},
  connection,
  refreshKey = 0,
  onOpenTerminal,
  onOpenScorecard,
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

  const [presets, setPresets] = useState(() => listScreenerPresets());
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');

  const [watchlistSnapshot, setWatchlistSnapshot] = useState(() => readJson('watchlist', []));

  useEffect(() => {
    setWatchlistSnapshot(readJson('watchlist', []));
    setPresets(listScreenerPresets());
  }, [refreshKey]);

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
  };

  const evalCount = listScorecardEvals().length;

  const rows = useMemo(() => {
    const journalIndex = getJournalIndexByTicker();
    const weights = getRankWeights();
    const built = buildRows(watchlistSnapshot, journalIndex, weights);
    return filterAndSortRows(
      built,
      {
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
      },
      quotes,
    );
  }, [
    watchlistSnapshot,
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
    quotes,
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
    const next = listScreenerPresets();
    setPresets(next);
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

  const rowSnippet = (row) => {
    if (row.journal?.snippet) return row.journal.snippet;
    return row.notes || '—';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Research workflow
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Stock Screener
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 520 }}>
            Filter your watchlist by priority, scorecard ratings, journal coverage, and live day change when IB is connected.
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'right' }}>
          <div>{watchlistSnapshot.length} watchlist · {evalCount} saved evals</div>
          <div style={{ marginTop: 4, color: connection?.status === 'connected' ? '#22c55e' : '#64748b' }}>
            {connection?.status === 'connected' ? 'Live quotes on' : 'Connect IB for % change filters'}
          </div>
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
          <select
            style={inputStyle}
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
          >
            <option value="">— Select preset —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleLoadPreset}
          disabled={!selectedPresetId}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: selectedPresetId ? '#6366f1' : '#1a2035',
            color: selectedPresetId ? '#fff' : '#475569',
            fontSize: 13,
            fontWeight: 600,
            cursor: selectedPresetId ? 'pointer' : 'default',
          }}
        >
          Load
        </button>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <label style={labelStyle}>Save as</label>
          <input
            style={inputStyle}
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleSavePreset}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #6366f1',
            background: '#6366f115',
            color: '#818cf8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleDeletePreset}
          disabled={!selectedPresetId}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #1a2035',
            background: 'transparent',
            color: selectedPresetId ? '#ef4444' : '#334155',
            fontSize: 13,
            cursor: selectedPresetId ? 'pointer' : 'default',
          }}
        >
          Delete
        </button>
        {presetMsg && (
          <span style={{ fontSize: 12, color: '#22c55e', alignSelf: 'center' }}>{presetMsg}</span>
        )}
      </div>

      <div
        style={{
          background: '#0a0f1e',
          border: '1px solid #1a2035',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
        }}
      >
        <div>
          <label style={labelStyle}>Search</label>
          <input
            style={inputStyle}
            placeholder="Ticker or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Sector contains</label>
          <input
            style={inputStyle}
            placeholder="e.g. tech, energy"
            value={sectorQuery}
            onChange={(e) => setSectorQuery(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Min rating</label>
          <select
            style={inputStyle}
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            {RATING_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Journal</label>
          <select
            style={inputStyle}
            value={journalFilter}
            onChange={(e) => setJournalFilter(e.target.value)}
          >
            {JOURNAL_FILTERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tag contains</label>
          <input
            style={inputStyle}
            placeholder="e.g. thesis"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Min custom rank</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            max={100}
            placeholder="—"
            value={minRank}
            onChange={(e) => setMinRank(e.target.value)}
          />
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
          <label style={labelStyle}>Min change %</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="—"
            value={minChange}
            onChange={(e) => setMinChange(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Max change %</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="—"
            value={maxChange}
            onChange={(e) => setMaxChange(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
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
          <input
            type="checkbox"
            checked={requireScorecard}
            onChange={() => setRequireScorecard((v) => !v)}
          />
          Only scored names
        </label>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {rows.length} match{rows.length === 1 ? '' : 'es'}
      </div>

      {watchlistSnapshot.length === 0 ? (
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
          Add symbols to your watchlist, score them on Scorecards (Save to library), then filter here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => {
            const quote = quotes[row.ticker];
            const sectorMeta = row.eval?.sectorId ? SECTORS[row.eval.sectorId] : null;
            const accent = sectorMeta?.accent || '#6366f1';
            const avg = row.eval?.avg;
            const ratingColor = avg != null ? getRatingColor(avg, accent) : '#334155';
            const ch = quote?.changePct;
            const priColor = row.priority === 'High' ? '#ef4444' : row.priority === 'Medium' ? '#f59e0b' : '#22c55e';

            return (
              <div
                key={row.id}
                style={{
                  background: '#0a0f1e',
                  border: '1px solid #1a2035',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(52px, auto) minmax(88px, auto) minmax(80px, auto) minmax(100px, auto) minmax(48px, auto) 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>{row.ticker}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{row.name || row.sectorLabel || '—'}</div>
                </div>
                <div title="Custom rank (Alerts weights)">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>{row.customRank}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: priColor, fontWeight: 600 }}>{row.priority}</span>
                </div>
                <div>
                  {row.eval ? (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ratingColor }}>{row.eval.ratingShort}</span>
                      <span style={{ fontSize: 11, color: '#475569', marginLeft: 6 }}>{row.eval.avg.toFixed(2)}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: '#334155' }}>Not scored</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                  {quote?.last != null ? Number(quote.last).toFixed(2) : '—'}
                  {ch != null && (
                    <span style={{ marginLeft: 8, color: ch >= 0 ? '#22c55e' : '#ef4444', fontSize: 12 }}>
                      {ch >= 0 ? '+' : ''}
                      {ch.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: row.journal ? '#818cf8' : '#334155' }} title="Journal entries for ticker">
                  {row.journal ? `${row.journal.count}✦` : '—'}
                </div>
                <div
                  style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={rowSnippet(row)}
                >
                  {row.journal?.snippet ? (
                    <>
                      <span style={{ color: '#64748b' }}>Journal: </span>
                      {row.journal.snippet}
                    </>
                  ) : (
                    rowSnippet(row)
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTerminal?.(row.ticker, { exchange: row.exchange, currency: row.currency })
                    }
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#6366f1',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Terminal
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenScorecard?.(row.ticker, row.eval?.sectorId || row.sectorId || 'tech')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #1a2035',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Score
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>No names match these filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
