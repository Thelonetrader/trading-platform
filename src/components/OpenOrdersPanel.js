import React from 'react';

const ACTIVE_STATUSES = new Set(['Submitted', 'PreSubmitted', 'PendingSubmit', 'ApiPending']);

export default function OpenOrdersPanel({
  connection,
  openOrders,
  onRefresh,
  onCancel,
  refreshing,
  busyOrderId,
}) {
  const connected = connection?.status === 'connected';

  const visible = (openOrders || []).filter(
    (o) => o.status && (ACTIVE_STATUSES.has(o.status) || !['Filled', 'Cancelled', 'Inactive'].includes(o.status)),
  );

  return (
    <div
      style={{
        marginTop: 16,
        background: 'var(--tp-bg-panel)',
        border: '1px solid var(--tp-border)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--tp-text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Open orders
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tp-text-title)' }}>
            {connected ? `${visible.length} active` : 'Not connected'}
          </div>
        </div>
        {connected && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--tp-border)',
              background: 'transparent',
              color: 'var(--tp-text-secondary)',
              fontSize: 12,
              cursor: refreshing ? 'default' : 'pointer',
            }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {!connected ? (
        <div style={{ fontSize: 13, color: 'var(--tp-text-faint)' }}>Connect to IB Gateway to view and cancel orders.</div>
      ) : visible.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--tp-text-faint)' }}>No open orders.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((order) => {
            const isBuy = order.action === 'BUY';
            return (
              <div
                key={order.orderId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(72px, auto) 1fr auto auto auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--tp-bg-input)',
                  border: '1px solid var(--tp-border)',
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--tp-text-strong)' }}>{order.symbol}</span>
                <span style={{ color: isBuy ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{order.action}</span>
                <span style={{ color: 'var(--tp-text-secondary)' }}>
                  {order.totalQuantity} · {order.orderType}
                  {order.lmtPrice ? ` @ ${order.lmtPrice}` : ''}
                </span>
                <span style={{ fontSize: 12, color: 'var(--tp-text-muted)' }}>{order.status}</span>
                <button
                  type="button"
                  disabled={busyOrderId === order.orderId}
                  onClick={() => onCancel?.(order.orderId)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#334155',
                    color: 'var(--tp-text-title)',
                    fontSize: 11,
                    cursor: busyOrderId === order.orderId ? 'default' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
