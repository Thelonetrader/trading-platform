import React, { useState } from 'react';

export default function OrderTicket({
  symbol,
  exchange,
  currency,
  connection,
  settings,
  preset,
  onPlaced,
}) {
  const [side, setSide] = useState(preset?.side || 'BUY');
  const [qty, setQty] = useState(preset?.qty ? String(preset.qty) : '');
  const [orderType, setOrderType] = useState('MKT');
  const [limitPrice, setLimitPrice] = useState('');
  const [tif, setTif] = useState('DAY');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const mode = settings?.ib?.mode || 'paper';
  const connected = connection.status === 'connected';
  const canTrade = connected && symbol;

  const submit = async () => {
    if (!canTrade || !qty) return;
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await window.trading.placeOrder({
        symbol,
        exchange: exchange || 'SMART',
        currency: currency || 'USD',
        side,
        quantity: Number(qty),
        orderType,
        limitPrice: orderType === 'LMT' ? Number(limitPrice) : undefined,
        tif,
      });
      setConfirm(false);
      setQty('');
      if (onPlaced) onPlaced();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const badgeColor = mode === 'live' ? '#ef4444' : '#6366f1';

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Order ticket</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '3px 8px',
            borderRadius: 4,
            background: badgeColor,
            color: '#fff',
          }}
        >
          {mode.toUpperCase()}
        </span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>{symbol || '—'}</div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['BUY', 'SELL'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              background: side === s ? (s === 'BUY' ? '#166534' : '#991b1b') : '#1a2035',
              color: side === s ? '#fff' : '#64748b',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 11, color: '#64748b' }}>
        Quantity
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
          style={fieldStyle}
        />
      </label>

      <label style={{ fontSize: 11, color: '#64748b' }}>
        Type
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={fieldStyle}>
          <option value="MKT">Market</option>
          <option value="LMT">Limit</option>
        </select>
      </label>

      {orderType === 'LMT' && (
        <label style={{ fontSize: 11, color: '#64748b' }}>
          Limit price
          <input
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            style={fieldStyle}
          />
        </label>
      )}

      <label style={{ fontSize: 11, color: '#64748b' }}>
        TIF
        <select value={tif} onChange={(e) => setTif(e.target.value)} style={fieldStyle}>
          <option value="DAY">Day</option>
          <option value="GTC">GTC</option>
        </select>
      </label>

      {!connected && (
        <div style={{ fontSize: 12, color: '#f59e0b' }}>Connect IB Gateway in Settings to trade.</div>
      )}

      {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

      <button
        type="button"
        disabled={!canTrade || busy || !qty}
        onClick={submit}
        style={{
          padding: '10px 0',
          border: 'none',
          borderRadius: 8,
          background: confirm ? '#dc2626' : '#6366f1',
          color: '#fff',
          fontWeight: 700,
          cursor: canTrade && qty ? 'pointer' : 'not-allowed',
          opacity: canTrade && qty ? 1 : 0.5,
        }}
      >
        {busy ? 'Sending…' : confirm ? 'Confirm order' : 'Review order'}
      </button>
      {confirm && (
        <button
          type="button"
          onClick={() => setConfirm(false)}
          style={{
            padding: '6px 0',
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Cancel confirm
        </button>
      )}
    </div>
  );
}

const fieldStyle = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  background: '#060b16',
  border: '1px solid #1a2035',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '8px 10px',
  boxSizing: 'border-box',
};
