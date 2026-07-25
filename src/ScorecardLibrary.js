import React, { useEffect, useMemo, useState } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';
import { SECTORS, getRatingColor } from './scorecards/model';
import { deleteScorecardEval, listScorecardEvals } from './scorecards/storage';

const SORT_OPTIONS = [
  { id: 'updated', label: 'Recently updated' },
  { id: 'score', label: 'Highest score' },
  { id: 'ticker', label: 'Ticker A–Z' },
];

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function ScorecardLibrary({ onOpenScorecard, onOpenTerminal, onOpenAnalyzer }) {
  const [rows, setRows] = useState(() => listScorecardEvals());
  const [sectorFilter, setSectorFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [msg, setMsg] = useState('');

  const reload = () => setRows(listScorecardEvals());

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const onImport = () => reload();
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
    return () => window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, onImport);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    let list = rows.filter((e) => {
      if (sectorFilter !== 'all' && e.sectorId !== sectorFilter) return false;
      if (q && !e.ticker.includes(q) && !(e.displayName || '').toUpperCase().includes(q)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'score') return b.avg - a.avg;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

    return list;
  }, [rows, sectorFilter, search, sortBy]);

  const handleDelete = (entry) => {
    const ok = window.confirm(`Delete scorecard for ${entry.ticker} (${SECTORS[entry.sectorId]?.label || entry.sectorId})?`);
    if (!ok) return;
    deleteScorecardEval(entry.id);
    reload();
    window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT));
    setMsg(`Removed ${entry.ticker}`);
    setTimeout(() => setMsg(''), 2500);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
            Saved research
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Scorecard Library
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 520 }}>
            Every evaluation saved from Scorecards. Edit metrics, open Terminal, or remove stale entries.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: '#22c55e' }}>{msg}</span>}
          {onOpenAnalyzer && (
            <button
              type="button"
              onClick={onOpenAnalyzer}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #6366f1',
                background: '#6366f115',
                color: '#818cf8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New scorecard
            </button>
          )}
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
          <input style={inputStyle} placeholder="Ticker or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Sector</label>
          <select style={inputStyle} value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
            <option value="all">All sectors</option>
            {Object.values(SECTORS).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort</label>
          <select style={inputStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {filtered.length} saved evaluation{filtered.length === 1 ? '' : 's'}
      </div>

      {filtered.length === 0 ? (
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
          {rows.length === 0
            ? 'No saved scorecards yet. Use Scorecards → Save to library after scoring a name.'
            : 'No matches for these filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((entry) => {
            const sector = SECTORS[entry.sectorId];
            const accent = sector?.accent || '#6366f1';
            const color = getRatingColor(entry.avg, accent);
            return (
              <div
                key={entry.id}
                style={{
                  background: '#0a0f1e',
                  border: '1px solid #1a2035',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(100px, auto) 1fr minmax(120px, auto) minmax(100px, auto) auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>{entry.ticker}</div>
                  {entry.displayName && entry.displayName !== entry.ticker && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>{entry.displayName}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>{sector?.label || entry.sectorId}</div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{entry.ratingShort}</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{entry.avg.toFixed(2)} / 5</span>
                  <div style={{ fontSize: 11, color: '#475569' }}>{entry.ratingLabel}</div>
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>{formatDate(entry.updatedAt)}</div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  {onOpenScorecard && (
                    <button
                      type="button"
                      onClick={() => onOpenScorecard(entry.ticker, entry.sectorId)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: accent,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {onOpenTerminal && (
                    <button
                      type="button"
                      onClick={() => onOpenTerminal(entry.ticker)}
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
                      Terminal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
