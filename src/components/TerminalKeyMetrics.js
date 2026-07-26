import React, { useEffect, useState } from 'react';

function formatMktCap(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtRatio(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(digits)}×`;
}

function fmtPct(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(digits)}%`;
}

const METRIC_DEFS = [
  { key: 'mktCap', label: 'Mkt cap', fromProfile: true },
  { id: 'forwardPE', label: 'P/E TTM', format: (v) => fmtRatio(v) },
  { id: 'pegRatio', label: 'PEG', format: (v) => fmtRatio(v, 2) },
  { id: 'psRatio', label: 'P/S', format: (v) => fmtRatio(v) },
  { id: 'epsGrowth', label: 'EPS gr', format: (v) => fmtPct(v) },
  { id: 'revenueGrowth', label: 'Rev gr', format: (v) => fmtPct(v) },
  { id: 'fcfYield', label: 'FCF yield', format: (v) => fmtPct(v) },
  { id: 'roic', label: 'ROIC', format: (v) => fmtPct(v) },
];

function MetricCell({ label, value }) {
  return (
    <div style={{ minWidth: 72 }}>
      <div style={{ fontSize: 10, color: 'var(--tp-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: value ? '#e2e8f0' : '#334155', marginTop: 2 }}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function TerminalKeyMetrics({ symbol, exchange, currency, fetchFundamentals, hasFmpKey, connection }) {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!symbol || !fetchFundamentals) {
      setState({ loading: false, data: null, error: null });
      return;
    }

    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetchFundamentals({ ticker: symbol, exchange: exchange || 'SMART', currency: currency || 'USD' })
      .then((res) => {
        if (cancelled) return;
        setState({
          loading: false,
          data: res,
          error: res.fieldCount ? null : res.error || 'No fundamentals',
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ loading: false, data: null, error: e.message || 'Load failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, exchange, currency, fetchFundamentals]);

  if (!symbol) return null;

  const { loading, data, error } = state;
  const metrics = data?.metrics || {};
  const profile = data?.profile;
  const sources = (data?.sources || []).map((s) => s.toUpperCase()).join(' · ') || null;

  const cells = METRIC_DEFS.map((def) => {
    if (def.fromProfile) {
      return { label: def.label, value: formatMktCap(profile?.mktCap) };
    }
    const raw = metrics[def.id];
    return { label: def.label, value: raw != null && def.format ? def.format(raw) : null };
  }).filter((c) => c.value != null);

  const showHint =
    !loading && cells.length === 0 && !hasFmpKey && connection?.status !== 'connected';

  return (
    <div
      style={{
        background: 'var(--tp-bg-input)',
        border: '1px solid var(--tp-border)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Key metrics
        </div>
        {loading && <span style={{ fontSize: 11, color: 'var(--tp-text-muted)' }}>Loading…</span>}
        {!loading && sources && (
          <span style={{ fontSize: 10, color: 'var(--tp-text-faint)' }}>{sources}</span>
        )}
      </div>

      {cells.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 20px' }}>
          {cells.map((c) => (
            <MetricCell key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tp-text-muted)', lineHeight: 1.5 }}>
          {loading
            ? 'Fetching ratios…'
            : showHint
              ? 'Add an FMP key in Settings or connect IB to auto-fill ratios.'
              : error || 'No ratio fields for this symbol.'}
        </p>
      )}
    </div>
  );
}
