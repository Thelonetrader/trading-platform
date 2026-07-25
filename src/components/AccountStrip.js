import React from 'react';
import { formatAccountMoney, parseAccountMetrics } from '../utils/accountSummary';

export default function AccountStrip({ connection, accountSummary, onRefresh, refreshing }) {
  const connected = connection?.status === 'connected';
  const metrics = parseAccountMetrics(accountSummary);
  const mode = connection?.mode || 'paper';

  if (!connected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          color: '#475569',
        }}
      >
        <span>Account — connect IB in Settings</span>
      </div>
    );
  }

  const items = [
    { label: 'NLV', value: formatAccountMoney(metrics.netLiquidation) },
    { label: 'Cash', value: formatAccountMoney(metrics.totalCash) },
    { label: 'Buying power', value: formatAccountMoney(metrics.buyingPower) },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: mode === 'live' ? '#ef4444' : '#6366f1',
          padding: '2px 8px',
          borderRadius: 4,
          background: mode === 'live' ? '#450a0a' : '#312e81',
        }}
      >
        {mode}
      </span>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>{item.label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{item.value}</span>
        </div>
      ))}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #1a2035',
            background: 'transparent',
            color: '#64748b',
            cursor: refreshing ? 'default' : 'pointer',
          }}
        >
          {refreshing ? '…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
