import React, { useMemo, useState } from 'react';
import { readJson } from './utils/storageStats';
import { SECTORS, getRatingColor } from './scorecards/model';
import { getBestEvalForTicker, listScorecardEvals } from './scorecards/storage';

const PRIORITIES = ['High', 'Medium', 'Low'];
const RATING_FILTERS = [
  { id: 'any', label: 'Any rating', minAvg: 0 },
  { id: 'hold+', label: 'Hold+ (≥2.5)', minAvg: 2.5 },
  { id: 'buy+', label: 'Buy+ (≥3.5)', minAvg: 3.5 },
  { id: 'sb', label: 'Strong Buy (≥4.5)', minAvg: 4.5 },
];

const SORT_OPTIONS = [
  { id: 'priority', label: 'Priority' },
  { id: 'score', label: 'Fundamental score' },
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

function buildRows(watchlist) {
  return watchlist.map((item) => {
    const ticker = (item.ticker || '').toUpperCase();
    const evalRow = getBestEvalForTicker(ticker);
    return {
      id: item.id,
      ticker,
      name: item.name || '',
      sectorLabel: item.sector || '',
      sectorId: evalRow?.sectorId || sectorFromWatchlistLabel(item.sector),
      priority: item.priority || 'Medium',
      notes: item.notes || '',
      buyPrice: item.buyPrice,
      addedDate: item.addedDate,
      exchange: item.exchange || 'SMART',
      currency: item.currency || 'USD',
      eval: evalRow,
    };
  });
}

export default function Screener({ quotes = {}, connection, onOpenTerminal, onOpenScorecard }) {
  const [priorityFilter, setPriorityFilter] = useState({ High: true, Medium: true, Low: true });
  const [sectorQuery, setSectorQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('hold+');
  const [requireScorecard, setRequireScorecard] = useState(false);
  const [minChange, setMinChange] = useState('');
  const [maxChange, setMaxChange] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [search, setSearch] = useState('');

  const evalCount = listScorecardEvals().length;

  const rows = useMemo(() => {
    const built = buildRows(readJson('watchlist', []));
    const q = search.trim().toUpperCase();
    const sectorQ = sectorQuery.trim().toLowerCase();
    const minCh = minChange === '' ? null : parseFloat(minChange);
    const maxCh = maxChange === '' ? null : parseFloat(maxChange);
    const minAvg = RATING_FILTERS.find((r) => r.id === ratingFilter)?.minAvg ?? 0;

    let filtered = built.filter((row) => {
      if (!priorityFilter[row.priority]) return false;
      if (q && !row.ticker.includes(q) && !row.name.toUpperCase().includes(q)) return false;
      if (sectorQ && !row.sectorLabel.toLowerCase().includes(sectorQ)) return false;
      if (requireScorecard && !row.eval) return false;
      if (row.eval && row.eval.avg < minAvg) return false;
      if (!row.eval && minAvg > 0) return false;

      const quote = quotes[row.ticker];
      const ch = quote?.changePct;
      if (minCh != null && (ch == null || ch < minCh)) return false;
      if (maxCh != null && (ch == null || ch > maxCh)) return false;
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'added') return (b.addedDate || '').localeCompare(a.addedDate || '');
      if (sortBy === 'score') {
        const sa = a.eval?.avg ?? -1;
        const sb = b.eval?.avg ?? -1;
        return sb - sa;
      }
      if (sortBy === 'change') {
        const ca = quotes[a.ticker]?.changePct ?? -Infinity;
        const cb = quotes[b.ticker]?.changePct ?? -Infinity;
        return cb - ca;
      }
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return a.ticker.localeCompare(b.ticker);
    });

    return filtered;
  }, [
    priorityFilter,
    sectorQuery,
    ratingFilter,
    requireScorecard,
    minChange,
    maxChange,
    sortBy,
    search,
    quotes,
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
            Filter your watchlist by priority, saved scorecard ratings, and live day change when IB is connected.
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'right' }}>
          <div>{readJson('watchlist', []).length} watchlist · {evalCount} saved evals</div>
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

      {readJson('watchlist', []).length === 0 ? (
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
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(100px, auto) minmax(80px, auto) minmax(100px, auto) 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>{row.ticker}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{row.name || row.sectorLabel || '—'}</div>
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
                <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.notes || '—'}
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
