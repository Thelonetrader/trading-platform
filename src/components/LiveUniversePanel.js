import React from 'react';
import OptionCombo from './OptionCombo';
import {
  DEFAULT_LIVE_UNIVERSE,
  LIVE_UNIVERSE_COUNTRY_OPTIONS,
  LIVE_UNIVERSE_EXCHANGE_OPTIONS,
  LIVE_UNIVERSE_LIMIT_OPTIONS,
  liveUniverseSummary,
  normalizeLiveUniverse,
} from '../utils/liveUniverse';

export default function LiveUniversePanel({
  liveUniverse,
  onChange,
  onRefresh,
  loading = false,
  symbolCount = 0,
  updatedAt = null,
  error = '',
  hasFmpKey = false,
  inputStyle,
  labelStyle,
}) {
  const cfg = normalizeLiveUniverse(liveUniverse);

  const patch = (partial) => onChange(normalizeLiveUniverse({ ...cfg, ...partial }));

  const num = (key, label, placeholder) => (
    <div key={key}>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type="number"
        placeholder={placeholder || '—'}
        value={cfg[key] ?? ''}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </div>
  );

  const age =
    updatedAt != null
      ? `${Math.max(0, Math.round((Date.now() - updatedAt) / 60000))}m ago`
      : null;

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14,
        padding: 14,
        borderRadius: 10,
        border: '1px solid #6366f144',
        background: '#6366f10a',
      }}
    >
      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--tp-text-secondary)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--tp-accent-on-soft)' }}>Live market universe</strong> — pulls current listings from FMP{' '}
        <code style={{ color: 'var(--tp-accent)' }}>company-screener</code> (not your saved watchlist). IB scan uses these
        symbols for history + live quotes when connected.
      </div>

      {!hasFmpKey && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#fbbf24' }}>
          Add an FMP API key in Settings → Market data to load a live universe.
        </div>
      )}

      <OptionCombo
        label="Country"
        labelStyle={labelStyle}
        inputStyle={inputStyle}
        value={cfg.country}
        onChange={(id) => patch({ country: id })}
        options={LIVE_UNIVERSE_COUNTRY_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        disabled={!hasFmpKey}
      />
      <OptionCombo
        label="Exchange"
        labelStyle={labelStyle}
        inputStyle={inputStyle}
        value={cfg.exchange}
        onChange={(id) => patch({ exchange: id })}
        options={LIVE_UNIVERSE_EXCHANGE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        disabled={!hasFmpKey}
      />
      <OptionCombo
        label="Max symbols"
        labelStyle={labelStyle}
        inputStyle={inputStyle}
        value={cfg.limit}
        onChange={(id) => patch({ limit: id })}
        options={LIVE_UNIVERSE_LIMIT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
        disabled={!hasFmpKey}
      />
      {num('marketCapMinM', 'Min market cap ($M)', '300')}
      {num('volumeMin', 'Min volume (shares)', '100000')}
      {num('priceMin', 'Min price ($)', '1')}
      {num('priceMax', 'Max price ($)', '—')}
      <div>
        <label style={labelStyle}>Sector contains</label>
        <input
          style={inputStyle}
          placeholder="e.g. Technology"
          value={cfg.sector}
          onChange={(e) => patch({ sector: e.target.value })}
          disabled={!hasFmpKey}
        />
      </div>
      <div>
        <label style={labelStyle}>Industry contains</label>
        <input
          style={inputStyle}
          placeholder="Optional"
          value={cfg.industry}
          onChange={(e) => patch({ industry: e.target.value })}
          disabled={!hasFmpKey}
        />
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tp-text-secondary)' }}>
          <input
            type="checkbox"
            checked={cfg.activelyTrading}
            onChange={() => patch({ activelyTrading: !cfg.activelyTrading })}
            disabled={!hasFmpKey}
          />
          Actively trading only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tp-text-secondary)' }}>
          <input
            type="checkbox"
            checked={cfg.excludeEtf}
            onChange={() => patch({ excludeEtf: !cfg.excludeEtf })}
            disabled={!hasFmpKey}
          />
          Exclude ETFs
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!hasFmpKey || loading}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: loading ? '#334155' : '#6366f1',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh live universe'}
        </button>
      </div>

      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: error ? '#f87171' : '#64748b', lineHeight: 1.45 }}>
        {error ||
          `${liveUniverseSummary(cfg)} · ${symbolCount} symbol${symbolCount === 1 ? '' : 's'}${
            age ? ` · updated ${age}` : ''
          }`}
      </div>
    </div>
  );
}

export { DEFAULT_LIVE_UNIVERSE, normalizeLiveUniverse };
