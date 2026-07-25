import React from 'react';
import { displayChangePct, displayPrice, normalizeTicker } from '../utils/quoteDisplay';

function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toFixed(2);
}

function fmtChg(pct) {
  if (pct == null || Number.isNaN(pct)) return '';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export default function QuoteStrip({ symbols, activeSymbol, quotes, connection, isElectron = true }) {
  const stripSymbols = symbols.length
    ? symbols.slice(0, 8).map((s) => normalizeTicker(typeof s === 'string' ? s : s.ticker))
    : ['—'];

  const connColor =
    connection.status === 'connected' ? '#22c55e' : connection.status === 'connecting' ? '#f59e0b' : '#64748b';

  const waitingTicks =
    connection.status === 'connected' &&
    stripSymbols[0] !== '—' &&
    stripSymbols.every((sym) => !displayPrice(quotes[sym]));

  return (
    <div
      style={{
        height: 40,
        background: '#060b16',
        borderBottom: '1px solid #1a2035',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        overflowX: 'auto',
        flexShrink: 0,
        fontSize: 12,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          padding: '2px 8px',
          borderRadius: 4,
          background: '#1a2035',
          color: connColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: 10,
          letterSpacing: '0.08em',
        }}
      >
        IB {connection.mode || 'paper'} · {connection.status}
      </span>
      {!isElectron && (
        <span style={{ flexShrink: 0, color: '#f59e0b', fontSize: 11 }}>
          Run npm run electron:dev for live prices
        </span>
      )}
      {isElectron && connection.status !== 'connected' && (
        <span style={{ flexShrink: 0, color: '#64748b', fontSize: 11 }}>
          Settings → Connect IB (TWS: port 7497 paper)
        </span>
      )}
      {waitingTicks && (
        <span style={{ flexShrink: 0, color: '#64748b', fontSize: 11 }} title={connection.error || ''}>
          Waiting for market data… (delayed/paper subscriptions)
        </span>
      )}
      {stripSymbols.map((sym) => {
        const q = quotes[sym];
        const chg = displayChangePct(q);
        const px = displayPrice(q);
        const up = chg != null && chg >= 0;
        const active = sym === activeSymbol;
        return (
          <div
            key={sym}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 6,
              border: active ? '1px solid #6366f1' : '1px solid transparent',
              background: active ? '#1a2035' : 'transparent',
            }}
          >
            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{sym}</span>
            <span style={{ color: '#94a3b8' }}>{fmtPrice(px)}</span>
            <span style={{ color: up ? '#22c55e' : '#ef4444', minWidth: 48 }}>{fmtChg(chg)}</span>
          </div>
        );
      })}
    </div>
  );
}
