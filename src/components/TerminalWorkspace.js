import React from 'react';
import OrderTicket from './OrderTicket';
import OpenOrdersPanel from './OpenOrdersPanel';

export default function TerminalWorkspace({
  symbol,
  exchange,
  currency,
  quote,
  connection,
  settings,
  orderPreset,
  openOrders,
  onRefreshOrders,
  onCancelOrder,
  ordersRefreshing,
  cancelBusyId,
  onOrderPlaced,
}) {
  return (
    <div>
    <div style={{ display: 'flex', gap: 16, minHeight: 420 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            background: '#0a0f1e',
            border: '1px solid #1a2035',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Active symbol
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc' }}>{symbol || '—'}</span>
            {quote?.last != null && (
              <span style={{ fontSize: 20, color: '#e2e8f0' }}>{Number(quote.last).toFixed(2)}</span>
            )}
            {quote?.changePct != null && (
              <span style={{ color: quote.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
                {quote.changePct >= 0 ? '+' : ''}
                {quote.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
            {exchange || 'SMART'} · {currency || 'USD'}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 280,
            background: '#0a0f1e',
            border: '1px dashed #1a2035',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334155',
            fontSize: 14,
          }}
        >
          Chart panel — connect IB and add historical bars in a later build
        </div>
      </div>

      <OrderTicket
        symbol={symbol}
        exchange={exchange}
        currency={currency}
        connection={connection}
        settings={settings}
        preset={orderPreset}
        onPlaced={onOrderPlaced}
      />
    </div>
    <OpenOrdersPanel
      connection={connection}
      openOrders={openOrders}
      onRefresh={onRefreshOrders}
      onCancel={onCancelOrder}
      refreshing={ordersRefreshing}
      busyOrderId={cancelBusyId}
    />
    </div>
  );
}
