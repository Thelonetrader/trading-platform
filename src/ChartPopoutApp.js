import React, { useMemo } from 'react';
import TerminalChart from './components/TerminalChart';
import { useTradingApi } from './hooks/useTradingApi';

function readChartQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    symbol: (params.get('symbol') || '').toUpperCase(),
    exchange: params.get('exchange') || 'SMART',
    currency: params.get('currency') || 'USD',
    primaryExch: params.get('primaryExch') || '',
    duration: params.get('duration') || '1 Y',
    barSize: params.get('barSize') || '1 day',
  };
}

export function isChartPopoutWindow() {
  return new URLSearchParams(window.location.search).get('chart') === '1';
}

export default function ChartPopoutApp() {
  const q = useMemo(() => readChartQuery(), []);
  const { connection, fetchHistoricalBars } = useTradingApi();

  if (!q.symbol) {
    return (
      <div style={{ padding: 24, color: '#94a3b8', background: '#060b16', minHeight: '100vh' }}>
        No symbol in chart window URL.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060b16',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>{q.symbol}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {q.exchange} · {q.currency}
          {q.primaryExch ? ` · ${q.primaryExch}` : ''} · IB {connection.status}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <TerminalChart
          symbol={q.symbol}
          exchange={q.exchange}
          currency={q.currency}
          primaryExch={q.primaryExch || undefined}
          connection={connection}
          fetchHistoricalBars={fetchHistoricalBars}
          initialDuration={q.duration}
          initialBarSize={q.barSize}
          expanded
        />
      </div>
    </div>
  );
}
